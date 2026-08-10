# ============================================================
# SnapOn Mobile - Build .aab với Docker
#
# Script PowerShell cho team Windows.
# Usage: .\scripts\build-aab.ps1
# ============================================================

param(
    [string]$Profile = "production",
    [string]$OutputName = "SnapOn.aab"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  SnapOn Mobile - Docker AAB Builder   " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ---- Check Docker ----
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "  OK: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Docker is not installed or not running!" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Red
    exit 1
}

# Check Docker daemon is running
try {
    docker info > $null 2>&1
} catch {
    Write-Host "  ERROR: Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# ---- Check required files ----
Write-Host ""
Write-Host "[2/4] Checking required files..." -ForegroundColor Yellow

$mobileDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$rootDir = Split-Path -Parent $mobileDir

# Check credentials.json
$credentialsFile = Join-Path $mobileDir "credentials.json"
if (-Not (Test-Path $credentialsFile)) {
    Write-Host "  WARNING: credentials.json not found!" -ForegroundColor Yellow
    Write-Host "  You need to set up signing credentials first." -ForegroundColor Yellow
    Write-Host "  Run: bash scripts/generate-keystore.sh" -ForegroundColor Yellow
    Write-Host "  Or copy credentials.json.example and configure it." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
}

# Check .env for EXPO_TOKEN
$envFile = Join-Path $rootDir ".env"
if (-Not (Test-Path $envFile)) {
    if (-Not $env:EXPO_TOKEN) {
        Write-Host "  WARNING: No EXPO_TOKEN found in environment or .env file." -ForegroundColor Yellow
        Write-Host "  Get your token at: https://expo.dev/settings/access-tokens" -ForegroundColor Yellow
    }
}

Write-Host "  OK: Required files checked" -ForegroundColor Green

# ---- Build Docker image ----
Write-Host ""
Write-Host "[3/4] Building Docker image (first time may take 10-20 min)..." -ForegroundColor Yellow

Set-Location $rootDir
docker compose build mobile-build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Docker image build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Docker image ready" -ForegroundColor Green

# ---- Run build ----
Write-Host ""
Write-Host "[4/4] Building .aab file..." -ForegroundColor Yellow
Write-Host "  This may take 5-15 minutes..." -ForegroundColor Gray

# Create output directory
$outputDir = Join-Path $rootDir "build-output"
if (-Not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Run the build
docker compose run --rm mobile-build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: Build failed! Check the logs above for details." -ForegroundColor Red
    exit 1
}

# ---- Success ----
$outputFile = Join-Path $outputDir $OutputName
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

if (Test-Path $outputFile) {
    $fileSize = [math]::Round((Get-Item $outputFile).Length / 1MB, 2)
    Write-Host "  Output: $outputFile" -ForegroundColor White
    Write-Host "  Size:   $fileSize MB" -ForegroundColor White
} else {
    Write-Host "  Output: Check build-output/ directory" -ForegroundColor White
}

Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to https://play.google.com/console" -ForegroundColor White
Write-Host "  2. Select Internal Testing track" -ForegroundColor White
Write-Host "  3. Upload the .aab file" -ForegroundColor White
Write-Host ""
