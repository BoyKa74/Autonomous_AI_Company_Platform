# Tự khởi động stack media khi đăng nhập Windows
# Chạy trong PowerShell:
#   powershell -ExecutionPolicy Bypass -File register-startup.ps1

param(
    [string]$StartScript = "C:\vic\start-all.cmd",
    [string]$TaskName = "VIC Media Stack"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $StartScript)) {
    throw "Không tìm thấy $StartScript — copy start-all.cmd vào C:\vic trước."
}

schtasks /Create /F /TN "$TaskName" /SC ONLOGON /TR "cmd /c $StartScript" | Out-Null
Write-Host "Đã tạo task '$TaskName' — stack media sẽ tự chạy mỗi lần đăng nhập."
Write-Host "Gỡ bỏ bằng: schtasks /Delete /TN `"$TaskName`" /F"
