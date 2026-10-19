import { createClient } from "@/lib/supabase/server";
import { getAiSettings, monthStartIso } from "@/lib/ai/budget";
import type {
  AgentTask,
  AiAgent,
  AiSettings,
  Channel,
  ChannelPlatform,
  ChannelStatus,
  Company,
  ContentItem,
  CostLedgerEntry,
  MediaJob,
  Profile,
} from "@/types/database";

export type ChannelFilters = {
  platform?: string;
  status?: string;
  region?: string;
  q?: string;
};

export async function listChannels(
  filters: ChannelFilters = {}
): Promise<Channel[]> {
  const supabase = await createClient();
  let query = supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.platform && filters.platform !== "all") {
    query = query.eq("platform", filters.platform as ChannelPlatform);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as ChannelStatus);
  }
  if (filters.region && filters.region !== "all") {
    query = query.eq("region", filters.region);
  }
  if (filters.q) {
    const q = filters.q.replace(/[(),]/g, " ").trim();
    if (q) {
      query = query.or(`name.ilike.%${q}%,handle.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getChannel(id: string): Promise<Channel | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export type ChannelWithOwner = Channel & {
  owner: Pick<Profile, "email" | "full_name"> | null;
};

export async function listAllChannelsWithOwner(): Promise<ChannelWithOwner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("*, owner:profiles!channels_owner_id_fkey(email, full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ChannelWithOwner[];
}

export async function listContentItems(options: {
  channelId?: string;
  status?: string;
  limit?: number;
} = {}): Promise<ContentItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.channelId) query = query.eq("channel_id", options.channelId);
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status as ContentItem["status"]);
  }
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ChannelStats = {
  total: number;
  active: number;
  commerce: number;
  followers: number;
  byPlatform: Record<string, { count: number; followers: number }>;
  byStatus: Record<string, number>;
};

const COMMERCE_PLATFORMS: ChannelPlatform[] = [
  "shopee",
  "tiktok_shop",
  "other",
];

export function computeChannelStats(channels: Channel[]): ChannelStats {
  const stats: ChannelStats = {
    total: channels.length,
    active: 0,
    commerce: 0,
    followers: 0,
    byPlatform: {},
    byStatus: {},
  };

  for (const channel of channels) {
    stats.followers += channel.followers;
    if (channel.status === "active") stats.active += 1;
    if (COMMERCE_PLATFORMS.includes(channel.platform)) stats.commerce += 1;

    const platform = (stats.byPlatform[channel.platform] ??= {
      count: 0,
      followers: 0,
    });
    platform.count += 1;
    platform.followers += channel.followers;

    stats.byStatus[channel.status] = (stats.byStatus[channel.status] ?? 0) + 1;
  }

  return stats;
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMediaJobs(limit = 10): Promise<MediaJob[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/* ---------- Tập đoàn AI ---------- */

export async function listCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listAgents(companyId: string): Promise<AiAgent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTasks(options: {
  companyId?: string;
  limit?: number;
} = {}): Promise<AgentTask[]> {
  const supabase = await createClient();
  let query = supabase
    .from("agent_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.companyId) query = query.eq("company_id", options.companyId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type BudgetOverview = {
  settings: AiSettings;
  systemSpend: number;
  companies: { id: string; name: string; spend: number; budget: number }[];
  topAgents: { id: string; name: string; spend: number }[];
};

export async function getBudgetOverview(ownerId: string): Promise<BudgetOverview> {
  const supabase = await createClient();
  const [settings, companiesRes, ledgerRes, agentsRes] = await Promise.all([
    getAiSettings(supabase, ownerId),
    supabase.from("companies").select("id, name, monthly_budget_usd"),
    supabase
      .from("cost_ledger")
      .select("company_id, agent_id, cost_usd")
      .eq("owner_id", ownerId)
      .gte("created_at", monthStartIso())
      .limit(5000),
    supabase.from("ai_agents").select("id, name"),
  ]);

  const companies = companiesRes.data ?? [];
  const ledger = ledgerRes.data ?? [];
  const agents = agentsRes.data ?? [];

  const spendByCompany = new Map<string, number>();
  const spendByAgent = new Map<string, number>();
  let systemSpend = 0;

  for (const entry of ledger) {
    const cost = Number(entry.cost_usd ?? 0);
    systemSpend += cost;
    if (entry.company_id) {
      spendByCompany.set(
        entry.company_id,
        (spendByCompany.get(entry.company_id) ?? 0) + cost
      );
    }
    if (entry.agent_id) {
      spendByAgent.set(
        entry.agent_id,
        (spendByAgent.get(entry.agent_id) ?? 0) + cost
      );
    }
  }

  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));

  return {
    settings,
    systemSpend,
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      budget: Number(company.monthly_budget_usd),
      spend: spendByCompany.get(company.id) ?? 0,
    })),
    topAgents: [...spendByAgent.entries()]
      .map(([id, spend]) => ({ id, name: agentNames.get(id) ?? "Agent", spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5),
  };
}

export async function listRecentLedger(limit = 12) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cost_ledger")
    .select("*, company:companies(name), agent:ai_agents(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as (CostLedgerEntry & {
    company: { name: string } | null;
    agent: { name: string } | null;
  })[];
}
