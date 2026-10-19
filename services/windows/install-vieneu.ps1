# Cài VieNeu-TTS (giọng đọc tiếng Việt) trên Windows
# Chạy trong PowerShell:
#   powershell -ExecutionPolicy Bypass -File install-vieneu.ps1

param(
    [string]$Root = "C:\vic\engine\VieNeu-TTS"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Cần cài Git trước: winget install Git.Git"
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "==> Cài uv..."
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
}

if (-not (Test-Path $Root)) {
    Write-Host "==> Clone VieNeu-TTS..."
    git clone https://github.com/pnnbao97/VieNeu-TTS.git $Root
}

Write-Host "==> Cài dependencies (CPU, không cần GPU)..."
Push-Location $Root
uv sync
Pop-Location

$startScript = @"
@echo off
cd /d %~dp0
uv run python -m apps.openai_speech
"@
Set-Content -Path "$Root\start-vieneu.cmd" -Value $startScript -Encoding ASCII

Write-Host ""
Write-Host "Xong. Chạy server: $Root\start-vieneu.cmd"
Write-Host "Kiểm tra: http://127.0.0.1:8000/health"
