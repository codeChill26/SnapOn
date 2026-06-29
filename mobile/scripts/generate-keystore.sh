#!/bin/bash
# ============================================================
# SnapOn - Generate Android Keystore
#
# Tạo file keystore (.jks) cho signing app Android.
# File này CẦN ĐƯỢC BẢO MẬT - KHÔNG commit lên git!
#
# Usage: bash scripts/generate-keystore.sh
# ============================================================

set -e

KEYSTORE_DIR="./keystores"
KEYSTORE_FILE="$KEYSTORE_DIR/snapon-release.jks"
KEY_ALIAS="snapon"

echo ""
echo "🔑 SnapOn - Android Keystore Generator"
echo "======================================="
echo ""

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Keystore already exists at: $KEYSTORE_FILE"
    read -p "   Overwrite? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "   Aborted."
        exit 0
    fi
fi

# Create directory
mkdir -p "$KEYSTORE_DIR"

# Prompt for passwords
echo "📝 Enter keystore information:"
echo ""

read -sp "   Keystore password (min 6 chars): " STORE_PASSWORD
echo ""
read -sp "   Key password (min 6 chars):      " KEY_PASSWORD
echo ""
echo ""

read -p "   Your name (CN):           " CN
read -p "   Organization unit (OU):    " OU
read -p "   Organization (O):          " O
read -p "   City (L):                  " L
read -p "   State (ST):                " ST
read -p "   Country code (C, e.g. VN): " C

# Generate keystore
echo ""
echo "🔨 Generating keystore..."

keytool -genkeypair \
    -v \
    -storetype JKS \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -alias "$KEY_ALIAS" \
    -keystore "$KEYSTORE_FILE" \
    -dname "CN=$CN, OU=$OU, O=$O, L=$L, ST=$ST, C=$C"

echo ""
echo "✅ Keystore created: $KEYSTORE_FILE"
echo ""

# Create credentials.json
CREDENTIALS_FILE="./credentials.json"
cat > "$CREDENTIALS_FILE" << EOF
{
  "android": {
    "keystore": {
      "keystorePath": "$KEYSTORE_FILE",
      "keystorePassword": "$STORE_PASSWORD",
      "keyAlias": "$KEY_ALIAS",
      "keyPassword": "$KEY_PASSWORD"
    }
  }
}
EOF

echo "✅ credentials.json created"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ⚠️  IMPORTANT: Keep these files SECURE!            ║"
echo "║                                                      ║"
echo "║  • keystores/snapon-release.jks                      ║"
echo "║  • credentials.json                                  ║"
echo "║                                                      ║"
echo "║  Do NOT commit them to git!                          ║"
echo "║  Share them securely with your team (e.g. via        ║"
echo "║  encrypted zip, password manager, or private drive). ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
