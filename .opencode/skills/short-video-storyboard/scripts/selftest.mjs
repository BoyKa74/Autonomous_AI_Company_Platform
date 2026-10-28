#!/usr/bin/env node
import assert from "node:assert/strict";
import { checkStoryboard } from "./check.mjs";

const good = {
  product: "Example SaaS A",
  duration_sec: 30,
  aspect_ratio: "9:16",
  hook_sec: 3,
  hook: "Team bạn có đang mất 2 giờ mỗi tuần để gom việc?",
  shots: [
    { start: 0, end: 3, visual: "Điện thoại nhiều tab", voiceover: "Team bạn có đang mất 2 giờ mỗi tuần để gom việc?", on_screen_text: "Mất 2 giờ/tuần?" },
    { start: 3, end: 7, visual: "Dashboard Example SaaS A", voiceover: "Example SaaS A gom việc vào một bảng.", on_screen_text: "Một bảng duy nhất" },
    { start: 7, end: 11, visual: "Tạo việc", voiceover: "Tạo việc, gán người và đặt hạn.", on_screen_text: "Tạo việc" },
    { start: 11, end: 15, visual: "Phê duyệt", voiceover: "Luồng phê duyệt rõ ràng.", on_screen_text: "Duyệt việc" },
    { start: 15, end: 19, visual: "Báo cáo", voiceover: "Báo cáo tiến độ theo tuần.", on_screen_text: "Báo cáo" },
    { start: 19, end: 23, visual: "Bảng giá", voiceover: "Gói khởi điểm 49 USD mỗi tháng.", on_screen_text: "Từ 49 USD" },
    { start: 23, end: 27, visual: "So sánh", voiceover: "Phù hợp team nhỏ, không thay hệ thống tài chính.", on_screen_text: "Phù hợp team nhỏ" },
    { start: 27, end: 30, visual: "CTA", voiceover: "Đây là liên kết tiếp thị. Dùng thử Example SaaS A qua link.", on_screen_text: "Dùng thử" },
  ],
  disclosure: "Affiliate disclosure: Video có chứa liên kết tiếp thị; tôi có thể nhận hoa hồng.",
  cta: "Dùng thử Example SaaS A qua link trong mô tả.",
  sources: ["https://vendor.example/program"],
};

const goodResult = checkStoryboard(good);
assert.equal(goodResult.ok, true);
assert.equal(goodResult.metrics.shots, 8);

const shortDuration = structuredClone(good);
shortDuration.duration_sec = 10;
assert.equal(checkStoryboard(shortDuration).ok, false);

const longShot = structuredClone(good);
longShot.shots[1].end = 9;
longShot.shots[2].start = 9;
assert.equal(checkStoryboard(longShot).ok, false);

const gap = structuredClone(good);
gap.shots[2].start = 8;
assert.equal(checkStoryboard(gap).ok, false);

const noProduct = structuredClone(good);
noProduct.product = "";
assert.equal(checkStoryboard(noProduct).ok, false);

const noDisclosure = structuredClone(good);
noDisclosure.disclosure = "";
assert.equal(checkStoryboard(noDisclosure).ok, false);

const noCta = structuredClone(good);
noCta.cta = "";
assert.equal(checkStoryboard(noCta).ok, false);

const noSource = structuredClone(good);
noSource.sources = [];
assert.equal(checkStoryboard(noSource).ok, false);

const risky = structuredClone(good);
risky.cta = "Cam kết 100% chữa bệnh.";
assert.equal(checkStoryboard(risky).ok, false);

console.log("short-video-storyboard selftest: ok");
