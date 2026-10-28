import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import { exchangeYoutubeCode, fetchYoutubeProfile } from "@/lib/youtube";
import type { Json } from "@/types/database";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/connections?error=${encodeURIComponent(message)}`, request.url)
    );

  if (providerError) return fail(`Google từ chối: ${providerError}`);
  if (!code) return fail("Thiếu mã OAuth từ Google.");

  const expectedState = request.cookies.get("oauth_state_youtube")?.value;
  if (!state || !expectedState || state !== expectedState) {
    return fail("State OAuth không khớp. Thử lại.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("Chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/oauth/youtube/callback`;

  try {
    const tokens = await exchangeYoutubeCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    const profile = await fetchYoutubeProfile(tokens.accessToken);

    const { error } = await supabase.from("platform_accounts").upsert(
      {
        owner_id: user.id,
        platform: "youtube",
        account_id: profile.id,
        account_name: profile.title,
        access_token_enc: encryptToken(tokens.accessToken),
        refresh_token_enc: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : null,
        token_expires_at: new Date(
          Date.now() + tokens.expiresIn * 1000
        ).toISOString(),
        refresh_expires_at: null,
        scopes: tokens.scope ? tokens.scope.split(" ") : [],
        status: "connected",
        metadata: {
          subscribers: profile.subscribers,
          totalViews: profile.totalViews,
          videoCount: profile.videoCount,
        } as Json,
      },
      { onConflict: "owner_id,platform,account_id" }
    );

    if (error) return fail(error.message);

    const response = NextResponse.redirect(
      new URL("/connections?connected=youtube", request.url)
    );
    response.cookies.delete("oauth_state_youtube");
    return response;
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Kết nối YouTube thất bại."
    );
  }
}
