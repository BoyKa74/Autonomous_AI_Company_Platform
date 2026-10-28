"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { generate, PROVIDERS } from "@/lib/ai/router";
import { AiBudgetError, assertAiBudget, logAiUsage } from "@/lib/ai/budget";
import { settleTaskOutcome } from "@/lib/task-settlement";
import { buildKnowledgeContext } from "@/lib/knowledge";
import { getMonthlySpend } from "@/lib/ai/budget";
import { estimateTaskCost } from "@/lib/ai/estimate";
import {
  MIN_TASK_TOKEN_BUDGET,
  assertInputFits,
  assertTokenBudget,
  capMaxTokensForPrompt,
  getAgentTokenRemainingToday,
} from "@/lib/ai/token-budget";
import {
  combineStepOutputs,
  initialStepStates,
  nextPendingStep,
  parseStepStates,
  stepsForAgent,
  type WorkflowStepState,
} from "@/lib/workflows";
import type { AiProviderName } from "@/lib/ai/types";
import type { AgentTask, Channel, Company, Json } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function companyContext(company: Company): string {
  return `\n\n[NGỮ CẢNH TẬP ĐOÀN]\nCông ty: ${company.name}\nNgành: ${company.vertical}\nSứ mệnh: ${company.mission ?? "—"}\nCấp tự chủ: ${company.autonomy_level}/3 — mọi đầu ra vẫn cần con người duyệt trước khi phát hành.`;
}


type ManagerVerdict = { verdict: "approve" | "changes"; notes: string };

const MAX_REVIEW_ROUNDS = Number(process.env.AI_MAX_REVIEW_ROUNDS || 1);

function parseManagerVerdict(text: string): ManagerVerdict | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const raw = String(parsed.verdict ?? parsed.decision ?? "").toLowerCase();
    const notes = String(parsed.notes ?? parsed.feedback ?? "").trim();
    if (!notes) return null;
    if (/(change|reject|sửa|sua|fail)/.test(raw)) {
      return { verdict: "changes", notes };
    }
    if (/(approve|approved|pass|ok|đồng ý|dong y|đạt|dat)/.test(raw)) {
      return { verdict: "approve", notes };
    }
    return null;
  } catch {
    return null;
  }
}

