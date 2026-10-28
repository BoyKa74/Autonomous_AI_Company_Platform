import {
  anthropicProvider,
  googleProvider,
  groqProvider,
  openaiProvider,
  opencodeProvider,
  openrouterProvider,
} from "@/lib/ai/providers";
import { isFreeOpencodeModel } from "@/lib/ai/free-models";
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
  groq: groqProvider,
  opencode: opencodeProvider,
  openrouter: openrouterProvider,
};

export const PROVIDER_LABELS: Record<AiProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  groq: "Groq",
  opencode: "OpenCode Go",
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
  script: ["anthropic", "openai", "google", "groq", "opencode", "openrouter"],
  book: ["anthropic", "openai", "google", "groq", "opencode", "openrouter"],
  caption: ["google", "groq", "openai", "openrouter", "anthropic"],
  strategy: ["openai", "anthropic", "google", "groq", "opencode", "openrouter"],
  general: ["openai", "anthropic", "google", "groq", "opencode", "openrouter"],
};

export const ALL_PROVIDERS: AiProviderName[] = [
  "openai",
  "anthropic",
  "google",
  "groq",
  "opencode",
  "openrouter",
];

/** Chỉ các provider có gói free (hoặc model free) mới được dùng khi AI_FREE_ONLY=1. */
const FREE_PROVIDERS = new Set<AiProviderName>([
  "opencode",
  "google",
  "groq",
  "openrouter",
]);

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
  const freeOnly = process.env.AI_FREE_ONLY === "1";
  const merged = explicit
    ? [explicit]
    : freeOnly
      ? [...envOrder(), ...TASK_PREFERENCE[task]]
      : [...TASK_PREFERENCE[task], ...envOrder()];
  const order = [...new Set(merged)];
  return freeOnly
    ? order.filter((name) => FREE_PROVIDERS.has(name))
    : order;
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
      process.env.AI_FREE_ONLY === "1"
        ? "Chưa cấu hình provider miễn phí nào. Thêm GOOGLE_API_KEY hoặc GROQ_API_KEY vào .env.local (AI_FREE_ONLY=1 đang bật)."
        : "Chưa cấu hình AI provider nào. Thêm OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY hoặc OPENROUTER_API_KEY vào .env.local.",
      []
    );
  }

  const failedAttempts: FailedAttempt[] = [];

  for (const name of configured) {
    try {
      const modelOverride = input.provider
        ? name === input.provider
          ? input.model
          : undefined
        : name === "opencode" &&
            input.model &&
            isFreeOpencodeModel(input.model)
          ? input.model
          : undefined;
      const providerInput = { ...input, model: modelOverride };
      const { text, model, usage } =
        await PROVIDERS[name].chat(providerInput);
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
