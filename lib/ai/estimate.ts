import { estimateCostUsd } from "@/lib/ai/pricing";
import type { AiProviderName } from "@/lib/ai/types";
import type { AiAgent } from "@/types/database";

export type TaskEstimate = {
  inputTokens: number;
  outputTokens: number;
  estimateUsd: number;
  priced: boolean;
};

/**
 * AI Planner giai đoạn 1: ước tính token/chi phí bằng heuristic.
 * input ≈ (độ dài brief + system prompt)/4 + 200
 * output ≈ 40% trần token của agent (dự phòng review/retry)
 */
export function estimateTaskCost(
  agent: Pick<AiAgent, "system_prompt" | "max_tokens_per_run" | "provider" | "model">,
  brief: string,
  modelFallback: string
): TaskEstimate {
  const inputTokens =
    Math.ceil((brief.length + (agent.system_prompt?.length ?? 0)) / 4) + 200;
  const outputTokens = Math.max(
    500,
    Math.round(agent.max_tokens_per_run * 0.4)
  );

  const model = agent.model || modelFallback;
  const { estimateUsd, priced } = estimateCostUsd(
    model,
    inputTokens,
    outputTokens,
    (agent.provider as AiProviderName | null) ?? undefined
  );

  return { inputTokens, outputTokens, estimateUsd, priced };
}
