#!/usr/bin/env node
import assert from "node:assert/strict";
import { checkReview } from "./check.mjs";

const NOW = Date.parse("2026-10-28T00:00:00Z");
const meta = {
  title: "Example SaaS A review cho team nhỏ",
  description:
    "Review Example SaaS A cho team nhỏ: tính năng, giá, ưu nhược điểm và link dùng thử. Dữ liệu kiểm tra ngày 20/10/2026.",
  keyword: "example saas a",
  product: "Example SaaS A",
  affiliate_url: "https://affiliate.example/go/example-saas-a",
  sources: [
    "https://vendor.example/program",
    "https://review.example/example-saas-a",
  ],
  verified_at: "2026-10-20",
};

const filler =
  "Example SaaS A là công cụ quản lý công việc cho team nhỏ, có bảng công việc, phê duyệt và báo cáo tiến độ. Nguồn tham khảo: https://vendor.example/program. ";
const draft = [
  "# Example SaaS A review",
  filler.repeat(25),
  "Affiliate disclosure: Bài viết có chứa liên kết tiếp thị và tôi có thể nhận hoa hồng.",
  "Bạn có thể dùng thử tại https://affiliate.example/go/example-saas-a.",
].join("\n\n");

const good = checkReview({ meta, draft, now: NOW });
assert.equal(good.ok, true);
assert.ok(good.metrics.words >= 300);

const longTitle = checkReview({
  meta: { ...meta, title: "x".repeat(61) },
  draft,
  now: NOW,
});
assert.equal(longTitle.ok, false);
assert.ok(longTitle.errors.some((e) => e.includes("title")));

const noDisclosure = checkReview({
  meta,
  draft: draft.replace(/Affiliate disclosure[\s\S]*?hoa hồng\./, ""),
  now: NOW,
});
assert.equal(noDisclosure.ok, false);

const stale = checkReview({
  meta: { ...meta, verified_at: "2026-01-01" },
  draft,
  now: NOW,
});
assert.equal(stale.ok, false);

const medical = checkReview({
  meta,
  draft: draft + "\nSản phẩm chữa bệnh và cam kết 100%.",
  now: NOW,
});
assert.equal(medical.ok, false);

const short = checkReview({ meta, draft: "Example SaaS A quá ngắn.", now: NOW });
assert.equal(short.ok, false);

const noSources = checkReview({
  meta: { ...meta, sources: [] },
  draft,
  now: NOW,
});
assert.equal(noSources.ok, false);

console.log("affiliate-review selftest: ok");
