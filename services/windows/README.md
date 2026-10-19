# Xưởng media trên Windows

Máy Windows 8GB chạy 24/7: **ACE-Step** (tạo nhạc) + **VieNeu-TTS** (giọng đọc tiếng Việt) + **worker** nhận job từ web.

```
Web (Supabase) → media_jobs (queued)
                      │  claim_media_jobs (service_role)
              Windows worker ──► ACE-Step  :8085  (nhạc)
                      │        └► VieNeu-TTS :8000 (voice)
                      └──► upload file lên Supabase Storage (bucket "media")
                               → media_jobs (succeeded + result_url)
```

## Cài đặt (một lần)

Mở PowerShell, copy thư mục `services\windows` + `services\worker` sang máy Windows (hoặc clone repo), rồi chạy lần lượt:

```powershell
powershell -ExecutionPolicy Bypass -File install-acestep.ps1   # ~3.1GB model, tải một lần
powershell -ExecutionPolicy Bypass -File install-vieneu.ps1
powershell -ExecutionPolicy Bypass -File install-worker.ps1
```

Sau đó mở `C:\vic\services\worker\.env` và điền `SUPABASE_SERVICE_ROLE_KEY`
(Supabase Dashboard → Project Settings → API → service_role).

## Chạy

```powershell
# cách 1: thủ công
C:\vic\services\worker> node --env-file=.env worker.mjs

# cách 2: mở cả 3 cửa sổ
copy start-all.cmd C:\vic\start-all.cmd
C:\vic\start-all.cmd

# cách 3: tự chạy khi đăng nhập
powershell -ExecutionPolicy Bypass -File register-startup.ps1
```

Kiểm tra:

- `http://127.0.0.1:8085/health` → ACE-Step
- `http://127.0.0.1:8000/health` → VieNeu-TTS
- Log worker: dòng `[worker] Xong job ...`

## Lưu ý cho máy 8GB

- Chạy **tuần tự** một job một lúc (worker đã thiết kế vậy) — đừng mở WebUI của ACE-Step và tạo job cùng lúc.
- Video AI (LTX/Wan) **không** chạy trên máy này; để dành cho máy GPU hoặc thuê GPU theo giờ.
- Nhạc CPU sẽ chậm hơn GPU (vài phút/bài với bản Q4). Muốn nhanh/nét hơn: thay model trong `install-acestep.ps1` (LM 1.7B, DiT Q8_0) — tốn thêm RAM.
- Job nằm trong Supabase, máy tắt/mở lại không mất; job treo quá 2 giờ tự requeue.

## Bảo mật

- `.env` chứa service role key — chỉ nằm trên máy Windows, không commit, không gửi qua chat.
- Không mở port 8085/8000 ra Internet; worker gọi qua `127.0.0.1`.
