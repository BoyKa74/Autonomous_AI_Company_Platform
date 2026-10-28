#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DAY = 24 * 60 * 60 * 1000;

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function checkReview({ meta, draft, now = Date.now() }) {
  const errors = [];
  const warnings = [];
  const text = String(draft ?? "");
  const lower = text.toLowerCase();

  for (const key of ["title", "description", "keyword", "product", "affiliate_url", "sources", "verified_at"]) {
    if (!meta || meta[key] === undefined || meta[key] === null || meta[key] === "") {
      errors.push(`meta thiếu ${key}`);
    }
  }

  const title = String(meta?.title ?? "").trim();
  const description = String(meta?.description ?? "").trim();
  const keyword = String(meta?.keyword ?? "").trim().toLowerCase();
  const product = String(meta?.product ?? "").trim().toLowerCase();

  if (title.length > 60) errors.push(`title ${title.length} ký tự > 60`);
  if (title.length < 10) errors.push("title quá ngắn (< 10 ký tự)");
  if (description.length > 155) errors.push(`description ${description.length} ký tự > 155`);
  if (description.length < 50) errors.push("description quá ngắn (< 50 ký tự)");
  if (keyword && !title.toLowerCase().includes(keyword)) errors.push("keyword không có trong title");
  if (keyword && !description.toLowerCase().includes(keyword)) errors.push("keyword không có trong description");

  const first100 = text.split(/\s+/).slice(0, 100).join(" ").toLowerCase();
  if (keyword && !first100.includes(keyword)) errors.push("keyword không có trong 100 từ đầu");

  if (product && !lower.includes(product)) errors.push("tên sản phẩm không xuất hiện trong bài");

  if (!isHttpUrl(meta?.affiliate_url)) errors.push("affiliate_url không hợp lệ");
  else if (!text.includes(String(meta.affiliate_url))) errors.push("affiliate_url không có trong bài");

  const sources = Array.isArray(meta?.sources) ? meta.sources : [];
  const validSources = sources.filter(isHttpUrl);
  if (validSources.length < 2) errors.push("cần ít nhất 2 nguồn URL hợp lệ");
  if (validSources.length > 0) {
    const cited = validSources.some((url) => {
      try {
        const host = new URL(url).hostname;
        return text.includes(url) || lower.includes(host);
      } catch {
        return false;
      }
    });
    if (!cited) errors.push("không thấy nguồn nào được trích trong bài");
  }

  if (meta?.verified_at) {
    const parsed = Date.parse(meta.verified_at);
    if (!Number.isFinite(parsed)) errors.push("verified_at không hợp lệ");
    else {
      const days = Math.floor((now - parsed) / DAY);
      if (days < -1) errors.push("verified_at ở tương lai");
      else if (days > 45) errors.push(`dữ liệu quá cũ (${days} ngày > 45)`);
      else if (days > 30) warnings.push(`dữ liệu ${days} ngày — nên kiểm tra lại`);
    }
  }

  if (
    !/(affiliate disclosure|disclosure|liên kết tiếp thị|liên kết affiliate|hoa hồng|commission)/i.test(
      text
    )
  ) {
    errors.push("thiếu affiliate disclosure");
  }

  if (!/(mua ngay|đăng ký|dùng thử|bắt đầu|truy cập|click|sign up|try|buy|visit|start)/i.test(text)) {
    errors.push("thiếu CTA");
  }

  if (/\bTODO\b|lorem ipsum|\{\{[^}]+\}\}/i.test(text)) {
    errors.push("còn placeholder/TODO/lorem ipsum");
  }

  const words = wordCount(text);
  if (words < 300) errors.push(`bài quá ngắn (${words} từ < 300)`);
  else if (words < 700) warnings.push(`bài ${words} từ — khuyến nghị 700–1500`);
  if (words > 1800) warnings.push(`bài ${words} từ — dài hơn khuyến nghị`);

  const risky = text.match(
    /(chữa bệnh|chữa khỏi|điều trị|giảm cân|cam kết 100%|lợi nhuận đảm bảo|thu nhập đảm bảo|an toàn tuyệt đối)/i
  );
  if (risky) errors.push(`claim rủi ro: "${risky[0]}"`);

  const superlatives = text.match(
    /(tốt nhất|số 1|number one|best|rẻ nhất|mạnh nhất)/gi
  );
  if (superlatives) {
    warnings.push(`claim tuyệt đối cần bằng chứng: ${[...new Set(superlatives.map((s) => s.toLowerCase()))].join(", ")}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      title_length: title.length,
      description_length: description.length,
      words,
      sources: validSources.length,
      keyword,
      product: meta?.product ?? null,
    },
  };
}

function parseArgs(argv) {
  const args = { draft: null, meta: null };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--meta") args.meta = argv[++i];
    else if (!value.startsWith("--") && !args.draft) args.draft = value;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.draft || !args.meta) {
    console.error("Usage: node scripts/check.mjs draft.md --meta meta.json");
    process.exit(2);
  }
  const meta = JSON.parse(readFileSync(args.meta, "utf8"));
  const draft = readFileSync(args.draft, "utf8");
  const result = checkReview({ meta, draft });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
