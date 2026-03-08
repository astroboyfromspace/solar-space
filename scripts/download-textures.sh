#!/usr/bin/env bash
# Downloads 2K texture maps from Solar System Scope (CC-BY) into public/textures/
set -eo pipefail

TEXTURE_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/textures"
mkdir -p "$TEXTURE_DIR"

SSS_BASE="https://www.solarsystemscope.com/textures/download"

download() {
  local name="$1"
  local url="$2"
  local ext="${url##*.}"
  local outfile="$TEXTURE_DIR/${name}.${ext}"

  if [ -f "$outfile" ]; then
    echo "[skip] ${name}.${ext} already exists"
    return 0
  fi

  echo "[download] ${name}.${ext} ..."
  if curl -fSL --max-time 120 -o "$outfile" "$url"; then
    echo "  -> OK"
  else
    echo "  -> FAILED (skipping)"
    rm -f "$outfile"
    return 0
  fi
}

echo "Downloading textures to: $TEXTURE_DIR"
echo ""

# Solar System Scope 2K textures
download sun "${SSS_BASE}/2k_sun.jpg"
download mercury "${SSS_BASE}/2k_mercury.jpg"
download venus_atmosphere "${SSS_BASE}/2k_venus_atmosphere.jpg"
download earth_day "${SSS_BASE}/2k_earth_daymap.jpg"
download earth_clouds "${SSS_BASE}/2k_earth_clouds.jpg"
download earth_normal "${SSS_BASE}/2k_earth_normal_map.tif"
download mars "${SSS_BASE}/2k_mars.jpg"
download jupiter "${SSS_BASE}/2k_jupiter.jpg"
download saturn "${SSS_BASE}/2k_saturn.jpg"
download saturn_ring "${SSS_BASE}/2k_saturn_ring_alpha.png"
download moon "${SSS_BASE}/2k_moon.jpg"

# Convert earth_normal TIF to JPG if available
if [ -f "$TEXTURE_DIR/earth_normal.tif" ] && [ ! -f "$TEXTURE_DIR/earth_normal.jpg" ]; then
  echo ""
  echo "Converting earth_normal.tif -> earth_normal.jpg ..."
  if command -v sips &>/dev/null; then
    sips -s format jpeg "$TEXTURE_DIR/earth_normal.tif" --out "$TEXTURE_DIR/earth_normal.jpg" 2>/dev/null
    rm -f "$TEXTURE_DIR/earth_normal.tif"
    echo "  -> OK (sips)"
  elif command -v convert &>/dev/null; then
    convert "$TEXTURE_DIR/earth_normal.tif" "$TEXTURE_DIR/earth_normal.jpg"
    rm -f "$TEXTURE_DIR/earth_normal.tif"
    echo "  -> OK (ImageMagick)"
  else
    echo "  -> No converter found, keeping .tif"
  fi
fi

# Attempt Galilean moons + Titan from alternative sources
echo ""
echo "Attempting Galilean moons + Titan textures..."

download io "https://upload.wikimedia.org/wikipedia/commons/7/7b/Io_color_merged_mosaic.jpg"
download europa "https://upload.wikimedia.org/wikipedia/commons/e/e4/Europa-moonGL.jpg"
download ganymede "https://upload.wikimedia.org/wikipedia/commons/2/21/Ganymede_-_Pair.jpg"
download callisto "https://upload.wikimedia.org/wikipedia/commons/e/e9/Callisto.jpg"
download titan "https://upload.wikimedia.org/wikipedia/commons/6/60/Titan_in_natural_color_Cassini.jpg"

echo ""
echo "Done! Textures are in: $TEXTURE_DIR"
