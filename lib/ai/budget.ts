import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiSettings, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class AiBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBudgetError";
  }
}

const DEFAULT_SETTINGS: Omit<AiSettings, "owner_id" | "created_at" | "updated_at"> = {
  monthly_budget_usd: 50,
  alert_threshold_pct: 80,
  hard_stop: true,
};

export function monthStartIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

export async function getAiSettings(
  client: Client,
  ownerId: string
): Promise<AiSettings> {
  const { data } = await client
    .from("ai_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  return (
    data ?? {
      owner_id: ownerId,
      ...DEFAULT_SETTINGS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
}

export async function getMonthlySpend(
  client: Client,
  ownerId: string,
  companyId?: string
): Promise<number> {
  let query = client
    .from("cost_ledger")
    .select("cost_usd")
    .eq("owner_id", ownerId)
    .gte("created_at", monthStartIso())
    .limit(5000);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { cost_usd: number | null }[];
  return rows.reduce((total, row) => total + Number(row.cost_usd ?? 0), 0);
}

export type BudgetContext = {
  settings: AiSettings;
  systemSpend: number;
  companySpend: number | null;
  companyBudget: number | null;
};

/** Kiểm tra hạn mức trước khi gọi model. Ném AiBudgetError khi chạm trần cứng. */
export async function assertAiBudget(
  client: Client,
  options: { ownerId: string; companyId?: string | null }
): Promise<BudgetContext> {
  const settings = await getAiSettings(client, options.ownerId);
  const systemSpend = await getMonthlySpend(client, options.ownerId);

  let companySpend: number | null = null;
  let companyBudget: number | null = null;

  if (options.companyId) {
    const { data: company } = await client
      .from("companies")
      .select("name, monthly_budget_usd")
      .eq("id", options.companyId)
      .maybeSingle();

    if (company) {
      companyBudget = Number(company.monthly_budget_usd);
      companySpend = await getMonthlySpend(
        client,
        options.ownerId,
        options.companyId
      );
    }
  }

  if (!settings.hard_stop) {
    return { settings, systemSpend, companySpend, companyBudget };
  }

  if (
    settings.monthly_budget_usd > 0 &&
    systemSpend >= settings.monthly_budget_usd
  ) {
    throw new AiBudgetError(
      `Đã chạm ngân sách tháng của hệ thống ($${systemSpend.toFixed(2)}/$${settings.monthly_budget_usd.toFixed(2)}). Tăng ngân sách trong mục Công ty AI hoặc tắt chặn cứng.`
    );
  }

  if (
    companyBudget !== null &&
    companySpend !== null &&
    companyBudget > 0 &&
    companySpend >= companyBudget
  ) {
    throw new AiBudgetError(
      `Công ty đã chạm ngân sách tháng ($${companySpend.toFixed(2)}/$${companyBudget.toFixed(2)}).`
    );
  }

  return { settings, systemSpend, companySpend, companyBudget };
}

export type AiUsageLog = {
  ownerId: string;
  companyId?: string | null;
  agentId?: string | null;
  taskId?: string | null;
  provider: string;
  model: string;
  purpose?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export async function logAiUsage(client: Client, usage: AiUsageLog) {
  const { error } = await client.from("cost_ledger").insert({
    owner_id: usage.ownerId,
    company_id: usage.companyId ?? null,
    agent_id: usage.agentId ?? null,
    task_id: usage.taskId ?? null,
    provider: usage.provider,
    model: usage.model,
    purpose: usage.purpose ?? null,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: usage.costUsd,
  });

  if (error) {
    console.error("[ai/budget] Không ghi được cost_ledger:", error.message);
  }
}
