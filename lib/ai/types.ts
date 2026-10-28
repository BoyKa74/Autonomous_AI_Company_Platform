export type AiProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "opencode"
  | "openrouter";

export type AiTask = "script" | "book" | "caption" | "strategy" | "general";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatInput = {
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ghi đè model của provider (lấy từ cấu hình agent) */
  model?: string;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ChatOutput = {
  text: string;
  model: string;
  usage: TokenUsage;
};

export interface ProviderAdapter {
  name: AiProviderName;
  isConfigured(): boolean;
  model(): string;
  chat(input: ChatInput): Promise<ChatOutput>;
}

export type GenerateInput = ChatInput & {
  task?: AiTask;
  provider?: AiProviderName;
};

export type FailedAttempt = {
  provider: AiProviderName;
  error: string;
};

export type GenerateResult = {
  text: string;
  provider: AiProviderName;
  model: string;
  task: AiTask;
  usage: TokenUsage;
  costUsd: number;
  priced: boolean;
  failedAttempts: FailedAttempt[];
};
