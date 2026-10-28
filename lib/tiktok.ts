const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export const TIKTOK_SCOPES = ["user.info.basic", "video.list"];

export function tiktokAuthUrl(options: {
  clientKey: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_key", options.clientKey);
  url.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  return url.toString();
}

export type TiktokTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  refreshExpiresIn: number;
  openId: string;
  scope: string | null;
};

type TiktokTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  message?: string;
};

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const data = (await response.json()) as TiktokTokenResponse;
  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description ?? data.message ?? data.error ?? "TikTok OAuth lỗi"
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 86400,
    refreshExpiresIn: data.refresh_expires_in ?? 31536000,
    openId: data.open_id ?? "",
    scope: data.scope ?? null,
  } satisfies TiktokTokenSet;
}

export async function exchangeTiktokCode(options: {
  clientKey: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<TiktokTokenSet> {
  return tokenRequest({
    client_key: options.clientKey,
    client_secret: options.clientSecret,
    code: options.code,
    grant_type: "authorization_code",
    redirect_uri: options.redirectUri,
  });
}

export async function refreshTiktokToken(options: {
  clientKey: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TiktokTokenSet> {
  return tokenRequest({
    client_key: options.clientKey,
    client_secret: options.clientSecret,
    grant_type: "refresh_token",
    refresh_token: options.refreshToken,
  });
}

async function apiPost<T>(
  path: string,
  accessToken: string,
  body: unknown
): Promise<T> {
  const response = await fetch(`https://open.tiktokapis.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json()) as T & {
    error?: { code?: string; message?: string };
  };
  if (!response.ok || (data.error && data.error.code !== "ok")) {
    throw new Error(
      data.error?.message ?? `TikTok API lỗi ${response.status}`
    );
  }
  return data;
}

export type TiktokProfile = {
  openId: string;
  displayName: string;
  followers: number;
  likes: number;
  videoCount: number;
};

export async function fetchTiktokProfile(
  accessToken: string
): Promise<TiktokProfile> {
  const data = await apiPost<{
    data?: {
      user?: {
        open_id?: string;
        display_name?: string;
        follower_count?: number;
        likes_count?: number;
        video_count?: number;
      };
    };
  }>(
    "/v2/user/info/?fields=open_id,display_name,follower_count,likes_count,video_count",
    accessToken,
    {}
  );

  const user = data.data?.user;
  if (!user) throw new Error("Không đọc được thông tin TikTok.");

  return {
    openId: user.open_id ?? "",
    displayName: user.display_name ?? "TikTok",
    followers: user.follower_count ?? 0,
    likes: user.likes_count ?? 0,
    videoCount: user.video_count ?? 0,
  };
}

export type TiktokSnapshot = {
  followers: number;
  likes: number;
  videoCount: number;
  postsAnalyzed: number;
  recentViews: number;
  recentLikes: number;
  recentComments: number;
  recentShares: number;
  warnings: string[];
};

export async function fetchTiktokSnapshot(
  accessToken: string
): Promise<TiktokSnapshot> {
  const profile = await fetchTiktokProfile(accessToken);
  const warnings: string[] = [];
  let recentViews = 0;
  let recentLikes = 0;
  let recentComments = 0;
  let recentShares = 0;
  let postsAnalyzed = 0;

  try {
    const data = await apiPost<{
      data?: {
        videos?: {
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
        }[];
      };
    }>(
      "/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,create_time",
      accessToken,
      { max_count: 20 }
    );

    const videos = data.data?.videos ?? [];
    postsAnalyzed = videos.length;
    for (const video of videos) {
      recentViews += video.view_count ?? 0;
      recentLikes += video.like_count ?? 0;
      recentComments += video.comment_count ?? 0;
      recentShares += video.share_count ?? 0;
    }
  } catch (error) {
    warnings.push(
      `Không đọc được danh sách video: ${
        error instanceof Error ? error.message : "lỗi"
      } (cần quyền video.list đã được duyệt).`
    );
  }

  return {
    followers: profile.followers,
    likes: profile.likes,
    videoCount: profile.videoCount,
    postsAnalyzed,
    recentViews,
    recentLikes,
    recentComments,
    recentShares,
    warnings,
  };
}
