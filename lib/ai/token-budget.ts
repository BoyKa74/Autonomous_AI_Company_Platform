import type { SupabaseClient } from "@supabase/supabase-js";
import { AiBudgetError } from "@/lib/ai/budget";
import type { AgentTask, AiAgent, Company, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const DEFAULT_COMPANY_DAILY = Number(process.env.AI_DAILY_TOKEN_LIMIT || 100_000);
const DEFAULT_AGENT_DAILY = Number(process.env.AI_AGENT_DAILY_TOKEN_LIMIT || 15_000);
const DEFAULT_TASK_BUDGET = Number(process.env.AI_TASK_TOKEN_LIMIT || 15_000);
const MAX_CALL_TOKENS = Number(process.env.AI_MAX_TOKENS_PER_CALL || 3000);
const MIN_CALL_TOKENS = 500;
export const MIN_TASK_TOKEN_BUDGET = 1500;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Ngày theo giờ Việt Nam (UTC+7), dùng để reset hạn mức token. */
export function tokenDayStartIso(): string {
  const now = new Date();
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const startUtc =
    Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) -
    VN_OFFSET_MS;
  return new Date(startUtc).toISOString();
}

export async function getTokensUsedToday(
  client: Client,
  options: {
    ownerId: string;
    companyId?: string | null;
    agentId?: string | null;
    since?: string | null;
  }
): Promise<number> {
  const dayStart = tokenDayStartIso();
  const since =
    options.since && new Date(options.since) > new Date(dayStart)
      ? options.since
      : dayStart;
  let query = client
    .from("cost_ledger")
    .select("input_tokens,output_tokens")
    .eq("owner_id", options.ownerId)
    .gte("created_at", since)
    .limit(10_000);

  if (options.companyId) query = query.eq("company_id", options.companyId);
  if (options.agentId) query = query.eq("agent_id", options.agentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (total, row) =>
      total + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0),
    0
  );
}

/** Token đã cấp cho các task còn mở — giữ chỗ để CEO không cấp trùng. */
export async function getReservedTokens(
  client: Client,
  options: {
    ownerId: string;
    companyId: string;
    agentId?: string | null;
    since?: string | null;
    excludeTaskId?: string | null;
  }
): Promise<number> {
  let query = client
    .from("agent_tasks")
    .select("id,token_budget,actual_tokens")
    .eq("owner_id", options.ownerId)
    .eq("company_id", options.companyId)
    .in("status", ["queued", "running", "manager_review", "review"])
    .limit(10_000);

  if (options.agentId) query = query.eq("agent_id", options.agentId);
  if (options.excludeTaskId) query = query.neq("id", options.excludeTaskId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (total, task) =>
      total +
      Math.max(0, Number(task.token_budget ?? 0) - Number(task.actual_tokens ?? 0)),
    0
  );
}

export type TokenBudgetContext = {
  companyUsed: number;
  companyReserved: number;
  companyBudget: number;
  companyRemaining: number;
  agentUsed: number;
  agentReserved: number;
  agentBudget: number;
  agentRemaining: number;
  taskBudget: number | null;
  taskUsed: number;
  taskRemaining: number | null;
};

export function companyDailyBudget(company: Pick<Company, "daily_token_budget">): number {
  return positive(Number(company.daily_token_budget), DEFAULT_COMPANY_DAILY);
}

export function agentDailyBudget(agent: Pick<AiAgent, "daily_token_budget">): number {
  return positive(Number(agent.daily_token_budget), DEFAULT_AGENT_DAILY);
}

export function taskTokenBudget(task: Pick<AgentTask, "token_budget"> | null): number {
  return positive(Number(task?.token_budget), DEFAULT_TASK_BUDGET);
}

export async function getCompanyTokenRemainingToday(
  client: Client,
  ownerId: string,
  company: Company
): Promise<{
  budget: number;
  used: number;
  reserved: number;
  remaining: number;
}> {
  const budget = companyDailyBudget(company);
  const used = await getTokensUsedToday(client, {
    ownerId,
    companyId: company.id,
    since: company.token_budget_started_at,
  });
  const reserved = await getReservedTokens(client, {
    ownerId,
    companyId: company.id,
    since: company.token_budget_started_at,
  });
  return {
    budget,
    used,
    reserved,
    remaining: Math.max(0, budget - used - reserved),
  };
}

export async function getAgentTokenRemainingToday(
  client: Client,
  ownerId: string,
  agent: AiAgent,
  since?: string | null
): Promise<{ budget: number; used: number; reserved: number; remaining: number }> {
  const budget = agentDailyBudget(agent);
  const used = await getTokensUsedToday(client, {
    ownerId,
    companyId: agent.company_id,
    agentId: agent.id,
    since,
  });
  const reserved = await getReservedTokens(client, {
    ownerId,
    companyId: agent.company_id,
    agentId: agent.id,
    since,
  });
  return {
    budget,
    used,
    reserved,
    remaining: Math.max(0, budget - used - reserved),
  };
}

