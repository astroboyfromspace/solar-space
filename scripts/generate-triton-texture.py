#!/usr/bin/env python3
"""
Generate an equirectangular Triton texture from the Voyager 2 disc photograph.

The Voyager 2 Global Color Mosaic is an orthographic projection (disc photo).
This script unwraps the visible hemisphere into equirectangular space and fills
the unseen back hemisphere with procedural noise matching Triton's cantaloupe
terrain appearance.

Output: public/textures/triton.jpg (2048x1024)
Requires: Python 3, numpy, Pillow
"""

import math
import subprocess
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

# ─── Configuration ───────────────────────────────────────────────────────────

OUT_W, OUT_H = 2048, 1024
SOURCE_URL = (
    "https://upload.wikimedia.org/wikipedia/commons/"
    "2/26/Global_Color_Mosaic_of_Triton_-_GPN-2000-000471.jpg"
)
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = SCRIPT_DIR.parent / "public" / "textures" / "triton.jpg"
CACHE_PATH = SCRIPT_DIR / ".triton_source.jpg"


# ─── Value noise (vectorized, no external deps) ─────────────────────────────

def _hash2d(ix, iy, seed=0):
    """Vectorized integer hash → float in [0, 1]."""
    ix, iy = np.int64(ix), np.int64(iy)
    s = np.int64(seed)
    h = s * np.int64(374761393) + ix * np.int64(668265263)
    h = (h ^ (h >> 13)) * np.int64(1274126177)
    h = h ^ (h >> 16)
    h = h * np.int64(374761393) + iy * np.int64(668265263)
    h = (h ^ (h >> 13)) * np.int64(1274126177)
    h = h ^ (h >> 16)
    return (h & np.int64(0x7FFFFFFF)).astype(np.float64) / 0x7FFFFFFF


def vnoise(x, y, seed=0):
    """2D value noise, vectorized. Returns array in [0, 1]."""
    x, y = np.asarray(x, np.float64), np.asarray(y, np.float64)
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - ix, y - iy
    sx = fx * fx * (3 - 2 * fx)
    sy = fy * fy * (3 - 2 * fy)
    return (
        (_hash2d(ix, iy, seed) * (1 - sx) + _hash2d(ix + 1, iy, seed) * sx) * (1 - sy)
        + (_hash2d(ix, iy + 1, seed) * (1 - sx) + _hash2d(ix + 1, iy + 1, seed) * sx) * sy
    )


def fbm(x, y, octaves=6, persistence=0.5, lacunarity=2.0, seed=0):
    """Fractal Brownian Motion using layered value noise."""
    total = np.zeros_like(x, dtype=np.float64)
    amp, freq, mx = 1.0, 1.0, 0.0
    for i in range(octaves):
        total += vnoise(x * freq, y * freq, seed + i * 1337) * amp
        mx += amp
        amp *= persistence
        freq *= lacunarity
    return total / mx


# ─── Image utilities ────────────────────────────────────────────────────────

def detect_disc(img):
    """Find center and radius of the bright disc against black background."""
    gray = np.mean(img, axis=2)
    mask = gray > 20
    rows, cols = np.where(mask)
    rmin, rmax = rows.min(), rows.max()
    cmin, cmax = cols.min(), cols.max()
    cy = (rmin + rmax) / 2.0
    cx = (cmin + cmax) / 2.0
    radius = min(rmax - rmin, cmax - cmin) / 2.0 * 0.97
    print(f"  Disc: center=({cx:.0f}, {cy:.0f}), radius={radius:.0f}")
    return cx, cy, radius


def sample_bilinear(img, x, y):
    """Vectorized bilinear interpolation sampling."""
    h, w = img.shape[:2]
    x0 = np.clip(np.floor(x).astype(int), 0, w - 1)
    y0 = np.clip(np.floor(y).astype(int), 0, h - 1)
    x1 = np.clip(x0 + 1, 0, w - 1)
    y1 = np.clip(y0 + 1, 0, h - 1)
    fx = np.clip(x - np.floor(x), 0, 1)[..., np.newaxis]
    fy = np.clip(y - np.floor(y), 0, 1)[..., np.newaxis]
    return (
        (img[y0, x0] * (1 - fx) + img[y0, x1] * fx) * (1 - fy)
        + (img[y1, x0] * (1 - fx) + img[y1, x1] * fx) * fy
    )


# ─── Main pipeline ──────────────────────────────────────────────────────────

