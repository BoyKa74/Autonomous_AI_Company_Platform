import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import { exchangeTiktokCode, fetchTiktokProfile } from "@/lib/tiktok";
import type { Json } from "@/types/database";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError =
    url.searchParams.get("error") || url.searchParams.get("error_description");

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/connections?error=${encodeURIComponent(message)}`, request.url)
    );

  if (providerError) return fail(`TikTok từ chối: ${providerError}`);
  if (!code) return fail("Thiếu mã OAuth từ TikTok.");

  const expectedState = request.cookies.get("oauth_state_tiktok")?.value;
  if (!state || !expectedState || state !== expectedState) {
    return fail("State OAuth không khớp. Thử lại.");
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return fail("Chưa cấu hình TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/oauth/tiktok/callback`;

  try {
    const tokens = await exchangeTiktokCode({
      clientKey,
      clientSecret,
      code,
      redirectUri,
    });
    const profile = await fetchTiktokProfile(tokens.accessToken);

    const accountId = profile.openId || tokens.openId;
    if (!accountId) throw new Error("TikTok không trả về open_id.");

    const { error } = await supabase.from("platform_accounts").upsert(
      {
        owner_id: user.id,
        platform: "tiktok",
        account_id: accountId,
        account_name: profile.displayName,
        access_token_enc: encryptToken(tokens.accessToken),
        refresh_token_enc: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : null,
        token_expires_at: new Date(
          Date.now() + tokens.expiresIn * 1000
        ).toISOString(),
        refresh_expires_at: new Date(
          Date.now() + tokens.refreshExpiresIn * 1000
        ).toISOString(),
        scopes: tokens.scope ? tokens.scope.split(",") : [],
        status: "connected",
        metadata: {
          followers: profile.followers,
          likes: profile.likes,
          videoCount: profile.videoCount,
        } as Json,
      },
      { onConflict: "owner_id,platform,account_id" }
    );

    if (error) return fail(error.message);

    const response = NextResponse.redirect(
      new URL("/connections?connected=tiktok", request.url)
    );
    response.cookies.delete("oauth_state_tiktok");
    return response;
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Kết nối TikTok thất bại."
    );
  }
}
