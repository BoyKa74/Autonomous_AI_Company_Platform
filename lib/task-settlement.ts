import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeApprovalSettlement,
  computeRejectionSettlement,
  tierMeta,
} from "@/lib/economy";
import type { AgentTask, Database } from "@/types/database";

/**
 * Chốt công cho một task đã được duyệt hoặc bị từ chối.
 * Chỉ chạy khi có quyết định của con người (hoặc task không cần duyệt).
 */
export async function settleTaskOutcome(
  supabase: SupabaseClient<Database>,
  options: {
    task: AgentTask;
    ownerId: string;
    outcome: "approved" | "rejected";
  }
) {
  const { task, ownerId, outcome } = options;
  if (!task.agent_id) return;

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", task.agent_id)
    .maybeSingle();
  if (!agent) return;

  const { count: penalties } = await supabase
    .from("agent_performance_log")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id)
    .eq("kind", "penalty");

  const settlement =
    outcome === "approved"
      ? computeApprovalSettlement(agent.role, agent.score, penalties ?? 0)
      : computeRejectionSettlement(agent.score);

  const nextScore = Math.max(0, agent.score + settlement.scoreDelta);

  await supabase
    .from("agent_tasks")
    .update({
      status: outcome === "approved" ? "approved" : "rejected",
      reward_usd: settlement.rewardUsd,
    })
    .eq("id", task.id);

  await supabase
    .from("ai_agents")
    .update({
      score: nextScore,
      tier: settlement.tierTo,
      earnings_usd: Number(agent.earnings_usd) + settlement.rewardUsd,
      tasks_completed:
        agent.tasks_completed + (outcome === "approved" ? 1 : 0),
      tasks_failed: agent.tasks_failed + (outcome === "rejected" ? 1 : 0),
    })
    .eq("id", agent.id);

  if (outcome === "approved") {
    await supabase.from("agent_performance_log").insert({
      owner_id: ownerId,
      company_id: task.company_id,
      agent_id: agent.id,
      task_id: task.id,
      kind: "reward",
      amount_usd: settlement.rewardUsd,
      score_delta: settlement.scoreDelta,
      note:
        (penalties ?? 0) > 0
          ? `Duyệt sau ${penalties} lần bị từ chối`
          : "Duyệt ngay lần đầu",
    });
  } else {
    await supabase.from("agent_performance_log").insert({
      owner_id: ownerId,
      company_id: task.company_id,
      agent_id: agent.id,
      task_id: task.id,
      kind: "penalty",
      score_delta: settlement.scoreDelta,
      note: "Nội dung bị từ chối",
    });
  }

  if (settlement.tierTo !== settlement.tierFrom) {
    const promoted = settlement.tierTo > settlement.tierFrom;
    await supabase.from("agent_performance_log").insert({
      owner_id: ownerId,
      company_id: task.company_id,
      agent_id: agent.id,
      task_id: task.id,
      kind: promoted ? "promotion" : "demotion",
      score_delta: 0,
      tier_from: settlement.tierFrom,
      tier_to: settlement.tierTo,
      note: `${promoted ? "Thăng" : "Xuống"} tầng ${settlement.tierFrom} → ${
        settlement.tierTo
      } (${tierMeta(settlement.tierTo).name})`,
    });
  }
}
