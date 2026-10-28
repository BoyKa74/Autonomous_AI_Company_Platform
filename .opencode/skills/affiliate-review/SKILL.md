---
name: affiliate-review
description: Use when writing or checking affiliate product reviews/comparisons with SEO title/meta, verified sources, affiliate disclosure, and CTA. Triggers: review sản phẩm, bài so sánh, affiliate disclosure, SEO review, kiểm tra bài viết affiliate.
---

# Affiliate Review

Mục tiêu: bài review/so sánh affiliate **có nguồn, có disclosure, không bịa số**, tối ưu SEO nhưng không spam.

## Nguyên tắc cứng

- Mọi thông số/giá/hoa hồng phải có nguồn + ngày kiểm tra.
- Phải có affiliate disclosure gần link/CTA.
- Không dùng claim y tế/tài chính/tuyệt đối khi chưa có bằng chứng.
- Không bịa trải nghiệm, không bịa “tôi đã dùng” nếu chưa dùng.
- Không dùng placeholder `[...]`, `TODO`, `lorem ipsum`.
- Title ≤ 60 ký tự; meta description ≤ 155 ký tự.

## Đầu vào

- `draft.md`: bài viết.
- `meta.json`:

```json
{
  "title": "Tiêu đề ≤ 60 ký tự",
  "description": "Meta description 50–155 ký tự",
  "keyword": "từ khoá chính",
  "product": "Tên sản phẩm",
  "affiliate_url": "https://affiliate.example/go/product",
  "sources": ["https://official.example/product", "https://review.example/product"],
  "verified_at": "2026-10-20"
}
```

## Quy trình

1. Viết outline từ keyword + search intent.
2. Kiểm chứng thông số từ nguồn chính thức; ghi ngày.
3. Viết draft, chèn disclosure + CTA + link affiliate.
4. Chạy:

```bash
node scripts/check.mjs draft.md --meta meta.json
```

5. Sửa hết `errors`; xử lý `warnings` hoặc giải thích.
6. Chỉ xuất bản khi `ok=true`.

## Gate chính

- Title/description đúng độ dài; keyword có trong title, description, 100 từ đầu.
- Disclosure + CTA + affiliate URL.
- Ít nhất 2 nguồn URL; dữ liệu ≤ 45 ngày.
- 300–1800 từ; khuyến nghị 700–1500.
- Không có claim y tế/tài chính nguy hiểm.
- Claim “tốt nhất/số 1” bị cảnh báo, phải có bằng chứng.

## Self-test

```bash
node scripts/selftest.mjs
```
