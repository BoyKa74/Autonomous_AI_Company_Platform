const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

type GraphError = { error?: { message?: string; code?: number } };

async function graphGet<T>(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T & GraphError;
  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ?? `Facebook Graph API lỗi HTTP ${response.status}`
    );
  }
  return data;
}

async function graphPost<T>(path: string, body: Record<string, string>) {
  const response = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json()) as T & GraphError;
  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ?? `Facebook Graph API lỗi HTTP ${response.status}`
    );
  }
  return data;
}

export type FacebookPageInfo = {
  id: string;
  name: string;
  followers: number;
};

export async function verifyFacebookPage(
  pageId: string,
  token: string
): Promise<FacebookPageInfo> {
  const data = await graphGet<{
    id: string;
    name: string;
    followers_count?: number;
    fan_count?: number;
  }>(`/${pageId}`, {
    fields: "id,name,followers_count,fan_count",
    access_token: token,
  });

  return {
    id: data.id,
    name: data.name,
    followers: data.followers_count ?? data.fan_count ?? 0,
  };
}

export type FacebookSnapshot = {
  followers: number;
  postsAnalyzed: number;
  likes: number;
  comments: number;
  shares: number;
  impressions: number | null;
  engagements: number | null;
  topPosts: { id: string; message: string; createdTime: string; likes: number; comments: number; shares: number }[];
  warnings: string[];
};

function sumInsightValues(
  payload: {
    data?: { name: string; values?: { value?: number }[] }[];
  },
  names: string[]
): number | null {
  const metric = payload.data?.find((entry) => names.includes(entry.name));
  if (!metric?.values?.length) return null;
  return metric.values.reduce((total, entry) => total + (entry.value ?? 0), 0);
}

export async function fetchFacebookSnapshot(
  pageId: string,
  token: string
): Promise<FacebookSnapshot> {
  const warnings: string[] = [];

  const page = await graphGet<{
    followers_count?: number;
    fan_count?: number;
  }>(`/${pageId}`, {
    fields: "followers_count,fan_count",
    access_token: token,
  });

  const postsResponse = await graphGet<{
    data?: {
      id: string;
      message?: string;
      created_time: string;
      shares?: { count?: number };
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
    }[];
  }>(`/${pageId}/posts`, {
    fields:
      "id,message,created_time,shares,likes.summary(true),comments.summary(true)",
    limit: "25",
    access_token: token,
  });

  const posts = postsResponse.data ?? [];
  let likes = 0;
  let comments = 0;
  let shares = 0;

  const topPosts = posts.map((post) => {
    const postLikes = post.likes?.summary?.total_count ?? 0;
    const postComments = post.comments?.summary?.total_count ?? 0;
    const postShares = post.shares?.count ?? 0;
    likes += postLikes;
    comments += postComments;
    shares += postShares;
    return {
      id: post.id,
      message: (post.message ?? "").slice(0, 200),
      createdTime: post.created_time,
      likes: postLikes,
      comments: postComments,
      shares: postShares,
    };
  });

  let impressions: number | null = null;
  let engagements: number | null = null;

  for (const metrics of [
    "page_impressions,page_post_engagements",
    "page_media_view,page_post_engagements",
  ]) {
    try {
      const since = Math.floor(Date.now() / 1000) - 28 * 86400;
      const until = Math.floor(Date.now() / 1000);
      const insights = await graphGet<{
        data?: { name: string; values?: { value?: number }[] }[];
      }>(`/${pageId}/insights`, {
        metric: metrics,
        period: "day",
        since: String(since),
        until: String(until),
        access_token: token,
      });
      impressions = sumInsightValues(insights, ["page_impressions", "page_media_view"]);
      engagements = sumInsightValues(insights, ["page_post_engagements"]);
      if (impressions !== null || engagements !== null) break;
    } catch (error) {
      warnings.push(
        `Không đọc được insights: ${
          error instanceof Error ? error.message : "lỗi không rõ"
        }. Cần quyền read_insights.`
      );
    }
  }

  return {
    followers: page.followers_count ?? page.fan_count ?? 0,
    postsAnalyzed: posts.length,
    likes,
    comments,
    shares,
    impressions,
    engagements,
    topPosts: topPosts
      .sort((a, b) => b.likes + b.comments + b.shares - (a.likes + a.comments + a.shares))
      .slice(0, 5),
    warnings,
  };
}

export async function publishFacebookPost(
  pageId: string,
  token: string,
  message: string
): Promise<{ id: string }> {
  return graphPost<{ id: string }>(`/${pageId}/feed`, {
    message,
    access_token: token,
  });
}