/** Quản lý trực tiếp (parent) kiểm duyệt kết quả của nhân viên. */
async function runManagerReview(
  supabase: SupabaseServerClient,
  options: { ownerId: string; task: AgentTask; company: Company }
): Promise<{ ran: boolean; message: string }> {
  const { ownerId, task, company } = options;
  if (!task.agent_id) return { ran: false, message: "Task chưa gán AI." };

  const { data: worker } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", task.agent_id)
    .maybeSingle();
  if (!worker) return { ran: false, message: "Không tìm thấy AI thực hiện." };

  if (!worker.parent_id) {
    await supabase
      .from("agent_tasks")
      .update({ status: "review" })
      .eq("id", task.id);
    return { ran: false, message: "AI không có quản lý — chuyển bạn duyệt." };
  }

  const { data: manager } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", worker.parent_id)
    .maybeSingle();

  const { data: channel } = task.channel_id
    ? await supabase
        .from("channels")
        .select("*")
        .eq("id", task.channel_id)
        .maybeSingle()
    : { data: null };

  if (!manager || manager.status !== "active") {
    await supabase
      .from("agent_tasks")
      .update({ status: "review" })
      .eq("id", task.id);
    return {
      ran: false,
      message: "Quản lý không hoạt động — chuyển bạn duyệt.",
    };
  }

  try {
    await assertAiBudget(supabase, { ownerId, companyId: task.company_id });
    const tokenBudget = await assertTokenBudget(supabase, {
      ownerId,
      company,
      agent: manager,
      task,
    });
    const knowledge = await buildKnowledgeContext(
      supabase,
      ownerId,
      task.company_id
    );

    const system = `${manager.system_prompt ?? "Bạn là quản lý."}${companyContext(
      company
    )}${channelContext(channel)}${knowledge}

[KIỂM DUYỆT CỦA QUẢN LÝ]
Bạn là quản lý trực tiếp của "${worker.name}". Hãy kiểm tra kết quả công việc dưới đây theo tiêu chí: đúng yêu cầu, chất lượng, rõ ràng, có thể dùng ngay.
Chỉ trả về JSON thuần:
{"verdict":"approve" hoặc "changes","notes":"nhận xét ngắn, nếu changes thì nêu rõ cần sửa gì"}`;

    const userContent = `Yêu cầu giao cho ${worker.name}:
${task.brief ?? task.title}

Kết quả cần kiểm duyệt:
${(task.result ?? "").slice(0, 8000)}`;

    assertInputFits(tokenBudget, system, userContent);

    const result = await generate({
      task: "general",
      provider: (manager.provider as AiProviderName | null) ?? undefined,
      model: manager.model ?? undefined,
      system,
      maxTokens: capMaxTokensForPrompt(1600, tokenBudget, system, userContent),
      messages: [{ role: "user", content: userContent }],
    });
    const reviewTokens =
      result.usage.inputTokens + result.usage.outputTokens;

    await logAiUsage(supabase, {
      ownerId,
      companyId: task.company_id,
      agentId: manager.id,
      taskId: task.id,
      provider: result.provider,
      model: result.model,
      purpose: "review:manager",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.costUsd,
    });

    const verdict = parseManagerVerdict(result.text);
    const review = {
      verdict: verdict?.verdict ?? "unknown",
      notes: verdict?.notes ?? result.text.slice(0, 1200),
      by: manager.name,
      at: new Date().toISOString(),
    };
    const nextCost = Number(task.actual_usd) + result.costUsd;

    if (verdict?.verdict === "changes" && task.review_rounds < MAX_REVIEW_ROUNDS) {
      await supabase
        .from("agent_tasks")
        .update({
          status: "queued",
          workflow_state: [],
          review,
          review_rounds: task.review_rounds + 1,
          brief: `${task.brief ?? task.title}

[GÓP Ý QUẢN LÝ LẦN ${
            task.review_rounds + 1
          }] ${verdict.notes}`,
          actual_usd: nextCost,
          actual_tokens: task.actual_tokens + reviewTokens,
          error: null,
        })
        .eq("id", task.id);
      return {
        ran: true,
        message: `Quản lý ${manager.name} yêu cầu sửa — đã đưa lại vào hàng đợi.`,
      };
    }

    await supabase
      .from("agent_tasks")
      .update({
        status: "review",
        review:
          verdict?.verdict === "changes"
            ? {
                ...review,
                note: `Quá ${MAX_REVIEW_ROUNDS} vòng sửa — chuyển người duyệt`,
              }
            : review,
        actual_usd: nextCost,
        actual_tokens: task.actual_tokens + reviewTokens,
        error: null,
      })
      .eq("id", task.id);

    return {
      ran: true,
      message:
        verdict?.verdict === "approve"
          ? `Quản lý ${manager.name} đã duyệt — chờ bạn duyệt cuối.`
          : "Quản lý đã xem nhưng chưa rõ kết luận — chuyển bạn duyệt.",
    };
  } catch (error) {
    const message =
      error instanceof AiBudgetError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    const budgetError = error instanceof AiBudgetError;
    await supabase
      .from("agent_tasks")
      .update({
        status: budgetError ? "review" : "failed",
        error: message.slice(0, 900),
        retry_count: budgetError
          ? task.retry_count
          : (task.retry_count ?? 0) + 1,
      })
      .eq("id", task.id);
    return { ran: false, message: message.slice(0, 200) };
  }
}

function channelContext(channel: Channel | null): string {
  if (!channel) return "";
  return `\n\n[KÊNH ĐĂNG]
Kênh: ${channel.name} (${channel.platform}, khu vực ${channel.region})
Ngách: ${channel.niche ?? "—"} | Định dạng: ${channel.content_format ?? "—"}
Tệp khán giả: ${channel.target_audience ?? "—"}
Kiếm tiền: ${channel.monetization ?? "—"}
Mục tiêu kênh: ${channel.goal ?? "—"}
Hướng dẫn riêng cho AI: ${channel.ai_brief ?? "—"}
Nội dung phải phù hợp kênh này, không dùng cho kênh khác.`;
}

