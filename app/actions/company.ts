"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  agentSchema,
  agentSettingsSchema,
  agentTaskSchema,
  aiSettingsSchema,
  companySchema,
  companyUpdateSchema,
} from "@/lib/validators";
import { COMPANY_TEMPLATES } from "@/lib/company-templates";
import { isFreeOpencodeModel } from "@/lib/ai/free-models";
import { PROVIDERS } from "@/lib/ai/router";
import { estimateTaskCost } from "@/lib/ai/estimate";
import { AiBudgetError, assertAiBudget, logAiUsage } from "@/lib/ai/budget";
import {
  assertInputFits,
  assertTokenBudget,
  capMaxTokensForPrompt,
} from "@/lib/ai/token-budget";
import { generate } from "@/lib/ai/router";
import { settleTaskOutcome } from "@/lib/task-settlement";
import { workflowForAgent } from "@/lib/workflows";
import type { AiProviderName } from "@/lib/ai/types";
import type { FormState } from "@/lib/action-state";
import type { Company, Json } from "@/types/database";


function workflowJson(
  role: "ceo" | "manager" | "specialist" | "worker" | "super_admin",
  title: string | null,
  name: string
): Json {
  return workflowForAgent({ role, title, name }) as unknown as Json;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

function defaultDailyTokenBudget(role: string): number {
  if (role === "ceo") return 100000;
  if (role === "manager") return 20000;
  if (role === "worker") return 5000;
  return 15000;
}

/* ---------- Công ty ---------- */

export async function createCompany(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    vertical: formData.get("vertical"),
    mission: formData.get("mission") ?? undefined,
    monthly_budget_usd: formData.get("monthly_budget_usd") || 15,
    daily_token_budget: formData.get("daily_token_budget") || 100000,
    autonomy_level: formData.get("autonomy_level") || 1,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...parsed.data, owner_id: me.id, status: "active" })
    .select("id")
    .single();

  if (error) return { status: "error", message: error.message };

  revalidatePath("/company");
  redirect(`/company/${data.id}`);
}

export async function updateCompany(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();

  const parsed = companyUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    autonomy_level: formData.get("autonomy_level") || 1,
    monthly_budget_usd: formData.get("monthly_budget_usd") || 15,
    daily_token_budget: formData.get("daily_token_budget") || 100000,
    mission: formData.get("mission") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const { id, ...updates } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/company");
  revalidatePath(`/company/${id}`);
  return { status: "success", message: "Đã lưu cấu hình công ty." };
}

export async function installTemplate(formData: FormData) {
  await requireUser();
  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) return;

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return;

  const { count } = await supabase
    .from("ai_agents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if ((count ?? 0) > 0) return;

  const template =
    COMPANY_TEMPLATES[company.vertical as keyof typeof COMPANY_TEMPLATES];
  if (!template) return;

  const { data: ceo } = await supabase
    .from("ai_agents")
    .insert({
      company_id: companyId,
      name: template.ceo.name,
      role: template.ceo.role,
      title: template.ceo.title,
      system_prompt: template.ceo.systemPrompt,
      max_tokens_per_run: template.ceo.maxTokensPerRun ?? 4000,
      daily_token_budget: 100000,
      workflow: workflowJson(
        template.ceo.role,
        template.ceo.title,
        template.ceo.name
      ),
    })
    .select("id")
    .single();

  for (const department of template.departments) {
    const { data: manager } = await supabase
      .from("ai_agents")
      .insert({
        company_id: companyId,
        parent_id: ceo?.id ?? null,
        name: department.manager.name,
        role: department.manager.role,
        title: department.manager.title,
        system_prompt: department.manager.systemPrompt,
        max_tokens_per_run: department.manager.maxTokensPerRun ?? 4000,
        daily_token_budget: 20000,
        workflow: workflowJson(
          department.manager.role,
          department.manager.title,
          department.manager.name
        ),
      })
      .select("id")
      .single();

    for (const worker of department.workers) {
      await supabase.from("ai_agents").insert({
        company_id: companyId,
        parent_id: manager?.id ?? null,
        name: worker.name,
        role: worker.role,
        title: worker.title,
        system_prompt: worker.systemPrompt,
        max_tokens_per_run: worker.maxTokensPerRun ?? 4000,
        daily_token_budget: defaultDailyTokenBudget(worker.role),
        workflow: workflowJson(worker.role, worker.title, worker.name),
      });
    }
  }

  revalidatePath(`/company/${companyId}`);
}

/* ---------- Agent ---------- */