/** Chặn trước khi gọi model: hạn mức công ty, hạn mức agent, budget task. */
export async function assertTokenBudget(
  client: Client,
  options: {
    ownerId: string;
    company: Company;
    agent: AiAgent;
    task?: AgentTask | null;
  }
): Promise<TokenBudgetContext> {
  const { ownerId, company, agent, task } = options;

  const companyBudget = companyDailyBudget(company);
  const agentBudget = agentDailyBudget(agent);
  const companyUsed = await getTokensUsedToday(client, {
    ownerId,
    companyId: company.id,
    since: company.token_budget_started_at,
  });
  const agentUsed = await getTokensUsedToday(client, {
    ownerId,
    companyId: company.id,
    agentId: agent.id,
    since: company.token_budget_started_at,
  });

  const companyReserved = await getReservedTokens(client, {
    ownerId,
    companyId: company.id,
    since: company.token_budget_started_at,
    excludeTaskId: task?.id,
  });
  const agentReserved = await getReservedTokens(client, {
    ownerId,
    companyId: company.id,
    agentId: agent.id,
    since: company.token_budget_started_at,
    excludeTaskId: task?.id,
  });

  const companyRemaining = Math.max(
    0,
    companyBudget - companyUsed - companyReserved
  );
  const agentRemaining = Math.max(
    0,
    agentBudget - agentUsed - agentReserved
  );

  const taskBudget = task ? taskTokenBudget(task) : null;
  const taskUsed = Number(task?.actual_tokens ?? 0);
  const taskRemaining =
    taskBudget === null ? null : Math.max(0, taskBudget - taskUsed);

  if (companyRemaining < MIN_CALL_TOKENS) {
    throw new AiBudgetError(
      `Công ty đã dùng ${companyUsed.toLocaleString("vi-VN")}/${companyBudget.toLocaleString(
        "vi-VN"
      )} token hôm nay — dừng để tiết kiệm.`
    );
  }

  if (agentRemaining < MIN_CALL_TOKENS) {
    throw new AiBudgetError(
      `AI "${agent.name}" đã dùng ${agentUsed.toLocaleString("vi-VN")}/${agentBudget.toLocaleString(
        "vi-VN"
      )} token hôm nay — dừng để tiết kiệm.`
    );
  }

  if (taskRemaining !== null && taskRemaining < MIN_CALL_TOKENS) {
    throw new AiBudgetError(
      `Task đã dùng ${taskUsed.toLocaleString("vi-VN")}/${taskBudget?.toLocaleString(
        "vi-VN"
      )} token — hết ngân sách được CEO cấp.`
    );
  }

  return {
    companyUsed,
    companyReserved,
    companyBudget,
    companyRemaining,
    agentUsed,
    agentReserved,
    agentBudget,
    agentRemaining,
    taskBudget,
    taskUsed,
    taskRemaining,
  };
}

export function estimatePromptTokens(system: string, user: string): number {
  return Math.ceil((system.length + user.length) / 4) + 200;
}

function remainingTokens(budget: TokenBudgetContext): number {
  return Math.min(
    budget.companyRemaining,
    budget.agentRemaining,
    budget.taskRemaining ?? Number.POSITIVE_INFINITY
  );
}

/** Giới hạn max_tokens của một lượt gọi theo budget còn lại. */
export function capMaxTokens(
  requested: number,
  budget: TokenBudgetContext
): number {
  return Math.max(
    0,
    Math.min(
      Math.max(1, requested),
      Math.max(0, remainingTokens(budget)),
      MAX_CALL_TOKENS
    )
  );
}

/** Giới hạn output sau khi trừ phần prompt ước tính — tránh vượt budget task. */
export function capMaxTokensForPrompt(
  requested: number,
  budget: TokenBudgetContext,
  system: string,
  user: string
): number {
  const available = remainingTokens(budget) - estimatePromptTokens(system, user);
  return Math.max(
    0,
    Math.min(Math.max(1, requested), Math.max(0, available), MAX_CALL_TOKENS)
  );
}

export function assertInputFits(
  budget: TokenBudgetContext,
  system: string,
  user: string
): void {
  const estimatedInput = estimatePromptTokens(system, user);
  const remaining = remainingTokens(budget);
  if (estimatedInput + MIN_CALL_TOKENS > remaining) {
    throw new AiBudgetError(
      `Prompt cần khoảng ${estimatedInput.toLocaleString(
        "vi-VN"
      )} token nhưng chỉ còn ${remaining.toLocaleString(
        "vi-VN"
      )} token — không gọi để tránh vượt ngân sách.`
    );
  }
}
