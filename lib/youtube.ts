const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

export function youtubeAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", options.state);
  return url.toString();
}

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string | null;
};

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Google OAuth lỗi"
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 3600,
    scope: data.scope ?? null,
  } satisfies OAuthTokenSet;
}

export async function exchangeYoutubeCode(options: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<OAuthTokenSet> {
  return tokenRequest({
    code: options.code,
    client_id: options.clientId,
    client_secret: options.clientSecret,
    redirect_uri: options.redirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshYoutubeToken(options: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<OAuthTokenSet> {
  return tokenRequest({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    refresh_token: options.refreshToken,
    grant_type: "refresh_token",
  });
}

async function apiGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await response.json()) as T & {
    error?: { message?: string };
  };
  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `YouTube API lỗi ${response.status}`);
  }
  return data;
}

export type YoutubeProfile = {
  id: string;
  title: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  uploadsPlaylistId: string | null;
};

export async function fetchYoutubeProfile(
  accessToken: string
): Promise<YoutubeProfile> {
  const data = await apiGet<{
    items?: {
      id: string;
      snippet?: { title?: string };
      statistics?: {
        subscriberCount?: string;
        viewCount?: string;
        videoCount?: string;
      };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }[];
  }>(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    accessToken
  );

  const channel = data.items?.[0];
  if (!channel) {
    throw new Error(
      "Tài khoản Google này chưa có kênh YouTube (hoặc chưa chọn Brand Account)."
    );
  }

  return {
    id: channel.id,
    title: channel.snippet?.title ?? "YouTube channel",
    subscribers: Number(channel.statistics?.subscriberCount ?? 0),
    totalViews: Number(channel.statistics?.viewCount ?? 0),
    videoCount: Number(channel.statistics?.videoCount ?? 0),
    uploadsPlaylistId:
      channel.contentDetails?.relatedPlaylists?.uploads ?? null,
  };
}

export type YoutubeSnapshot = {
  subscribers: number;
  totalViews: number;
  videoCount: number;
  postsAnalyzed: number;
  recentViews: number;
  recentLikes: number;
  recentComments: number;
  warnings: string[];
};

export async function fetchYoutubeSnapshot(
  accessToken: string
): Promise<YoutubeSnapshot> {
  const profile = await fetchYoutubeProfile(accessToken);
  const warnings: string[] = [];
  let recentViews = 0;
  let recentLikes = 0;
  let recentComments = 0;
  let postsAnalyzed = 0;

  if (profile.uploadsPlaylistId) {
    try {
      const playlist = await apiGet<{
        items?: { contentDetails?: { videoId?: string } }[];
      }>(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=20&playlistId=${profile.uploadsPlaylistId}`,
        accessToken
      );
      const ids = (playlist.items ?? [])
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean) as string[];

      if (ids.length > 0) {
        const videos = await apiGet<{
          items?: {
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
          }[];
        }>(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}`,
          accessToken
        );
        postsAnalyzed = videos.items?.length ?? 0;
        for (const video of videos.items ?? []) {
          recentViews += Number(video.statistics?.viewCount ?? 0);
          recentLikes += Number(video.statistics?.likeCount ?? 0);
          recentComments += Number(video.statistics?.commentCount ?? 0);
        }
      }
    } catch (error) {
      warnings.push(
        `Không đọc được thống kê video: ${
          error instanceof Error ? error.message : "lỗi"
        }`
      );
    }
  }

  return {
    subscribers: profile.subscribers,
    totalViews: profile.totalViews,
    videoCount: profile.videoCount,
    postsAnalyzed,
    recentViews,
    recentLikes,
    recentComments,
    warnings,
  };
}
