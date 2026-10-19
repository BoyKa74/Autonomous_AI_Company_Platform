import {
  anthropicProvider,
  googleProvider,
  openaiProvider,
  openrouterProvider,
} from "@/lib/ai/providers";
import { computeCostUsd } from "@/lib/ai/pricing";
import type {
  AiProviderName,
  AiTask,
  FailedAttempt,
  GenerateInput,
  GenerateResult,
  ProviderAdapter,
} from "@/lib/ai/types";

export const PROVIDERS: Record<AiProviderName, ProviderAdapter> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  openrouter: openrouterProvider,
};

export const PROVIDER_LABELS: Record<AiProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  openrouter: "OpenRouter",
};

export const TASK_LABELS: Record<AiTask, string> = {
  script: "Kịch bản video",
  book: "Viết sách",
  caption: "Caption & hashtag",
  strategy: "Chiến lược kênh",
  general: "Trợ lý chung",
};

/** Provider mạnh nhất cho từng loại việc — router thử lần lượt theo thứ tự này. */
const TASK_PREFERENCE: Record<AiTask, AiProviderName[]> = {
  script: ["anthropic", "openai", "google", "openrouter"],
  book: ["anthropic", "openai", "google", "openrouter"],
  caption: ["google", "openai", "openrouter", "anthropic"],
  strategy: ["openai", "anthropic", "google", "openrouter"],
  general: ["openai", "anthropic", "google", "openrouter"],
};

export const ALL_PROVIDERS: AiProviderName[] = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
];

function envOrder(): AiProviderName[] {
  const raw = process.env.AI_PROVIDER_ORDER;
  if (!raw) return ALL_PROVIDERS;
  const parsed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AiProviderName =>
      (ALL_PROVIDERS as string[]).includes(item)
    );
  return parsed.length > 0 ? parsed : ALL_PROVIDERS;
}

function resolveOrder(task: AiTask, explicit?: AiProviderName): AiProviderName[] {
  if (explicit) return [explicit];
  const preferred = TASK_PREFERENCE[task];
  const merged = [...preferred, ...envOrder()];
  return [...new Set(merged)];
}

export class AiRouterError extends Error {
  failedAttempts: FailedAttempt[];

  constructor(message: string, failedAttempts: FailedAttempt[]) {
    super(message);
    this.name = "AiRouterError";
    this.failedAttempts = failedAttempts;
  }
}

export function listProviderStatus() {
  return ALL_PROVIDERS.map((name) => ({
    name,
    label: PROVIDER_LABELS[name],
    configured: PROVIDERS[name].isConfigured(),
    model: PROVIDERS[name].model(),
  }));
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const task = input.task ?? "general";
  const order = resolveOrder(task, input.provider);
  const configured = order.filter((name) => PROVIDERS[name].isConfigured());

  if (configured.length === 0) {
    throw new AiRouterError(
      "Chưa cấu hình AI provider nào. Thêm OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY hoặc OPENROUTER_API_KEY vào .env.local.",
      []
    );
  }

  const failedAttempts: FailedAttempt[] = [];

  for (const name of configured) {
    try {
      const { text, model, usage } = await PROVIDERS[name].chat(input);
      const { costUsd, priced } = computeCostUsd(
        model,
        usage.inputTokens,
        usage.outputTokens,
        name
      );
      return {
        text,
        provider: name,
        model,
        task,
        usage,
        costUsd,
        priced,
        failedAttempts,
      };
    } catch (error) {
      failedAttempts.push({
        provider: name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = failedAttempts
    .map((attempt) => `${attempt.provider}: ${attempt.error}`)
    .join(" | ");
  throw new AiRouterError(`Tất cả provider đều lỗi. ${summary}`, failedAttempts);
}
