#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REQUIRED = [
  "name",
  "category",
  "price_usd",
  "commission_pct",
  "sales_30d",
  "competition_score",
  "content_gap_score",
  "new_account_signal",
  "source_url",
  "verified_at",
];

const WEIGHTS = {
  demand: 0.25,
  competition: 0.2,
  commission: 0.2,
  content_gap: 0.15,
  new_account: 0.1,
  economics: 0.1,
};

const DAY = 24 * 60 * 60 * 1000;

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function daysSince(dateString, now) {
  return Math.floor((now - Date.parse(dateString)) / DAY);
}

export function normalizeSales(sales30) {
  const n = Number(sales30);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 500) return 5;
  if (n >= 200) return 4;
  if (n >= 100) return 3;
  if (n >= 50) return 2;
  if (n >= 10) return 1;
  return 0.5;
}

export function normalizeCommission(percent) {
  const n = Number(percent);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 30) return 5;
  if (n >= 20) return 4;
  if (n >= 10) return 3;
  if (n >= 5) return 2;
  return 1;
}

export function normalizeEconomics(price, commissionPct) {
  const p = Number(price);
  const c = Number(commissionPct);
  if (!Number.isFinite(p) || p <= 0) return 0;
  if (c >= 20 && p >= 20) return 5;
  if (c >= 10 && p >= 20) return 4;
  if (c >= 10) return 3;
  if (c > 0) return 2;
  return 1;
}

export function validateCandidate(candidate, now = Date.now()) {
  const errors = [];
  const warnings = [];
  if (!candidate || typeof candidate !== "object") {
    return { errors: ["candidate phải là object"], warnings };
  }

  for (const key of REQUIRED) {
    const value = candidate[key];
    if (value === undefined || value === null || value === "") {
      errors.push(`thiếu ${key}`);
    }
  }

  if (candidate.name && String(candidate.name).trim().length < 3) {
    errors.push("name quá ngắn");
  }
  if (candidate.category && String(candidate.category).trim().length < 2) {
    errors.push("category quá ngắn");
  }

  for (const key of ["price_usd", "commission_pct", "sales_30d"]) {
    if (candidate[key] !== undefined) {
      const n = Number(candidate[key]);
      if (!Number.isFinite(n) || n < 0) errors.push(`${key} phải là số >= 0`);
    }
  }
  if (Number(candidate.price_usd) <= 0) errors.push("price_usd phải > 0");
  if (Number(candidate.commission_pct) > 100) {
    errors.push("commission_pct phải <= 100");
  }

  for (const key of [
    "competition_score",
    "content_gap_score",
    "new_account_signal",
    "demand_score",
    "commission_score",
    "economics_score",
  ]) {
    if (candidate[key] === undefined) continue;
    const n = Number(candidate[key]);
    if (!Number.isFinite(n) || n < 0 || n > 5) {
      errors.push(`${key} phải nằm trong 0..5`);
    }
  }

  if (candidate.source_url && !isHttpUrl(candidate.source_url)) {
    errors.push("source_url phải là URL http(s)");
  }

  if (candidate.verified_at) {
    const parsed = Date.parse(candidate.verified_at);
    if (!Number.isFinite(parsed)) {
      errors.push("verified_at không hợp lệ");
    } else {
      const days = daysSince(candidate.verified_at, now);
      if (days < -1) errors.push("verified_at ở tương lai");
      else if (days > 45) errors.push(`dữ liệu quá cũ (${days} ngày > 45)`);
      else if (days > 30) warnings.push(`dữ liệu ${days} ngày — nên kiểm tra lại`);
    }
  }

  return { errors, warnings };
}

