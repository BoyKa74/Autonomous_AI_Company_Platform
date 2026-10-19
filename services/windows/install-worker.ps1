# Cài VIC Media Worker trên Windows
# Chạy trong PowerShell:
#   powershell -ExecutionPolicy Bypass -File install-worker.ps1

param(
    [string]$Root = "C:\vic\services\worker"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "==> Cài Node.js LTS..."
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    Write-Host "Đã cài Node. Mở PowerShell mới rồi chạy lại script này."
    exit 0
}

$source = Join-Path $PSScriptRoot "..\worker"
if (-not (Test-Path $source)) {
    throw "Không tìm thấy thư mục services\worker cạnh script này."
}

New-Item -ItemType Directory -Force -Path $Root | Out-Null
Copy-Item "$source\package.json" "$Root\package.json" -Force
Copy-Item "$source\worker.mjs" "$Root\worker.mjs" -Force

Push-Location $Root
npm install --omit=dev
Pop-Location

$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item "$PSScriptRoot\.env.example" $envFile
    Write-Host ""
    Write-Host ">>> Mở file sau và điền SUPABASE_SERVICE_ROLE_KEY:"
    Write-Host "    $envFile"
} else {
    Write-Host "File .env đã tồn tại, giữ nguyên."
}

Write-Host ""
Write-Host "Xong. Test chạy:"
Write-Host "    cd $Root"
Write-Host "    node --env-file=.env worker.mjs"
