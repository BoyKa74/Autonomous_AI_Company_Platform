import type { AiProviderName } from "@/lib/ai/types";

export type ModelPrice = {
  /** USD / 1M input tokens */
  input: number;
  /** USD / 1M output tokens */
  output: number;
};

/**
 * Bảng giá tham khảo (USD / 1M token). Đây là ước tính để enforce ngân sách,
 * không phải bảng giá chính thức — chỉnh bằng biến môi trường
 * AI_PRICE_OVERRIDES='{"model-x":{"input":1,"output":2}}' khi nhà cung cấp đổi giá.
 */
const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

function envOverrides(): Record<string, ModelPrice> {
  const raw = process.env.AI_PRICE_OVERRIDES;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ModelPrice>;
    return parsed ?? {};
  } catch {
    console.error("[ai/pricing] AI_PRICE_OVERRIDES không phải JSON hợp lệ");
    return {};
  }
}

export function getModelPrice(model: string, provider?: AiProviderName): ModelPrice | null {
  const overrides = envOverrides();
  const normalized = model.toLowerCase();

  if (overrides[model]) return overrides[model];
  if (DEFAULT_PRICES[normalized]) return DEFAULT_PRICES[normalized];

  const frontendName = normalized.includes("/")
    ? normalized.split("/").pop()!
    : normalized;
  for (const key of Object.keys({ ...DEFAULT_PRICES, ...overrides })) {
    if (normalized.startsWith(key) || frontendName.startsWith(key)) {
      return overrides[key] ?? DEFAULT_PRICES[key] ?? null;
    }
  }

  if (provider === "openrouter") {
    return DEFAULT_PRICES["gpt-4o-mini"];
  }

  return null;
}

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  provider?: AiProviderName
): { costUsd: number; priced: boolean } {
  const price = getModelPrice(model, provider);
  if (!price) return { costUsd: 0, priced: false };
  const cost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  return { costUsd: Number(cost.toFixed(6)), priced: true };
}

/** Ước tính chi phí trước khi chạy — dùng cho AI Planner giai đoạn 1 */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  provider?: AiProviderName
): { estimateUsd: number; priced: boolean } {
  const { costUsd, priced } = computeCostUsd(
    model,
    inputTokens,
    outputTokens,
    provider
  );
  return { estimateUsd: costUsd, priced };
}