async function runOneStep(
  supabase: SupabaseServerClient,
  options: {
    ownerId: string;
    task: AgentTask;
    company: Company;
  }
): Promise<{ ran: boolean; message: string }> {
  const { ownerId, company } = options;
  const task = options.task;

  if (!task.agent_id) return { ran: false, message: "Task chưa gán AI." };

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", task.agent_id)
    .maybeSingle();
  if (!agent) return { ran: false, message: "Không tìm thấy AI." };
  if (agent.status !== "active") {
    return { ran: false, message: `AI "${agent.name}" đang tạm dừng.` };
  }

  const { data: channel } = task.channel_id
    ? await supabase
        .from("channels")
        .select("*")
        .eq("id", task.channel_id)
        .maybeSingle()
    : { data: null };

  const steps = stepsForAgent(agent);
  let states = parseStepStates(task);
  if (states.length === 0) states = initialStepStates(steps);

  const pending = nextPendingStep(steps, states);

  if (!pending) {
    const status = task.requires_approval ? "review" : "approved";
    await supabase
      .from("agent_tasks")
      .update({
        status,
        workflow_state: states,
        result: combineStepOutputs(steps, states) || task.result,
      })
      .eq("id", task.id);

    if (!task.requires_approval) {
      await settleTaskOutcome(supabase, { task, ownerId, outcome: "approved" });
    }

    return { ran: false, message: "Dây chuyền đã hoàn tất." };
  }

  const { step, index } = pending;
  const startedStates: WorkflowStepState[] = states.map((state, i) =>
    i === index ? { ...state, status: "running" } : state
  );

  await supabase
    .from("agent_tasks")
    .update({
      status: "running",
      workflow_state: startedStates,
      error: null,
    })
    .eq("id", task.id);

  const previous = states
    .map((state, i) =>
      state.status === "done" && state.output
        ? `### ${steps[i]?.title ?? ""}\n${state.output}`
        : null
    )
    .filter(Boolean)
    .join("\n\n");

  const stepFeedback =
    states[index]?.feedback ?? startedStates[index]?.feedback ?? null;

  try {
    let nextState: WorkflowStepState;
    let addedCost = 0;
    let addedTokens = 0;

    if (step.mode === "voice" || step.mode === "music") {
      const promptSource =
        [...states]
          .reverse()
          .find((state) => state.status === "done" && state.output)?.output ??
        task.brief ??
        task.title;

      const { data: job, error } = await supabase
        .from("media_jobs")
        .insert({
          owner_id: ownerId,
          channel_id: task.channel_id,
          kind: step.mode === "voice" ? "voice" : "music",
          prompt: promptSource.slice(0, 8000),
          params:
            step.mode === "voice"
              ? { voice: "" }
              : {
                  vocal_language: "instrumental",
                  lyrics: "[Instrumental]",
                  inference_steps: 8,
                  output_format: "wav16",
                },
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      nextState = {
        stepId: step.id,
        status: "done",
        output: `Đã đưa vào hàng đợi media (${step.mode === "voice" ? "giọng đọc" : "nhạc"}). Engine sẽ xử lý khi máy chạy bật.`,
        mediaJobId: job?.id,
        finishedAt: new Date().toISOString(),
      };
    } else if (step.mode === "note") {
      nextState = {
        stepId: step.id,
        status: "done",
        output:
          "Bước vận hành thủ công: checklist đã được tổng hợp ở bước trước. Cần engine dựng video/đăng bài để hoàn tất.",
        finishedAt: new Date().toISOString(),
      };
    } else {
      await assertAiBudget(supabase, { ownerId, companyId: task.company_id });
      const tokenBudget = await assertTokenBudget(supabase, {
        ownerId,
        company,
        agent,
        task,
      });
      const knowledge = await buildKnowledgeContext(
        supabase,
        ownerId,
        task.company_id
      );

      const system = `${agent.system_prompt ?? "Bạn là nhân viên AI."}${companyContext(
        company
      )}${channelContext(channel)}${knowledge}\n\n[DÂY CHUYỀN ${index + 1}/${steps.length}] Bước: ${step.title}\n${
        step.instruction
      }${
        stepFeedback
          ? `\n\n[GÓP Ý CỦA NGƯỜI DUYỆT — BẮT BUỘC SỬA]\n${stepFeedback}`
          : ""
      }${previous ? `\n\nKết quả các bước trước:\n${previous.slice(0, 6000)}` : ""}`;

      const userContent = task.brief ?? task.title;
      assertInputFits(tokenBudget, system, userContent);
      const maxTokens = capMaxTokensForPrompt(
        agent.max_tokens_per_run,
        tokenBudget,
        system,
        userContent
      );

      const result = await generate({
        task: "general",
        provider: (agent.provider as AiProviderName | null) ?? undefined,
        model: agent.model ?? undefined,
        system,
        maxTokens,
        messages: [{ role: "user", content: userContent }],
      });

      await logAiUsage(supabase, {
        ownerId,
        companyId: task.company_id,
        agentId: agent.id,
        taskId: task.id,
        provider: result.provider,
        model: result.model,
        purpose: `agent:${agent.role}:${step.id}`,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.costUsd,
      });

      addedCost = result.costUsd;
      addedTokens = result.usage.inputTokens + result.usage.outputTokens;

      nextState = {
        stepId: step.id,
        status: "done",
        output: result.text,
        finishedAt: new Date().toISOString(),
      };
    }

    const nextStates = startedStates.map((state, i) =>
      i === index ? nextState : state
    );
    const allDone = nextStates.every((state) => state.status === "done");
    const resultText = combineStepOutputs(steps, nextStates);

    if (allDone) {
      let hasManager = false;
      if (task.requires_approval && agent.parent_id) {
        const { data: parent } = await supabase
          .from("ai_agents")
          .select("id,status")
          .eq("id", agent.parent_id)
          .maybeSingle();
        hasManager = Boolean(parent && parent.status === "active");
      }

      const status = !task.requires_approval
        ? "approved"
        : hasManager
          ? "manager_review"
          : "review";

      await supabase
        .from("agent_tasks")
        .update({
          status,
          workflow_state: nextStates,
          result: resultText,
          actual_usd: Number(task.actual_usd) + addedCost,
          actual_tokens: task.actual_tokens + addedTokens,
          error: null,
        })
        .eq("id", task.id);

      if (!task.requires_approval) {
        await settleTaskOutcome(supabase, {
          task: { ...task, status: "approved" },
          ownerId,
          outcome: "approved",
        });
      }
    } else {
      await supabase
        .from("agent_tasks")
        .update({
          status: "running",
          workflow_state: nextStates,
          result: resultText,
          actual_usd: Number(task.actual_usd) + addedCost,
          actual_tokens: task.actual_tokens + addedTokens,
          error: null,
        })
        .eq("id", task.id);
    }

    return {
      ran: true,
      message: `Đã chạy bước "${step.title}" (${index + 1}/${steps.length}).`,
    };
  } catch (error) {
    const message =
      error instanceof AiBudgetError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    const failedStates = startedStates.map((state, i) =>
      i === index
        ? { ...state, status: "failed" as const, error: message.slice(0, 500) }
        : state
    );

    const budgetError = error instanceof AiBudgetError;
    await supabase
      .from("agent_tasks")
      .update({
        status: budgetError ? "review" : "failed",
        workflow_state: failedStates,
        error: message.slice(0, 900),
      })
      .eq("id", task.id);

    return { ran: false, message: message.slice(0, 200) };
  }
}


const PLAN_COOLDOWN_MS = 20 * 60 * 1000;

type PlanItem = {
  agent: string;
  channel?: string;
  title: string;
  brief: string;
  token_budget?: number;
};

function parsePlan(text: string): PlanItem[] {
  const cleaned = text.replace(/```json/gi, "```").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is PlanItem =>
          item &&
          typeof item.agent === "string" &&
          typeof item.title === "string" &&
          typeof item.brief === "string"
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

/** CEO tự lập kế hoạch và tạo task cho các AI trong công ty. */
async function planTasksInternal(
  supabase: SupabaseServerClient,
  ownerId: string,
  company: Company,
  force: boolean
): Promise<{ planned: number; message: string }> {
  if (!force && company.last_planned_at) {
    const elapsed = Date.now() - new Date(company.last_planned_at).getTime();
    if (elapsed < PLAN_COOLDOWN_MS) {
      return {
        planned: 0,
        message: "Vừa lập kế hoạch gần đây — chờ hết thời gian nghỉ.",
      };
    }
  }

  const { data: agents } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("company_id", company.id)
    .eq("status", "active");
  if (!agents || agents.length === 0) {
    return { planned: 0, message: "Công ty chưa có AI nào đang hoạt động." };
  }

  const planner =
    agents.find((agent) => agent.role === "ceo") ??
    agents.find((agent) => agent.role === "manager") ??
    agents[0];

  const { data: channels } = await supabase
    .from("channels")
    .select("id,name,platform,niche")
    .eq("owner_id", ownerId);

  const channelList = (channels ?? [])
    .map(
      (channel) =>
        `- ${channel.name} (${channel.platform}${
          channel.niche ? ` · ${channel.niche}` : ""
        })`
    )
    .join("\n");

  const { data: recentTasks } = await supabase
    .from("agent_tasks")
    .select("title")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const recentTitles = (recentTasks ?? []).map((task) => task.title);
  const roster = agents
    .map(
      (agent) =>
        `- ${agent.name} (${agent.role}${agent.title ? ` · ${agent.title}` : ""} · hạn mức ${Number(
          agent.daily_token_budget
        ).toLocaleString("vi-VN")} token/ngày)`
    )
    .join("\n");

  try {
    await assertAiBudget(supabase, {
      ownerId,
      companyId: company.id,
    });
    const tokenBudget = await assertTokenBudget(supabase, {
      ownerId,
      company,
      agent: planner,
    });
    const planPool = Math.min(
      tokenBudget.companyRemaining,
      tokenBudget.agentRemaining
    );
    const maxTasks = Math.min(
      5,
      Math.floor(planPool / MIN_TASK_TOKEN_BUDGET)
    );
    if (maxTasks < 1) {
      return {
        planned: 0,
        message: "Hết ngân sách token hôm nay — không lập thêm việc.",
      };
    }

    const knowledge = await buildKnowledgeContext(
      supabase,
      ownerId,
      company.id
    );

    const system = `${planner.system_prompt ?? "Bạn là giám đốc AI."}${companyContext(
      company
    )}${knowledge}

[NHIỆM VỤ LẬP KẾ HOẠCH]
Bạn là giám đốc. Hãy chọn tối đa ${maxTasks} việc cụ thể, giá trị cao nhất cho tuần này và giao đúng người.
Tổng ngân sách token còn lại hôm nay của bạn: ${planPool.toLocaleString(
      "vi-VN"
    )} token. Mỗi việc phải ghi token_budget (số nguyên, tối thiểu ${MIN_TASK_TOKEN_BUDGET.toLocaleString(
      "vi-VN"
    )}, tổng không vượt ngân sách còn lại). Ưu tiên việc tạo doanh thu, tránh việc không ROI.
Danh sách AI dưới quyền (dùng ĐÚNG tên):
${roster}
Danh sách kênh (dùng ĐÚNG tên kênh nếu cần):
${channelList || "chưa có kênh"}
Việc gần đây (tránh lặp lại): ${recentTitles.join("; ") || "chưa có"}
Chỉ trả về JSON array thuần, không giải thích, dạng:
[{"agent":"<tên AI>","channel":"<tên kênh hoặc để trống>","title":"<tiêu đề ngắn>","brief":"<mô tả 2-3 câu, đầu ra rõ ràng>","token_budget":<số nguyên>}]`;

    const userContent = `Mục tiêu công ty: ${
      company.mission ?? company.name
    }. Hãy lập kế hoạch công việc tiếp theo.`;
    assertInputFits(tokenBudget, system, userContent);

    const result = await generate({
      task: "strategy",
      provider: (planner.provider as AiProviderName | null) ?? undefined,
      model: planner.model ?? undefined,
      system,
      maxTokens: capMaxTokensForPrompt(
        2200,
        tokenBudget,
        system,
        userContent
      ),
      messages: [{ role: "user", content: userContent }],
    });

    await logAiUsage(supabase, {
      ownerId,
      companyId: company.id,
      agentId: planner.id,
      provider: result.provider,
      model: result.model,
      purpose: "planner",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.costUsd,
    });

    const plan = parsePlan(result.text);
    if (plan.length === 0) {
      return {
        planned: 0,
        message: "CEO chưa trả về kế hoạch đọc được — thử lại.",
      };
    }

    const plannerTokens = result.usage.inputTokens + result.usage.outputTokens;
    let remainingPool = Math.max(0, planPool - plannerTokens);
    if (remainingPool < MIN_TASK_TOKEN_BUDGET) {
      return {
        planned: 0,
        message: "Hết ngân sách token hôm nay — không giao thêm việc.",
      };
    }

    const byName = new Map(
      agents.map((agent) => [agent.name.toLowerCase(), agent])
    );
    const channelByName = new Map(
      (channels ?? []).map((channel) => [channel.name.toLowerCase(), channel])
    );
    const targetRemaining = new Map<string, number>();
    let planned = 0;

    for (const item of plan) {
      if (remainingPool < MIN_TASK_TOKEN_BUDGET) break;

      const target =
        byName.get(item.agent.toLowerCase()) ??
        agents.find((agent) =>
          agent.name.toLowerCase().includes(item.agent.toLowerCase())
        );
      if (!target) continue;
      if (!item.title.trim() || !item.brief.trim()) continue;

      if (!targetRemaining.has(target.id)) {
        const agentBudget = await getAgentTokenRemainingToday(
          supabase,
          ownerId,
          target,
          company.token_budget_started_at
        );
        targetRemaining.set(target.id, agentBudget.remaining);
      }
      const agentAvailable = targetRemaining.get(target.id) ?? 0;
      if (agentAvailable < MIN_TASK_TOKEN_BUDGET) continue;

      const requested = Number(item.token_budget);
      const allocation = Math.min(
        Math.max(
          MIN_TASK_TOKEN_BUDGET,
          Number.isFinite(requested) && requested > 0
            ? requested
            : Math.min(8000, agentAvailable)
        ),
        remainingPool,
        agentAvailable
      );
      if (allocation < MIN_TASK_TOKEN_BUDGET) continue;

      const fallbackModel = target.provider
        ? PROVIDERS[target.provider as AiProviderName]?.model() ?? "gpt-4o-mini"
        : process.env.OPENAI_MODEL || "gpt-4o-mini";
      const estimate = estimateTaskCost(target, item.brief, fallbackModel);

      const matchedChannel = item.channel
        ? channelByName.get(item.channel.toLowerCase())
        : null;

      const { error } = await supabase.from("agent_tasks").insert({
        owner_id: ownerId,
        company_id: company.id,
        channel_id: matchedChannel?.id ?? null,
        agent_id: target.id,
        title: item.title.trim().slice(0, 200),
        brief: item.brief.trim().slice(0, 8000),
        status: "queued",
        requires_approval: true,
        estimate_usd: estimate.estimateUsd,
        estimate_tokens: estimate.inputTokens + estimate.outputTokens,
        token_budget: allocation,
      });

      if (error) {
        remainingPool += allocation;
        targetRemaining.set(target.id, agentAvailable + allocation);
        continue;
      }

      remainingPool -= allocation;
      targetRemaining.set(target.id, agentAvailable - allocation);
      planned += 1;
    }

    await supabase
      .from("companies")
      .update({ last_planned_at: new Date().toISOString() })
      .eq("id", company.id);

    return {
      planned,
      message:
        planned > 0
          ? `CEO đã lập kế hoạch và giao ${planned} việc.`
          : "CEO có kế hoạch nhưng không khớp tên AI nào.",
    };
  } catch (error) {
    const message =
      error instanceof AiBudgetError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return { planned: 0, message: message.slice(0, 200) };
  }
}

async function getCompany(
  supabase: SupabaseServerClient,
  companyId: string
): Promise<Company | null> {
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  return data;
}

/** Người dùng bấm "Chạy bước" cho một task cụ thể. */
export async function runTaskStep(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (
    !task ||
    !["queued", "running", "manager_review", "failed", "rejected"].includes(
      task.status
    )
  ) {
    return;
  }

  const company = await getCompany(supabase, task.company_id);
  if (!company) return;

  if (task.status === "manager_review") {
    await runManagerReview(supabase, {
      ownerId: me.id,
      task,
      company,
    });
    revalidatePath(`/company/${task.company_id}`);
    revalidatePath("/company");
    return;
  }

  const retry = task.status === "failed" || task.status === "rejected";
  const preparedTask: AgentTask = retry
    ? { ...task, status: "queued", workflow_state: [] }
    : task;

  if (retry) {
    await supabase
      .from("agent_tasks")
      .update({ status: "queued", workflow_state: [], error: null })
      .eq("id", task.id);
  }

  await runOneStep(supabase, {
    ownerId: me.id,
    task: preparedTask,
    company,
  });

  revalidatePath(`/company/${task.company_id}`);
  revalidatePath("/company");
}

const activeAutoRuns = new Set<string>();

/** Vòng lặp tự động: mỗi lần gọi chạy đúng 1 bước của 1 task. */
export async function autoRunNext(
  companyId: string
): Promise<{ ran: boolean; message: string }> {
  if (activeAutoRuns.has(companyId)) {
    return { ran: false, message: "Autopilot đang chạy — bỏ qua lượt trùng." };
  }
  activeAutoRuns.add(companyId);
  try {
    return await autoRunNextUnlocked(companyId);
  } finally {
    activeAutoRuns.delete(companyId);
  }
}

async function autoRunNextUnlocked(
  companyId: string
): Promise<{ ran: boolean; message: string }> {
  const me = await requireUser();
  const supabase = await createClient();

  const company = await getCompany(supabase, companyId);
  if (!company) return { ran: false, message: "Không tìm thấy công ty." };
  if (company.status !== "active") {
    return { ran: false, message: "Công ty đang tạm dừng." };
  }

  const { data: reviewing } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "manager_review")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (reviewing) {
    const outcome = await runManagerReview(supabase, {
      ownerId: me.id,
      task: reviewing,
      company,
    });
    revalidatePath(`/company/${companyId}`);
    revalidatePath("/company");
    return outcome;
  }

  const { data: running } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "running")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let task = running;

  if (!task) {
    const { data: queued } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    task = queued;
  }

  if (!task) {
    const { data: retryable } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "failed")
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (retryable) {
      const quotaBlocked =
        /429|quota|ngân sách token|hết ngân sách|token budget/i.test(
          retryable.error ?? ""
        );
      if (quotaBlocked) {
        return {
          ran: false,
          message:
            "Đã chạm hạn mức free/token — autopilot tạm dừng, không retry và không tạo việc mới.",
        };
      }
      const transient = /503|UNAVAILABLE|high demand|timeout|ETIMEDOUT|fetch failed/i.test(
        retryable.error ?? ""
      );
      if (transient) {
        await supabase
          .from("agent_tasks")
          .update({
            status: "queued",
            workflow_state: [],
            error: null,
          })
          .eq("id", retryable.id);
        revalidatePath(`/company/${companyId}`);
        revalidatePath("/company");
        return {
          ran: true,
          message: `Thử lại "${retryable.title}" sau lỗi tạm thời (lần ${retryable.retry_count + 1}/3).`,
        };
      }
    }

    const planned = await planTasksInternal(supabase, me.id, company, false);
    revalidatePath(`/company/${companyId}`);
    revalidatePath("/company");
    return {
      ran: planned.planned > 0,
      message: planned.message,
    };
  }

  const outcome = await runOneStep(supabase, {
    ownerId: me.id,
    task,
    company,
  });

  revalidatePath(`/company/${companyId}`);
  revalidatePath("/company");
  return outcome;
}

/** Nút "Lập kế hoạch" — CEO sinh việc ngay, bỏ qua thời gian nghỉ. */
export async function planCompanyTasks(companyId: string) {
  const me = await requireUser();
  const supabase = await createClient();
  const company = await getCompany(supabase, companyId);
  if (!company) return { planned: 0, message: "Không tìm thấy công ty." };
  if (company.status !== "active") {
    return { planned: 0, message: "Công ty đang tạm dừng." };
  }

  const result = await planTasksInternal(supabase, me.id, company, true);
  revalidatePath(`/company/${companyId}`);
  revalidatePath("/company");
  return result;
}

/** CEO kiểm tra toàn công ty và lưu báo cáo vào DB. */
export async function runCompanyAudit(companyId: string) {
  const me = await requireUser();
  const supabase = await createClient();
  const company = await getCompany(supabase, companyId);
  if (!company) return { ok: false, message: "Không tìm thấy công ty." };

  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, name, role, tier, earnings_usd, tasks_completed, tasks_failed, status")
    .eq("company_id", company.id);

  const ceo =
    agents?.find((agent) => agent.role === "ceo" && agent.status === "active") ??
    null;

  if (!ceo) {
    return { ok: false, message: "Công ty chưa có CEO đang hoạt động." };
  }

  const { data: ceoAgent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("company_id", company.id)
    .eq("role", "ceo")
    .eq("status", "active")
    .maybeSingle();

  if (!ceoAgent) {
    return { ok: false, message: "Không tải được hồ sơ CEO." };
  }

  const { data: tasks } = await supabase
    .from("agent_tasks")
    .select("title, status, agent_id, reward_usd, actual_usd, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const counts: Record<string, number> = {};
  for (const task of tasks ?? []) {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
  }

  const nameById = new Map(
    (agents ?? []).map((agent) => [agent.id, agent.name])
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  const startStr = monthStart.toISOString().slice(0, 10);

  const { data: revenue } = await supabase
    .from("revenue_entries")
    .select("amount_vnd")
    .eq("company_id", company.id)
    .gte("occurred_on", startStr);

  const revenueVnd = (revenue ?? []).reduce(
    (total, entry) => total + Number(entry.amount_vnd),
    0
  );
  const aiSpendUsd = await getMonthlySpend(supabase, me.id, company.id);

  const recentTasks = (tasks ?? []).slice(0, 10).map((task) => {
    const name = task.agent_id ? nameById.get(task.agent_id) ?? "AI" : "AI";
    return `- [${task.status}] ${task.title} (${name})`;
  });

  const roster = (agents ?? [])
    .map(
      (agent) =>
        `- ${agent.name} (${agent.role}, tầng ${agent.tier}, lương $${Number(
          agent.earnings_usd
        ).toFixed(2)}, ${agent.tasks_completed} đạt/${agent.tasks_failed} lỗi)${
          agent.status === "paused" ? " [tạm dừng]" : ""
        }`
    )
    .join("\n");

  try {
    await assertAiBudget(supabase, { ownerId: me.id, companyId: company.id });
    const tokenBudget = await assertTokenBudget(supabase, {
      ownerId: me.id,
      company,
      agent: ceoAgent,
    });
    const knowledge = await buildKnowledgeContext(
      supabase,
      me.id,
      company.id
    );

    const system = `${ceoAgent.system_prompt ?? "Bạn là CEO."}${companyContext(
      company
    )}${knowledge}

[KIỂM TRA TOÀN CÔNG TY]
Bạn là CEO. Dựa trên số liệu THẬT dưới đây, hãy báo cáo cho chủ tịch:
1. Tình hình: việc đang chạy/chờ duyệt/lỗi, hiệu suất AI, ngân sách AI, doanh thu tháng.
2. 3 rủi ro/vấn đề chính.
3. 3-5 việc ưu tiên tiếp theo (nêu rõ giao cho AI nào).
4. Đề xuất thăng cấp/điều chỉnh nếu có.
Chỉ dùng số liệu được cung cấp; nếu thiếu dữ liệu thì nói rõ là chưa có. Trả lời tiếng Việt, gạch đầu dòng, ngắn gọn.`;

    const userContent = `Số liệu công ty:
- Việc theo trạng thái: ${JSON.stringify(counts)}
- 10 việc gần nhất: ${recentTasks.join("; ") || "chưa có"}
- Nhân sự: 
${roster}
- Chi phí AI tháng này: $${aiSpendUsd.toFixed(2)}
- Doanh thu tháng này: ${revenueVnd.toLocaleString("vi-VN")} VND
- Mục tiêu doanh thu: ${Number(
      company.monthly_revenue_target_vnd
    ).toLocaleString("vi-VN")} VND`;
    assertInputFits(tokenBudget, system, userContent);

    const result = await generate({
      task: "strategy",
      provider: (ceoAgent.provider as AiProviderName | null) ?? undefined,
      model: ceoAgent.model ?? undefined,
      system,
      maxTokens: capMaxTokensForPrompt(
        1800,
        tokenBudget,
        system,
        userContent
      ),
      messages: [{ role: "user", content: userContent }],
    });

    await logAiUsage(supabase, {
      ownerId: me.id,
      companyId: company.id,
      agentId: ceoAgent.id,
      provider: result.provider,
      model: result.model,
      purpose: "audit:ceo",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.costUsd,
    });

    await supabase.from("company_reports").insert({
      owner_id: me.id,
      company_id: company.id,
      kind: "ceo_audit",
      content: result.text,
      metadata: {
        provider: result.provider,
        model: result.model,
        costUsd: result.costUsd,
      } as Json,
    });

    revalidatePath(`/company/${company.id}`);
    revalidatePath("/company");
    return { ok: true, message: "CEO đã kiểm tra và lưu báo cáo." };
  } catch (error) {
    const message =
      error instanceof AiBudgetError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return { ok: false, message: message.slice(0, 250) };
  }
}

/** Chạy lại đúng một bước (kèm góp ý), hoặc giao lại cho AI khác. */
export async function rerunStep(formData: FormData) {
  const me = await requireUser();
  const taskId = String(formData.get("task_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();
  const newAgentId = String(formData.get("agent_id") ?? "").trim();
  if (!taskId) return;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || !task.agent_id) return;

  const targetAgentId = newAgentId || task.agent_id;
  const { data: targetAgent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", targetAgentId)
    .eq("company_id", task.company_id)
    .maybeSingle();
  if (!targetAgent) return;

  const oldAgentId = task.agent_id;
  const steps = stepsForAgent(targetAgent);
  const existingStates = parseStepStates(task);

  let nextStates: WorkflowStepState[];
  if (targetAgentId !== oldAgentId) {
    nextStates = initialStepStates(steps);
  } else {
    const targetIndex = Math.max(
      0,
      steps.findIndex((step) => step.id === stepId)
    );
    nextStates = steps.map((step, index) => {
      const existing = existingStates.find((entry) => entry.stepId === step.id);
      if (index < targetIndex && existing?.status === "done") {
        return existing;
      }
      if (index === targetIndex) {
        return {
          stepId: step.id,
          status: "pending",
          feedback: feedback || existing?.feedback,
        };
      }
      return { stepId: step.id, status: "pending" };
    });
  }

  const brief = feedback
    ? `${task.brief ?? task.title}\n\n[GÓP Ý NGƯỜI DUYỆT] ${feedback}`
    : task.brief;

  await supabase
    .from("agent_tasks")
    .update({
      agent_id: targetAgentId,
      workflow_state: nextStates,
      status: "queued",
      brief,
      result: null,
      error: null,
      review: {},
    })
    .eq("id", task.id);

  if (targetAgentId !== oldAgentId) {
    const { data: oldAgent } = await supabase
      .from("ai_agents")
      .select("score")
      .eq("id", oldAgentId)
      .maybeSingle();
    await supabase.from("agent_performance_log").insert({
      owner_id: me.id,
      company_id: task.company_id,
      agent_id: oldAgentId,
      task_id: task.id,
      kind: "penalty",
      score_delta: -4,
      note: `Bị thay thế bởi người duyệt — giao lại cho "${targetAgent.name}"`,
    });
    await supabase
      .from("ai_agents")
      .update({ score: Math.max(0, (oldAgent?.score ?? 0) - 4) })
      .eq("id", oldAgentId);
  }

  revalidatePath(`/company/${task.company_id}`);
  revalidatePath("/company");
}

/** Người duyệt tự sửa kết quả một bước rồi cho chạy tiếp. */
export async function updateStepOutput(formData: FormData) {
  await requireUser();
  const taskId = String(formData.get("task_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  const output = String(formData.get("output") ?? "");
  if (!taskId || !stepId || !output.trim()) return;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || !task.agent_id) return;

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", task.agent_id)
    .maybeSingle();
  if (!agent) return;

  const steps = stepsForAgent(agent);
  const states = parseStepStates(task);
  const nextStates = steps.map((step) => {
    const existing = states.find((entry) => entry.stepId === step.id);
    if (step.id === stepId) {
      return {
        ...existing,
        stepId: step.id,
        status: "done" as const,
        output,
        error: undefined,
        finishedAt: new Date().toISOString(),
      };
    }
    return existing ?? { stepId: step.id, status: "pending" as const };
  });

  const allDone = nextStates.every((state) => state.status === "done");

  await supabase
    .from("agent_tasks")
    .update({
      workflow_state: nextStates,
      status: allDone ? "review" : "queued",
      result: combineStepOutputs(steps, nextStates),
      error: null,
    })
    .eq("id", taskId);

  revalidatePath(`/company/${task.company_id}`);
  revalidatePath("/company");
}
