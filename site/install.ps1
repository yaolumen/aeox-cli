# aeox-cli installer - https://cli.aeox.uk
# Usage: iwr -useb https://cli.aeox.uk/install.ps1 | iex
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "aeox-cli installer" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

# 1. Node.js >= 22.18 (native TypeScript support)
try {
  $nodeVer = node --version
} catch {
  $nodeVer = $null
}
if (-not $nodeVer) {
  Write-Host "[FAIL] Node.js not found. Install Node.js 22.18+ from https://nodejs.org, then re-run." -ForegroundColor Red
  return
}
$required = [version]"22.18.0"
try {
  $current = [version]($nodeVer.ToString().TrimStart("v"))
} catch {
  $current = $required
}
if ($current -lt $required) {
  Write-Host "[FAIL] Node.js $nodeVer found, but 22.18+ is required. Upgrade at https://nodejs.org" -ForegroundColor Red
  return
}
Write-Host "[ OK ] Node.js $nodeVer" -ForegroundColor Green

# 2. Install globally (official registry - mirrors may lag on fresh releases)
Write-Host "...   npm install -g aeox-cli" -ForegroundColor Cyan
npm install -g aeox-cli --registry https://registry.npmjs.org
if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] npm install failed. Check network / proxy settings, then retry." -ForegroundColor Red
  return
}
Write-Host "[ OK ] aeox-cli installed" -ForegroundColor Green

# 3. Deploy assets (junctions + plugin registration + deps, idempotent)
Write-Host "...   aeox install" -ForegroundColor Cyan
aeox install
if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] aeox install failed. Run 'aeox doctor' for diagnosis." -ForegroundColor Red
  return
}

Write-Host ""
Write-Host "[ OK ] aeox-cli v0.1.0 ready. Verify with: aeox doctor" -ForegroundColor Green
Write-Host "      Docs: https://cli.aeox.uk" -ForegroundColor Cyan
