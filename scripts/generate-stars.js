#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/CURRENT/hygdata_v41.csv';
const RADIUS = 40000;
const MAG_LIMIT = 6.5;
const DEFAULT_BV = 0.65; // Solar-type fallback

// --- B-V color index → RGB via Ballesteros formula + Tanner Helland ---

function bvToTemperature(bv) {
  // Ballesteros 2012 formula
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

function temperatureToRGB(kelvin) {
  // Tanner Helland algorithm
  const temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  }
  g = Math.max(0, Math.min(255, g));

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }

  // Return linear RGB (0–1)
  return [
    Math.pow(r / 255, 2.2),
    Math.pow(g / 255, 2.2),
    Math.pow(b / 255, 2.2),
  ];
}

function magnitudeToBrightness(mag) {
  // Logarithmic brightness: mag 0 → bright, mag 6.5 → dim
  // Using power curve with exponent 2.5
  const normalized = 1 - mag / MAG_LIMIT; // 1 at mag 0, 0 at mag 6.5
  return Math.pow(Math.max(0, normalized), 2.5);
}

function magnitudeToSize(mag) {
  // Map magnitude to point size: bright stars → 5px, dim → 0.5px
  const normalized = 1 - mag / MAG_LIMIT;
  return 0.5 + 4.5 * Math.pow(Math.max(0, normalized), 2.5);
}

// --- Main ---

async function main() {
  console.log('Fetching HYG v3 catalog...');
  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const csv = await response.text();
  console.log(`Downloaded ${(csv.length / 1024 / 1024).toFixed(1)} MB`);

  const lines = csv.split('\n');
  const header = lines[0].split(',').map(h => h.replace(/"/g, ''));

  // Find column indices
  const colIndex = {};
  for (const col of ['ra', 'dec', 'mag', 'ci', 'proper', 'bf', 'dist']) {
    colIndex[col] = header.indexOf(col);
    if (colIndex[col] === -1) throw new Error(`Column "${col}" not found in: ${header.slice(0, 10).join(', ')}`);
  }

  const stars = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split(',').map(c => c.replace(/"/g, ''));
    const mag = parseFloat(cols[colIndex.mag]);
    if (isNaN(mag) || mag > MAG_LIMIT || mag < -2) continue; // mag < -2 excludes Sol

    const raHours = parseFloat(cols[colIndex.ra]);
    const decDeg = parseFloat(cols[colIndex.dec]);
    if (isNaN(raHours) || isNaN(decDeg)) continue;

    let bv = parseFloat(cols[colIndex.ci]);
    if (isNaN(bv)) bv = DEFAULT_BV;

    const proper = cols[colIndex.proper].trim();
    const bf = cols[colIndex.bf].trim();
    const dist = parseFloat(cols[colIndex.dist]); // parsecs

    stars.push({ raHours, decDeg, mag, bv, proper, bf, dist });
  }

  console.log(`Filtered to ${stars.length} stars (magnitude ≤ ${MAG_LIMIT})`);

  // Allocate typed arrays
  const count = stars.length;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const { raHours, decDeg, mag, bv } = stars[i];

    // RA/Dec → radians
    const ra = raHours * (Math.PI / 12); // hours → radians
    const dec = decDeg * (Math.PI / 180); // degrees → radians

    // Equatorial → Cartesian (right-handed, Y-up)
    const cosDec = Math.cos(dec);
    positions[i * 3] = RADIUS * cosDec * Math.cos(ra);
    positions[i * 3 + 1] = RADIUS * Math.sin(dec);
    positions[i * 3 + 2] = -RADIUS * cosDec * Math.sin(ra);

    // Size from magnitude
    sizes[i] = magnitudeToSize(mag);

    // Color from B-V
    const temp = bvToTemperature(bv);
    const [r, g, b] = temperatureToRGB(temp);

    // Scale by brightness, clamped to 1.0 to avoid triggering bloom/god rays
    const brightness = magnitudeToBrightness(mag);
    const scale = 0.3 + brightness * 0.7;
    colors[i * 3] = Math.min(r * scale, 1);
    colors[i * 3 + 1] = Math.min(g * scale, 1);
    colors[i * 3 + 2] = Math.min(b * scale, 1);
  }

  // Build named stars list: brightest stars with proper names or Bayer designations
  const PC_TO_LY = 3.26156;
  const namedStars = [];
  for (let i = 0; i < count; i++) {
    const s = stars[i];
    const name = s.proper || s.bf;
    if (!name) continue;
    const distLy = isNaN(s.dist) || s.dist <= 0 ? null : +(s.dist * PC_TO_LY).toFixed(1);
    namedStars.push({ index: i, name, mag: s.mag, distLy });
  }
  // Sort by magnitude (brightest first), take top 500
  namedStars.sort((a, b) => a.mag - b.mag);
  const topNamed = namedStars.slice(0, 500);
  console.log(`Named stars (top 500): ${topNamed.length} (brightest: ${topNamed[0]?.name})`);

  // Format Float32Array as compact JS source
  function formatArray(arr) {
    const parts = [];
    for (let i = 0; i < arr.length; i++) {
      parts.push(Number(arr[i].toFixed(4)));
    }
    return `new Float32Array([${parts.join(',')}])`;
  }

  function formatNamedStars(arr) {
    const entries = arr.map(s => {
      const dist = s.distLy === null ? 'null' : s.distLy;
      return `{i:${s.index},n:${JSON.stringify(s.name)},d:${dist}}`;
    });
    return `[\n${entries.join(',\n')}\n]`;
  }

  const output = `// AUTO-GENERATED by scripts/generate-stars.js — do not edit
// Source: HYG Database v3 (https://github.com/astronexus/HYG-Database)
// Stars with apparent magnitude ≤ ${MAG_LIMIT}

export const STAR_COUNT = ${count};
export const positions = ${formatArray(positions)};
export const sizes = ${formatArray(sizes)};
export const colors = ${formatArray(colors)};

// Top ${topNamed.length} brightest named stars: i=index into arrays, n=name, d=distance in light-years
export const namedStars = ${formatNamedStars(topNamed)};
`;

  const outPath = join(__dirname, '..', 'src', 'data', 'stars.js');
  writeFileSync(outPath, output);
  const sizeKB = (Buffer.byteLength(output) / 1024).toFixed(0);
  console.log(`Wrote ${outPath} (${sizeKB} KB, ${count} stars)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
