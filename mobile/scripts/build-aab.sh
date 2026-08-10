#!/bin/bash
# ============================================================
# SnapOn Mobile - Build .aab với Docker
#
# Script Bash cho team Linux/macOS.
# Usage: bash scripts/build-aab.sh
# ============================================================

set -e

OUTPUT_NAME="${1:-SnapOn.aab}"

echo ""
echo "======================================="
echo "  SnapOn Mobile - Docker AAB Builder   "
echo "======================================="
echo ""

# ---- Get project root ----
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$MOBILE_DIR")"

# ---- Check Docker ----
echo "[1/4] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "  ❌ Docker is not installed!"
    echo "  Install: https://docs.docker.com/desktop/"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo "  ❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "  ✅ Docker: $(docker --version)"

# ---- Check required files ----
echo ""
echo "[2/4] Checking required files..."

if [ ! -f "$MOBILE_DIR/credentials.json" ]; then
    echo "  ⚠️  credentials.json not found!"
    echo "  Run: bash scripts/generate-keystore.sh"
    read -p "  Continue anyway? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        exit 0
    fi
fi

echo "  ✅ Required files checked"

# ---- Build Docker image ----
echo ""
echo "[3/4] Building Docker image (first time may take 10-20 min)..."
cd "$ROOT_DIR"
docker compose build mobile-build
echo "  ✅ Docker image ready"

# ---- Run build ----
echo ""
echo "[4/4] Building .aab file..."
echo "  ⏱️  This may take 5-15 minutes..."

mkdir -p "$ROOT_DIR/build-output"

docker compose run --rm mobile-build

# ---- Success ----
OUTPUT_FILE="$ROOT_DIR/build-output/$OUTPUT_NAME"
echo ""
echo "======================================="
echo "  ✅ BUILD SUCCESSFUL!                 "
echo "======================================="
echo ""

if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "  Output: $OUTPUT_FILE"
    echo "  Size:   $FILE_SIZE"
fi

echo ""
echo "  Next steps:"
echo "  1. Go to https://play.google.com/console"
echo "  2. Select Internal Testing track"
echo "  3. Upload the .aab file"
echo ""