export async function addAgent(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();

  const parsed = agentSchema.safeParse({
    company_id: formData.get("company_id"),
    name: formData.get("name"),
    role: formData.get("role"),
    parent_id: formData.get("parent_id") ?? undefined,
    title: formData.get("title") ?? undefined,
    system_prompt: formData.get("system_prompt") ?? undefined,
    provider: formData.get("provider") ?? undefined,
    model: formData.get("model") ?? undefined,
    max_tokens_per_run: formData.get("max_tokens_per_run") || 4000,
    daily_token_budget: formData.get("daily_token_budget") || 15000,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  if (
    parsed.data.model &&
    process.env.AI_FREE_ONLY === "1" &&
    !isFreeOpencodeModel(parsed.data.model)
  ) {
    return {
      status: "error",
      message: "Chỉ được dùng model free trong danh sách OpenCode Zen.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ai_agents").insert({
    ...parsed.data,
    provider: parsed.data.model ? null : parsed.data.provider,
    daily_token_budget:
      parsed.data.daily_token_budget || defaultDailyTokenBudget(parsed.data.role),
    workflow: workflowJson(
      parsed.data.role,
      parsed.data.title,
      parsed.data.name
    ),
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath(`/company/${parsed.data.company_id}`);
  return { status: "success", message: `Đã thêm agent "${parsed.data.name}".` };
}

export async function updateAgentBudget(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  const budget = Math.round(Number(formData.get("daily_token_budget")));
  const model = String(formData.get("model") ?? "").trim() || null;
  if (!id || !Number.isFinite(budget) || budget < 500) return;
  if (
    model &&
    process.env.AI_FREE_ONLY === "1" &&
    !isFreeOpencodeModel(model)
  ) {
    throw new Error("Chỉ được dùng model free trong danh sách OpenCode Zen.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_agents")
    .update({
      daily_token_budget: Math.min(200_000, budget),
      model,
      provider: model ? null : undefined,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/company/${companyId}`);
}

export async function updateAgentSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();

  let workflow: unknown;
  try {
    workflow = JSON.parse(String(formData.get("workflow") ?? "[]"));
  } catch {
    return { status: "error", message: "Quy trình AI không hợp lệ." };
  }

  const parsed = agentSettingsSchema.safeParse({
    id: formData.get("id"),
    company_id: formData.get("company_id"),
    system_prompt: formData.get("system_prompt") ?? undefined,
    workflow,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .update({
      system_prompt: parsed.data.system_prompt,
      workflow: parsed.data.workflow as unknown as Json,
    })
    .eq("id", parsed.data.id)
    .eq("company_id", parsed.data.company_id)
    .select("id")
    .maybeSingle();

  if (error) return { status: "error", message: error.message };
  if (!data) return { status: "error", message: "Không tìm thấy AI." };

  revalidatePath(`/company/${parsed.data.company_id}`);
  return { status: "success", message: "Đã lưu cấu hình AI." };
}

export async function removeAgent(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("ai_agents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/company/${companyId}`);
}

/* ---------- Nhiệm vụ ---------- */

export async function createTask(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = agentTaskSchema.safeParse({
    company_id: formData.get("company_id"),
    channel_id: formData.get("channel_id") ?? undefined,
    agent_id: formData.get("agent_id"),
    title: formData.get("title"),
    brief: formData.get("brief"),
    requires_approval: formData.get("requires_approval") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", parsed.data.agent_id)
    .maybeSingle();

  if (!agent) {
    return { status: "error", message: "Không tìm thấy agent." };
  }

  if (parsed.data.channel_id) {
    const { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("id", parsed.data.channel_id)
      .maybeSingle();
    if (!channel) {
      return { status: "error", message: "Kênh không hợp lệ." };
    }
  }

  const defaultModel = agent.provider
    ? PROVIDERS[agent.provider as AiProviderName]?.model() ?? "gpt-4o-mini"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";

  const estimate = estimateTaskCost(agent, parsed.data.brief, defaultModel);

  const { error } = await supabase.from("agent_tasks").insert({
    owner_id: me.id,
    company_id: parsed.data.company_id,
    channel_id: parsed.data.channel_id,
    agent_id: parsed.data.agent_id,
    title: parsed.data.title,
    brief: parsed.data.brief,
    requires_approval: parsed.data.requires_approval,
    estimate_usd: estimate.estimateUsd,
    estimate_tokens: estimate.inputTokens + estimate.outputTokens,
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath(`/company/${parsed.data.company_id}`);
  return {
    status: "success",
    message: `Đã tạo nhiệm vụ. Dự toán ~$${estimate.estimateUsd.toFixed(4)}${
      estimate.priced ? "" : " (model chưa có bảng giá)"
    }.`,
  };
}

function companyContext(company: Company): string {
  return `\n\n[NGỮ CẢNH TẬP ĐOÀN]\nCông ty: ${company.name}\nNgành: ${company.vertical}\nSứ mệnh: ${company.mission ?? "—"}\nCấp tự chủ: ${company.autonomy_level}/3 (mọi đầu ra cần con người duyệt trước khi phát hành).`;
}

export async function runTask(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!task || !["queued", "failed", "rejected"].includes(task.status)) return;

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", task.company_id)
    .maybeSingle();
  if (!company) return;

  const { data: agent } = task.agent_id
    ? await supabase.from("ai_agents").select("*").eq("id", task.agent_id).maybeSingle()
    : { data: null };

  await supabase
    .from("agent_tasks")
    .update({ status: "running", error: null })
    .eq("id", task.id);

  try {
    if (!agent) throw new Error("Nhiệm vụ chưa gán agent.");
    if (agent.status !== "active") {
      throw new Error(`Agent "${agent.name}" đang tạm dừng.`);
    }

    await assertAiBudget(supabase, {
      ownerId: me.id,
      companyId: task.company_id,
    });
    const tokenBudget = await assertTokenBudget(supabase, {
      ownerId: me.id,
      company,
      agent,
      task,
    });

    const system = `${agent.system_prompt ?? "Bạn là nhân viên AI."}${companyContext(company)}`;
    const userContent = task.brief ?? task.title;
    assertInputFits(tokenBudget, system, userContent);

    const result = await generate({
      task: "general",
      provider: (agent.provider as AiProviderName | null) ?? undefined,
      model: agent.model ?? undefined,
      system,
      maxTokens: capMaxTokensForPrompt(
        agent.max_tokens_per_run,
        tokenBudget,
        system,
        userContent
      ),
      messages: [{ role: "user", content: userContent }],
    });

    await logAiUsage(supabase, {
      ownerId: me.id,
      companyId: task.company_id,
      agentId: agent.id,
      taskId: task.id,
      provider: result.provider,
      model: result.model,
      purpose: `agent:${agent.role}`,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.costUsd,
    });

    const totalTokens = result.usage.inputTokens + result.usage.outputTokens;

    await supabase
      .from("agent_tasks")
      .update({
        status: task.requires_approval ? "review" : "approved",
        result: result.text,
        actual_usd: result.costUsd,
        actual_tokens: task.actual_tokens + totalTokens,
        error: result.priced
          ? null
          : "Model chưa có trong bảng giá — chi phí hiển thị 0.",
      })
      .eq("id", task.id);

    if (!task.requires_approval) {
      await settleTaskOutcome(supabase, {
        task,
        ownerId: me.id,
        outcome: "approved",
      });
    }
  } catch (error) {
    const message =
      error instanceof AiBudgetError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    await supabase
      .from("agent_tasks")
      .update({
        status: error instanceof AiBudgetError ? "review" : "failed",
        error: message.slice(0, 900),
      })
      .eq("id", task.id);
  }

  revalidatePath(`/company/${task.company_id}`);
  revalidatePath("/company");
}

export async function approveTask(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", id)
    .eq("status", "review")
    .maybeSingle();
  if (!task) return;

  await settleTaskOutcome(supabase, {
    task,
    ownerId: me.id,
    outcome: "approved",
  });

  revalidatePath(`/company/${companyId}`);
  revalidatePath("/company");
}

export async function rejectTask(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", id)
    .eq("status", "review")
    .maybeSingle();
  if (!task) return;

  await settleTaskOutcome(supabase, {
    task,
    ownerId: me.id,
    outcome: "rejected",
  });

  revalidatePath(`/company/${companyId}`);
  revalidatePath("/company");
}

/* ---------- Ngân sách ---------- */

export async function updateAiSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = aiSettingsSchema.safeParse({
    monthly_budget_usd: formData.get("monthly_budget_usd"),
    alert_threshold_pct: formData.get("alert_threshold_pct") || 80,
    hard_stop: formData.get("hard_stop") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_settings")
    .upsert({ owner_id: me.id, ...parsed.data }, { onConflict: "owner_id" });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/company");
  return { status: "success", message: "Đã cập nhật ngân sách." };
}

export async function markTaskPublished(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("agent_tasks")
    .update({ published_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/company");
}
