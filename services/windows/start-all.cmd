@echo off
rem Khởi động toàn bộ stack media trên Windows.
rem Sửa 3 biến dưới nếu bạn cài ở thư mục khác.

set ACE_DIR=C:\vic\engine\acestep
set VIENEU_DIR=C:\vic\engine\VieNeu-TTS
set WORKER_DIR=C:\vic\services\worker

start "ACE-Step :8085" cmd /k "cd /d %ACE_DIR% && start-acestep.cmd"
start "VieNeu-TTS :8000" cmd /k "cd /d %VIENEU_DIR% && start-vieneu.cmd"
start "VIC Worker" cmd /k "cd /d %WORKER_DIR% && node --env-file=.env worker.mjs"

echo Da mo 3 cua so: ACE-Step, VieNeu-TTS, Worker.
echo Kiem tra: http://127.0.0.1:8085/health va http://127.0.0.1:8000/health
