#!/bin/bash
# ============================================================
# SnapOn Mobile - Docker Build Entrypoint
#
# Script này chạy bên trong Docker container để:
# 1. Copy source code từ /app (mounted volume) vào /build/project
# 2. Cài dependencies (npm ci)
# 3. Chạy eas build --local để tạo file .aab
# 4. Copy .aab ra /output
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     SnapOn Mobile - Android .aab Builder        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ---- Step 1: Copy project files ----
echo "📦 [1/4] Copying project files..."
if [ ! -d "/app" ]; then
    echo "❌ Error: /app directory not found. Did you mount the mobile directory?"
    echo "   Usage: docker compose run --rm mobile-build"
    exit 1
fi

# Copy project excluding node_modules, android, ios (will be regenerated)
rsync_or_cp() {
    if command -v rsync &> /dev/null; then
        rsync -a --exclude='node_modules' --exclude='android' --exclude='ios' \
              --exclude='.expo' --exclude='*.aab' --exclude='*.apk' \
              /app/ /build/project/
    else
        mkdir -p /build/project
        cd /app
        # Use tar to copy while excluding directories
        tar --exclude='node_modules' --exclude='android' --exclude='ios' \
            --exclude='.expo' --exclude='*.aab' --exclude='*.apk' \
            -cf - . | (cd /build/project && tar -xf -)
    fi
}

rsync_or_cp
echo "   ✅ Project files copied to /build/project"

# ---- Step 2: Install dependencies ----
echo ""
echo "📥 [2/4] Installing dependencies (npm ci)..."
cd /build/project
npm ci --prefer-offline 2>&1 | tail -5
echo "   ✅ Dependencies installed"

# ---- Step 2.5: Initialize temporary git repository (required by EAS CLI) ----
echo ""
echo "🐙 [2.5/4] Initializing temporary git repository..."
git init -q
git config --global user.email "docker@builder.local"
git config --global user.name "Docker Builder"
git config --global --add safe.directory /build/project
git add -A
git commit -m "chore: local build environment init" --no-verify -q
echo "   ✅ Git repository initialized"

# ---- Step 3: Configure EAS authentication ----
echo ""
echo "🔑 [3/4] Configuring EAS..."

if [ -n "$EXPO_TOKEN" ]; then
    echo "   ✅ EXPO_TOKEN detected, using token authentication"
else
    echo "   ⚠️  No EXPO_TOKEN found."
    echo "   💡 Set EXPO_TOKEN in .env file or environment variable."
    echo "   💡 Get your token at: https://expo.dev/settings/access-tokens"
    echo "   Attempting build without authentication (may fail)..."
fi

# Check for local credentials
if [ -f "credentials.json" ]; then
    echo "   ✅ Local credentials.json found"
else
    echo "   ⚠️  No credentials.json found."
    echo "   💡 Copy credentials.json.example → credentials.json and configure keystore."
    echo "   💡 Or run: ./scripts/generate-keystore.sh to create a new keystore."
fi

# ---- Step 4: Build .aab ----
echo ""
echo "🔨 [4/4] Building .aab with EAS (eas build --local)..."
echo "   This may take 5-15 minutes depending on your machine..."
echo ""

# Determine output filename
OUTPUT_NAME="${AAB_OUTPUT_NAME:-SnapOn.aab}"

eas build \
    --platform android \
    --profile production \
    --local \
    --non-interactive \
    --output "/output/${OUTPUT_NAME}"

# ---- Done ----
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              ✅ BUILD SUCCESSFUL!                ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Output: ./build-output/${OUTPUT_NAME}          ║"
echo "║                                                  ║"
echo "║  Next steps:                                     ║"
echo "║  1. Upload to Google Play Console                ║"
echo "║  2. Select Internal Testing track                ║"
echo "║  3. Create a new release with this .aab          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