export function scoreCandidate(candidate, now = Date.now()) {
  const { errors, warnings } = validateCandidate(candidate, now);
  if (errors.length > 0) {
    return { valid: false, candidate, errors, warnings, score: 0, score_100: 0 };
  }

  const demand = clampScore(
    candidate.demand_score ?? normalizeSales(candidate.sales_30d)
  );
  const competition = clampScore(candidate.competition_score);
  const commission = clampScore(
    candidate.commission_score ?? normalizeCommission(candidate.commission_pct)
  );
  const contentGap = clampScore(candidate.content_gap_score);
  const newAccount = clampScore(candidate.new_account_signal);
  const economics = clampScore(
    candidate.economics_score ??
      normalizeEconomics(candidate.price_usd, candidate.commission_pct)
  );

  const weighted =
    demand * WEIGHTS.demand +
    competition * WEIGHTS.competition +
    commission * WEIGHTS.commission +
    contentGap * WEIGHTS.content_gap +
    newAccount * WEIGHTS.new_account +
    economics * WEIGHTS.economics;

  const days = daysSince(candidate.verified_at, now);
  const confidence =
    days <= 30 && Number(candidate.sales_30d) >= 100
      ? "high"
      : days <= 45
        ? "medium"
        : "low";

  return {
    valid: true,
    candidate,
    errors: [],
    warnings,
    scores: {
      demand,
      competition,
      commission,
      content_gap: contentGap,
      new_account: newAccount,
      economics,
    },
    score: Number(weighted.toFixed(2)),
    score_100: Math.round(weighted * 20),
    confidence,
    age_days: days,
  };
}

export function scoreCandidates(candidates, now = Date.now()) {
  const results = candidates.map((candidate) => scoreCandidate(candidate, now));
  const valid = results
    .filter((r) => r.valid)
    .sort((a, b) => b.score_100 - a.score_100 || a.candidate.name.localeCompare(b.candidate.name));
  const invalid = results.filter((r) => !r.valid);
  return { valid, invalid };
}

function toMarkdown({ valid, invalid }) {
  const lines = ["# Affiliate Product Shortlist", ""];
  if (valid.length === 0) {
    lines.push("Không có sản phẩm hợp lệ — cần bổ sung dữ liệu/nguồn.");
  } else {
    lines.push("| # | Sản phẩm | Điểm | Nhu cầu | Cạnh tranh | Hoa hồng | Content gap | Kênh mới | Tin cậy | Nguồn |");
    lines.push("|---|---|---:|---:|---:|---:|---:|---:|---|---|");
    valid.slice(0, 3).forEach((row, index) => {
      const c = row.candidate;
      lines.push(
        `| ${index + 1} | ${c.name} | ${row.score_100} | ${row.scores.demand} | ${row.scores.competition} | ${row.scores.commission} | ${row.scores.content_gap} | ${row.scores.new_account} | ${row.confidence} | ${c.source_url} |`
      );
    });
    if (valid.length > 3) {
      lines.push("", `_Còn ${valid.length - 3} sản phẩm hợp lệ khác trong JSON._`);
    }
  }
  if (invalid.length > 0) {
    lines.push("", "## Bị loại", "");
    for (const row of invalid) {
      lines.push(`- ${row.candidate?.name ?? "(không tên)"}: ${row.errors.join("; ")}`);
    }
  }
  const warnings = valid.flatMap((row) =>
    row.warnings.map((warning) => `- ${row.candidate.name}: ${warning}`)
  );
  if (warnings.length > 0) {
    lines.push("", "## Cảnh báo", "", ...warnings);
  }
  return lines.join("\n") + "\n";
}

function parseArgs(argv) {
  const args = { file: null, out: null, markdown: null };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--out") args.out = argv[++i];
    else if (value === "--markdown") args.markdown = argv[++i];
    else if (!value.startsWith("--") && !args.file) args.file = value;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Usage: node scripts/score.mjs candidates.json [--out shortlist.json] [--markdown shortlist.md]");
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(args.file, "utf8"));
  const candidates = Array.isArray(raw) ? raw : raw.candidates;
  if (!Array.isArray(candidates)) {
    console.error("JSON phải là array hoặc object có .candidates");
    process.exit(2);
  }
  const result = scoreCandidates(candidates);
  const payload = {
    generated_at: new Date().toISOString(),
    valid: result.valid,
    invalid: result.invalid,
  };
  if (args.out) writeFileSync(args.out, JSON.stringify(payload, null, 2) + "\n");
  if (args.markdown) writeFileSync(args.markdown, toMarkdown(result));
  console.log(JSON.stringify({ valid: result.valid.length, invalid: result.invalid.length }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
