import type { AgentRole } from "@/types/database";

export type TierMeta = {
  tier: number;
  name: string;
  minScore: number;
  rewardMultiplier: number;
  color: string;
};

/** 5 tầng: điểm càng cao, lương càng lớn, được lên tầng cao hơn trong văn phòng. */
export const TIERS: TierMeta[] = [
  { tier: 1, name: "Thực tập", minScore: 0, rewardMultiplier: 0.7, color: "#8b95a7" },
  { tier: 2, name: "Junior", minScore: 40, rewardMultiplier: 1, color: "#2f6fd6" },
  { tier: 3, name: "Senior", minScore: 120, rewardMultiplier: 1.3, color: "#0f8f9c" },
  { tier: 4, name: "Lead", minScore: 260, rewardMultiplier: 1.6, color: "#7c53c3" },
  { tier: 5, name: "Executive", minScore: 500, rewardMultiplier: 2, color: "#cd8615" },
];

export function tierMeta(tier: number): TierMeta {
  return TIERS.find((entry) => entry.tier === tier) ?? TIERS[0];
}

export function tierForScore(score: number): number {
  let result = 1;
  for (const entry of TIERS) {
    if (score >= entry.minScore) result = entry.tier;
  }
  return result;
}

/** Giá trị cơ bản của một đầu ra được duyệt, theo vai trò. */
export const ROLE_BASE_REWARD: Record<AgentRole, number> = {
  super_admin: 8,
  ceo: 6,
  manager: 3.5,
  specialist: 2,
  worker: 1.2,
};

export type Settlement = {
  rewardUsd: number;
  scoreDelta: number;
  tierFrom: number;
  tierTo: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Chỉ việc đã được con người duyệt mới được trả công.
 * Làm lại càng nhiều lần (bị từ chối) thì thưởng càng giảm.
 * Không có cơ chế tự tiêu tiền, tự phát hành hay vượt quyền.
 */
export function computeApprovalSettlement(
  role: AgentRole,
  score: number,
  penalties: number
): Settlement {
  const tierFrom = tierForScore(score);
  const multiplier = tierMeta(tierFrom).rewardMultiplier;
  const penaltyFactor = Math.max(0.4, 1 - penalties * 0.2);
  const rewardUsd = round2(ROLE_BASE_REWARD[role] * multiplier * penaltyFactor);
  const scoreDelta = penalties === 0 ? 16 : 10;
  const tierTo = tierForScore(score + scoreDelta);

  return { rewardUsd, scoreDelta, tierFrom, tierTo };
}

export function computeRejectionSettlement(score: number): Settlement {
  const tierFrom = tierForScore(score);
  const scoreDelta = -8;
  const tierTo = tierForScore(Math.max(0, score + scoreDelta));

  return { rewardUsd: 0, scoreDelta, tierFrom, tierTo };
}
