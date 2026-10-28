import { NextResponse, type NextRequest } from "next/server";
import { youtubeAuthUrl } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        "/connections?error=Chưa cấu hình GOOGLE_CLIENT_ID trong .env.local",
        request.url
      )
    );
  }

  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/oauth/youtube/callback`;
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(
    youtubeAuthUrl({ clientId, redirectUri, state })
  );
  response.cookies.set("oauth_state_youtube", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
