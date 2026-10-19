import type { ChatInput, ChatOutput, ProviderAdapter } from "@/lib/ai/types";

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs = 90_000
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `HTTP ${response.status} — ${body.slice(0, 300) || response.statusText}`
    );
  }

  return response.json();
}

export const openaiProvider: ProviderAdapter = {
  name: "openai",
  isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
  model: () => process.env.OPENAI_MODEL || "gpt-4o-mini",
  async chat({
    messages,
    system,
    temperature = 0.7,
    maxTokens = 4096,
    model: modelOverride,
  }: ChatInput): Promise<ChatOutput> {
    const model = modelOverride || this.model();
    const data = (await requestJson("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
        ],
      }),
    })) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI trả về kết quả rỗng");
    return {
      text,
      model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  },
};

export const anthropicProvider: ProviderAdapter = {
  name: "anthropic",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  model: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  async chat({
    messages,
    system,
    temperature = 0.7,
    maxTokens = 4096,
    model: modelOverride,
  }: ChatInput): Promise<ChatOutput> {
    const model = modelOverride || this.model();
    const data = (await requestJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages,
      }),
    })) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Anthropic trả về kết quả rỗng");
    return {
      text,
      model,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
    };
  },
};

export const googleProvider: ProviderAdapter = {
  name: "google",
  isConfigured: () =>
    Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
  model: () => process.env.GOOGLE_MODEL || "gemini-2.5-flash",
  async chat({
    messages,
    system,
    temperature = 0.7,
    maxTokens = 4096,
    model: modelOverride,
  }: ChatInput): Promise<ChatOutput> {
    const model = modelOverride || this.model();
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

    const data = (await requestJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    )) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Google trả về kết quả rỗng");
    return {
      text,
      model,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  },
};

export const openrouterProvider: ProviderAdapter = {
  name: "openrouter",
  isConfigured: () => Boolean(process.env.OPENROUTER_API_KEY),
  model: () => process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  async chat({
    messages,
    system,
    temperature = 0.7,
    maxTokens = 4096,
    model: modelOverride,
  }: ChatInput): Promise<ChatOutput> {
    const model = modelOverride || this.model();
    const data = (await requestJson("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "VIC Affiliate",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
        ],
      }),
    })) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenRouter trả về kết quả rỗng");
    return {
      text,
      model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  },
};
