---
name: affiliate-product-research
description: Use when researching, validating, or shortlisting affiliate products by demand, competition, commission, content gap, and new-account signals. Triggers: affiliate research, chọn sản phẩm, Kalodata, TikTok Shop, Shopee, hoa hồng, shortlist, product scorecard.
---

# Affiliate Product Research

Mục tiêu: chọn sản phẩm affiliate có **bằng chứng**, không bịa số, ưu tiên sản phẩm có nhu cầu thật và cạnh tranh nội dung thấp.

## Nguyên tắc cứng

- Không chấp nhận sản phẩm thiếu `source_url` hoặc `verified_at`.
- Không bịa doanh số, hoa hồng, giá, đánh giá.
- Dữ liệu quá 45 ngày: loại; 31–45 ngày: cảnh báo.
- Chỉ shortlist tối đa 3 sản phẩm.
- Mỗi kết luận phải có nguồn và ngày kiểm tra.
- Nếu thiếu dữ liệu, ghi `THIẾU DỮ LIỆU` và nêu chính xác cần lấy gì.

## Nguồn dữ liệu

Ưu tiên: trang chương trình chính thức, Kalodata, TikTok Shop, Shopee/Lazada affiliate, TikTok Creative Center, Google Trends, kênh đối thủ.

Dùng Agent Reach để đọc nguồn công khai:

```bash
agent-reach read <url>
agent-reach web search "<query>"
agent-reach github search "<query>"
agent-reach youtube search "<query>"
```

Với nguồn cần login, chỉ dùng tài khoản phụ; không đăng bài, không comment.

## Schema đầu vào

```json
[
  {
    "name": "Product name",
    "category": "software",
    "price_usd": 49,
    "commission_pct": 30,
    "sales_30d": 120,
    "sales_7d": 30,
    "competition_score": 3,
    "content_gap_score": 4,
    "new_account_signal": 4,
    "source_url": "https://official.example/product",
    "verified_at": "2026-10-20",
    "notes": "optional"
  }
]
```

Điểm 0–5; với `competition_score`, **5 = cạnh tranh thấp** (tốt).

## Chấm điểm

- Demand 25%: từ `sales_30d` hoặc `demand_score`.
- Competition 20%.
- Commission 20%: từ `commission_pct` hoặc `commission_score`.
- Content gap 15%.
- New-account signal 10%.
- Economics 10%: từ giá + hoa hồng hoặc `economics_score`.

## Quy trình

1. Thu thập candidate có nguồn; lưu JSON.
2. Chạy:

```bash
node scripts/score.mjs candidates.json --out shortlist.json --markdown shortlist.md
```

3. Đọc `errors`/`warnings`; sửa dữ liệu hoặc loại candidate.
4. Trả về shortlist tối đa 3 sản phẩm + lý do + rủi ro + độ tin cậy.
5. Không chốt sản phẩm nếu `valid=false` hoặc thiếu nguồn.

## Self-test

```bash
node scripts/selftest.mjs
```

Pattern quality gate lấy cảm hứng từ `shuohao-skills` (Apache-2.0); script tại đây viết mới, không copy code.
