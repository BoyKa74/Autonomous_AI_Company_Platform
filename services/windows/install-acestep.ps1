# Cài ACE-Step (GGUF) trên Windows — bản CPU cho máy 8GB RAM
# Chạy trong PowerShell (không cần admin):
#   powershell -ExecutionPolicy Bypass -File install-acestep.ps1

param(
    [string]$Root = "C:\vic\engine\acestep"
)

$ErrorActionPreference = "Stop"
$BaseUrl = "https://www.serveurperso.com/temp/acestep.cpp-win64"
$Hf = "https://huggingface.co/Serveurperso/ACE-Step-1.5-GGUF/resolve/main"

New-Item -ItemType Directory -Force -Path "$Root\build\Release" | Out-Null
New-Item -ItemType Directory -Force -Path "$Root\adapters" | Out-Null
New-Item -ItemType Directory -Force -Path "$Root\models" | Out-Null

$binaries = @(
    "ace-server.exe",
    "ggml.dll",
    "ggml-base.dll",
    "ggml-cpu-alderlake.dll",
    "ggml-cpu-cannonlake.dll",
    "ggml-cpu-cascadelake.dll",
    "ggml-cpu-haswell.dll",
    "ggml-cpu-icelake.dll",
    "ggml-cpu-sandybridge.dll",
    "ggml-cpu-skylakex.dll",
    "ggml-cpu-sse42.dll",
    "ggml-cpu-x64.dll",
    "ggml-cuda.dll",
    "ggml-vulkan.dll",
    "mp3-codec.exe",
    "neural-codec.exe"
)

Write-Host "==> Tải binary ACE-Step..."
foreach ($file in $binaries) {
    $target = Join-Path "$Root\build\Release" $file
    if (Test-Path $target) { continue }
    Write-Host "    $file"
    Invoke-WebRequest -Uri "$BaseUrl/build/Release/$file" -OutFile $target
}

# Bộ model nhẹ cho 8GB RAM (tổng ~3.1GB). Muốn chất lượng cao hơn:
# đổi LM lên 1.7B và DiT lên Q8_0 trong danh sách dưới.
$models = @(
    "acestep-5Hz-lm-0.6B-Q8_0.gguf",
    "Qwen3-Embedding-0.6B-Q8_0.gguf",
    "acestep-v15-turbo-Q4_K_M.gguf",
    "vae-BF16.gguf"
)

Write-Host "==> Tải model (~3.1GB, chạy một lần)..."
foreach ($model in $models) {
    $target = Join-Path "$Root\models" $model
    if (Test-Path $target) { continue }
    Write-Host "    $model"
    Invoke-WebRequest -Uri "$Hf/$model?download=true" -OutFile $target
}

$startScript = @"
@echo off
cd /d %~dp0
build\Release\ace-server.exe --host 127.0.0.1 --port 8085 --models models --adapters adapters --max-batch 1
"@
Set-Content -Path "$Root\start-acestep.cmd" -Value $startScript -Encoding ASCII

Write-Host ""
Write-Host "Xong. Chạy server: $Root\start-acestep.cmd"
Write-Host "Kiểm tra: http://127.0.0.1:8085/health"
