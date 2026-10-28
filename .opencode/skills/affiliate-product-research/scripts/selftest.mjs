#!/usr/bin/env node
import assert from "node:assert/strict";
import { scoreCandidate, scoreCandidates, normalizeSales } from "./score.mjs";

const NOW = Date.parse("2026-10-28T00:00:00Z");
const base = {
  name: "Example SaaS A",
  category: "software",
  price_usd: 49,
  commission_pct: 30,
  sales_30d: 320,
  competition_score: 4,
  content_gap_score: 4,
  new_account_signal: 4,
  source_url: "https://vendor.example/program",
  verified_at: "2026-10-20",
};

const good = scoreCandidate(base, NOW);
assert.equal(good.valid, true);
assert.equal(good.confidence, "high");
assert.ok(good.score_100 > 50 && good.score_100 <= 100);

const missingSource = scoreCandidate({ ...base, source_url: "" }, NOW);
assert.equal(missingSource.valid, false);
assert.ok(missingSource.errors.some((e) => e.includes("source_url")));

const stale = scoreCandidate({ ...base, verified_at: "2026-01-01" }, NOW);
assert.equal(stale.valid, false);
assert.ok(stale.errors.some((e) => e.includes("quá cũ")));

const future = scoreCandidate({ ...base, verified_at: "2026-12-01" }, NOW);
assert.equal(future.valid, false);

const missingScore = scoreCandidate(
  { ...base, competition_score: undefined },
  NOW
);
assert.equal(missingScore.valid, false);

assert.equal(normalizeSales(500), 5);
assert.equal(normalizeSales(100), 3);
assert.equal(normalizeSales(10), 1);

const sorted = scoreCandidates(
  [
    { ...base, name: "Low", sales_30d: 30, competition_score: 2 },
    { ...base, name: "High", sales_30d: 600, competition_score: 5 },
  ],
  NOW
);
assert.equal(sorted.valid[0].candidate.name, "High");
assert.equal(sorted.invalid.length, 0);

console.log("affiliate-product-research selftest: ok");
