"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  agentSchema,
  agentTaskSchema,
  aiSettingsSchema,
  companySchema,
  companyUpdateSchema,
} from "@/lib/validators";
import { COMPANY_TEMPLATES } from "@/lib/company-templates";
import { PROVIDERS } from "@/lib/ai/router";
import { estimateTaskCost } from "@/lib/ai/estimate";
import { AiBudgetError, assertAiBudget, logAiUsage } from "@/lib/ai/budget";
import { generate } from "@/lib/ai/router";
import type { AiProviderName } from "@/lib/ai/types";
import type { FormState } from "@/lib/action-state";
import type { Company } from "@/types/database";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
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
    max_tokens_per_run: formData.get("max_tokens_per_run") || 4000,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ai_agents").insert(parsed.data);
  if (error) return { status: "error", message: error.message };

  revalidatePath(`/company/${parsed.data.company_id}`);
  return { status: "success", message: `Đã thêm agent "${parsed.data.name}".` };
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

  const defaultModel = agent.provider
    ? PROVIDERS[agent.provider as AiProviderName]?.model() ?? "gpt-4o-mini"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";

  const estimate = estimateTaskCost(agent, parsed.data.brief, defaultModel);

  const { error } = await supabase.from("agent_tasks").insert({
    owner_id: me.id,
    company_id: parsed.data.company_id,
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

    const system = `${agent.system_prompt ?? "Bạn là nhân viên AI."}${companyContext(company)}`;

    const result = await generate({
      task: "general",
      provider: (agent.provider as AiProviderName | null) ?? undefined,
      model: agent.model ?? undefined,
      system,
      maxTokens: agent.max_tokens_per_run,
      messages: [{ role: "user", content: task.brief ?? task.title }],
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
        actual_tokens: totalTokens,
        error: result.priced
          ? null
          : "Model chưa có trong bảng giá — chi phí hiển thị 0.",
      })
      .eq("id", task.id);
  } catch (error) {
    const message =
      error instanceof AiBudgetError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    await supabase
      .from("agent_tasks")
      .update({ status: "failed", error: message.slice(0, 900) })
      .eq("id", task.id);
  }

  revalidatePath(`/company/${task.company_id}`);
  revalidatePath("/company");
}

export async function approveTask(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("agent_tasks")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "review");

  revalidatePath(`/company/${companyId}`);
}

export async function rejectTask(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("agent_tasks")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "review");

  revalidatePath(`/company/${companyId}`);
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
