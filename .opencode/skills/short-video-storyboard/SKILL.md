---
name: short-video-storyboard
description: Use when planning or checking a 20–45 second affiliate short video: hook, shot list, voiceover, on-screen text, product proof, disclosure, and CTA. Triggers: storyboard affiliate, kịch bản video ngắn, hook 3 giây, shot list, TikTok/Reels/Shorts.
---

# Short Video Storyboard

Mục tiêu: storyboard **20–45 giây** cho video affiliate, có hook rõ, bằng chứng sản phẩm, CTA và disclosure; không bịa trải nghiệm.

## Nguyên tắc cứng

- Tổng thời lượng 20–45 giây.
- Hook ≤ 3 giây.
- Mỗi cảnh 2–5 giây, timeline liên tục.
- Sản phẩm phải xuất hiện; ưu tiên demo/asset thật, không dùng stock footage gây hiểu nhầm.
- Có affiliate disclosure và CTA.
- Không claim y tế/tài chính/tuyệt đối khi chưa có bằng chứng.
- Tỉ lệ 9:16.

## Schema

```json
{
  "product": "Example SaaS A",
  "duration_sec": 30,
  "aspect_ratio": "9:16",
  "hook_sec": 3,
  "hook": "Câu hook",
  "shots": [
    {
      "start": 0,
      "end": 3,
      "visual": "Mô tả hình ảnh",
      "voiceover": "Lời đọc",
      "on_screen_text": "Chữ trên màn hình"
    }
  ],
  "disclosure": "Affiliate disclosure: ...",
  "cta": "Dùng thử qua link...",
  "sources": ["https://official.example/product"]
}
```

## Quy trình

1. Lấy product facts đã kiểm chứng (từ skill `affiliate-product-research`).
2. Viết hook 3 giây, 5–8 cảnh, mỗi cảnh 2–5 giây.
3. Chèn demo/proof + disclosure + CTA.
4. Chạy:

```bash
node scripts/check.mjs storyboard.json
```

5. Sửa hết `errors`; chỉ render khi `ok=true`.
6. Sau đó mới đưa sang MoneyPrinterTurbo/engine dựng video.

## Self-test

```bash
node scripts/selftest.mjs
```
