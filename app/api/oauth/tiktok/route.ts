import { NextResponse, type NextRequest } from "next/server";
import { tiktokAuthUrl } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  if (!clientKey) {
    return NextResponse.redirect(
      new URL(
        "/connections?error=Chưa cấu hình TIKTOK_CLIENT_KEY trong .env.local",
        request.url
      )
    );
  }

  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/oauth/tiktok/callback`;
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(
    tiktokAuthUrl({ clientKey, redirectUri, state })
  );
  response.cookies.set("oauth_state_tiktok", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