def main():
    print("Triton equirectangular texture generator")
    print("=" * 45)

    # 1. Download source
    if CACHE_PATH.exists():
        print(f"Using cached source: {CACHE_PATH}")
    else:
        print("Downloading Voyager 2 Triton mosaic...")
        try:
            req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as resp, open(CACHE_PATH, "wb") as f:
                f.write(resp.read())
        except urllib.error.URLError:
            # Fallback to curl (handles macOS SSL cert issues)
            subprocess.run(
                ["curl", "-fSL", "--max-time", "60", "-o", str(CACHE_PATH), SOURCE_URL],
                check=True,
            )
        print(f"  Saved to {CACHE_PATH}")

    # 2. Load source image
    src = np.array(Image.open(str(CACHE_PATH)).convert("RGB"), dtype=np.float64)
    print(f"  Source: {src.shape[1]}x{src.shape[0]}")

    # 3. Detect disc
    print("Detecting disc...")
    cx, cy, radius = detect_disc(src)

    # 4. Build coordinate grids
    print(f"Building {OUT_W}x{OUT_H} equirectangular map...")
    py_grid, px_grid = np.mgrid[0:OUT_H, 0:OUT_W]
    lat = (0.5 - py_grid / OUT_H) * np.pi      # +π/2 (top) to -π/2 (bottom)
    lon = (px_grid / OUT_W) * 2 * np.pi - np.pi  # -π to +π

    # 5. Front hemisphere: orthographic unwrap
    print("Unwrapping front hemisphere...")
    disc_x = np.cos(lat) * np.sin(lon)
    disc_y = -np.sin(lat)
    disc_r = np.hypot(disc_x, disc_y)
    front = (np.abs(lon) <= np.pi / 2) & (disc_r < 0.96)

    result = np.zeros((OUT_H, OUT_W, 3), dtype=np.float64)
    result[front] = sample_bilinear(src, cx + disc_x[front] * radius, cy + disc_y[front] * radius)

    # Detect mosaic gaps: front pixels that are very dark are missing data
    brightness = np.sum(result, axis=2)
    mosaic_gap = front & (brightness < 30)
    front = front & ~mosaic_gap  # remove gaps from front mask
    print(f"  Filled {np.sum(mosaic_gap)} mosaic gap pixels")

    # 6. Color statistics from front hemisphere
    valid_colors = result[front]
    mean_c = np.mean(valid_colors, axis=0)
    dark_c = np.percentile(valid_colors, 10, axis=0)
    light_c = np.percentile(valid_colors, 90, axis=0)
    print(f"  Colors: dark={dark_c.astype(int)}, light={light_c.astype(int)}")

    # 7. Back hemisphere + mosaic gaps: procedural cantaloupe terrain
    print("Generating procedural terrain...")
    back = ~front

    # Use 3D spherical coords for seamless noise (no polar seams)
    s3x = np.cos(lat[back]) * np.cos(lon[back])
    s3y = np.cos(lat[back]) * np.sin(lon[back])
    s3z = np.sin(lat[back])

    # Multi-scale noise for cantaloupe-like terrain
    n1 = fbm(s3x * 4 + 100, s3y * 4 + 100, octaves=6, persistence=0.55, seed=42)
    n2 = fbm(s3x * 8 + 200, s3z * 8 + 200, octaves=4, persistence=0.5, seed=137)
    n3 = fbm(s3y * 16 + 300, s3z * 16 + 300, octaves=3, persistence=0.4, seed=256)
    n = n1 * 0.6 + n2 * 0.25 + n3 * 0.15

    # Map noise to color range
    proc = dark_c + (light_c - dark_c) * n[:, np.newaxis]

    # Slight hue variation for realism
    hue = fbm(s3x * 3, s3y * 3, octaves=3, seed=999) - 0.5
    proc[:, 0] += hue * 10
    proc[:, 2] -= hue * 5

    result[back] = proc

    # 8. Seam blending between real and procedural data
    print("Blending seams...")
    blend_rad = np.radians(15)  # 15° blend zone

    # Find edge colors per latitude row
    right_edge = np.tile(mean_c, (OUT_H, 1))
    left_edge = np.tile(mean_c, (OUT_H, 1))
    for row in range(OUT_H):
        cols = np.where(front[row])[0]
        if len(cols) > 0:
            right_edge[row] = result[row, cols[-1]]
            left_edge[row] = result[row, cols[0]]

    # Blend factor: 0 at front edge, 1 beyond blend zone
    lon_dist = np.abs(lon) - np.pi / 2
    in_blend = back & (lon_dist >= 0) & (lon_dist < blend_rad)

    t = np.zeros((OUT_H, OUT_W))
    t[in_blend] = lon_dist[in_blend] / blend_rad
    t = t * t * (3 - 2 * t)  # smoothstep

    # Build edge color map (right side for lon > 0, left for lon < 0)
    edge_map = np.where(
        (lon > 0)[..., np.newaxis],
        right_edge[:, np.newaxis, :],
        left_edge[:, np.newaxis, :],
    )

    # Blend: edge_color → procedural_color
    blended = edge_map * (1 - t[..., np.newaxis]) + result * t[..., np.newaxis]
    result[in_blend] = blended[in_blend]

    # 9. Save output
    print(f"Saving to {OUTPUT_PATH}...")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    out_img = Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))
    out_img.save(str(OUTPUT_PATH), "JPEG", quality=92)

    print(f"\nDone! {OUTPUT_PATH}")
    print(f"  Size: {OUT_W}x{OUT_H}")


if __name__ == "__main__":
    main()
