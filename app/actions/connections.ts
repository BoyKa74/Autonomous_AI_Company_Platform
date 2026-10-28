"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { encryptToken, decryptToken } from "@/lib/crypto";
import {
  fetchFacebookSnapshot,
  publishFacebookPost,
  verifyFacebookPage,
} from "@/lib/facebook";
import {
  fetchYoutubeSnapshot,
  refreshYoutubeToken,
} from "@/lib/youtube";
import {
  fetchTiktokSnapshot,
  refreshTiktokToken,
} from "@/lib/tiktok";
import {
  facebookConnectSchema,
  facebookPostSchema,
} from "@/lib/validators";
import type { FormState } from "@/lib/action-state";
import type { Json } from "@/types/database";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

export async function connectFacebook(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = facebookConnectSchema.safeParse({
    company_id: formData.get("company_id") ?? undefined,
    page_id: formData.get("page_id"),
    access_token: formData.get("access_token"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  let page;
  try {
    page = await verifyFacebookPage(
      parsed.data.page_id,
      parsed.data.access_token
    );
  } catch (error) {
    return {
      status: "error",
      message: `Không xác minh được Page: ${
        error instanceof Error ? error.message : "lỗi không rõ"
      }`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platform_accounts").upsert(
    {
      owner_id: me.id,
      company_id: parsed.data.company_id,
      platform: "facebook",
      account_id: page.id,
      account_name: page.name,
      access_token_enc: encryptToken(parsed.data.access_token),
      token_expires_at: null,
      status: "connected",
      metadata: {
        followers: page.followers,
        graph_version: process.env.FACEBOOK_GRAPH_VERSION || "v23.0",
      } as Json,
    },
    { onConflict: "owner_id,platform,account_id" }
  );

  if (error) return { status: "error", message: error.message };

  revalidatePath("/connections");
  return {
    status: "success",
    message: `Đã kết nối Page "${page.name}" (${page.followers.toLocaleString("vi-VN")} follower).`,
  };
}

async function getFacebookAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const { data } = await supabase
    .from("platform_accounts")
    .select("*")
    .eq("id", id)
    .eq("platform", "facebook")
    .maybeSingle();
  return data;
}

async function getAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const { data } = await supabase
    .from("platform_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

function isFresh(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now() + 60_000;
}

async function youtubeAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  account: NonNullable<Awaited<ReturnType<typeof getAccount>>>
): Promise<string> {
  if (account.access_token_enc && isFresh(account.token_expires_at)) {
    return decryptToken(account.access_token_enc);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.");
  }
  if (!account.refresh_token_enc) {
    throw new Error("Không có refresh token — hãy kết nối lại YouTube.");
  }

  const tokens = await refreshYoutubeToken({
    clientId,
    clientSecret,
    refreshToken: decryptToken(account.refresh_token_enc),
  });

  await supabase
    .from("platform_accounts")
    .update({
      access_token_enc: encryptToken(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken
        ? encryptToken(tokens.refreshToken)
        : account.refresh_token_enc,
      token_expires_at: new Date(
        Date.now() + tokens.expiresIn * 1000
      ).toISOString(),
      status: "connected",
    })
    .eq("id", account.id);

  return tokens.accessToken;
}

async function tiktokAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  account: NonNullable<Awaited<ReturnType<typeof getAccount>>>
): Promise<string> {
  if (account.access_token_enc && isFresh(account.token_expires_at)) {
    return decryptToken(account.access_token_enc);
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("Thiếu TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.");
  }
  if (!account.refresh_token_enc) {
    throw new Error("Không có refresh token — hãy kết nối lại TikTok.");
  }

  const tokens = await refreshTiktokToken({
    clientKey,
    clientSecret,
    refreshToken: decryptToken(account.refresh_token_enc),
  });

  await supabase
    .from("platform_accounts")
    .update({
      access_token_enc: encryptToken(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken
        ? encryptToken(tokens.refreshToken)
        : account.refresh_token_enc,
      token_expires_at: new Date(
        Date.now() + tokens.expiresIn * 1000
      ).toISOString(),
      refresh_expires_at: new Date(
        Date.now() + tokens.refreshExpiresIn * 1000
      ).toISOString(),
      status: "connected",
    })
    .eq("id", account.id);

  return tokens.accessToken;
}

export async function syncFacebook(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const account = await getFacebookAccount(supabase, id);
  if (!account) return;

  try {
    const token = decryptToken(account.access_token_enc);
    const snapshot = await fetchFacebookSnapshot(account.account_id, token);

    await supabase.from("platform_metrics").insert({
      owner_id: me.id,
      platform_account_id: account.id,
      metric_date: new Date().toISOString().slice(0, 10),
      metrics: snapshot as unknown as Json,
    });

    await supabase
      .from("platform_accounts")
      .update({
        status: "connected",
        last_synced_at: new Date().toISOString(),
        metadata: {
          followers: snapshot.followers,
          warnings: snapshot.warnings,
        } as Json,
      })
      .eq("id", account.id);
  } catch (error) {
    await supabase
      .from("platform_accounts")
      .update({
        status: "error",
        metadata: {
          ...(account.metadata as Record<string, Json>),
          last_error: error instanceof Error ? error.message : "Lỗi đồng bộ",
        } as Json,
      })
      .eq("id", account.id);
  }

  revalidatePath("/connections");
}

export async function syncYouTube(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const account = await getAccount(supabase, id);
  if (!account || account.platform !== "youtube") return;

  try {
    const token = await youtubeAccessToken(supabase, account);
    const snapshot = await fetchYoutubeSnapshot(token);

    await supabase.from("platform_metrics").insert({
      owner_id: me.id,
      platform_account_id: account.id,
      metric_date: new Date().toISOString().slice(0, 10),
      metrics: snapshot as unknown as Json,
    });

    await supabase
      .from("platform_accounts")
      .update({
        status: "connected",
        last_synced_at: new Date().toISOString(),
        metadata: {
          subscribers: snapshot.subscribers,
          warnings: snapshot.warnings,
        } as Json,
      })
      .eq("id", account.id);
  } catch (error) {
    await supabase
      .from("platform_accounts")
      .update({
        status: "error",
        metadata: {
          ...(account.metadata as Record<string, Json>),
          last_error: error instanceof Error ? error.message : "Lỗi đồng bộ",
        } as Json,
      })
      .eq("id", account.id);
  }

  revalidatePath("/connections");
}

export async function syncTikTok(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const account = await getAccount(supabase, id);
  if (!account || account.platform !== "tiktok") return;

  try {
    const token = await tiktokAccessToken(supabase, account);
    const snapshot = await fetchTiktokSnapshot(token);

    await supabase.from("platform_metrics").insert({
      owner_id: me.id,
      platform_account_id: account.id,
      metric_date: new Date().toISOString().slice(0, 10),
      metrics: snapshot as unknown as Json,
    });

    await supabase
      .from("platform_accounts")
      .update({
        status: "connected",
        last_synced_at: new Date().toISOString(),
        metadata: {
          followers: snapshot.followers,
          warnings: snapshot.warnings,
        } as Json,
      })
      .eq("id", account.id);
  } catch (error) {
    await supabase
      .from("platform_accounts")
      .update({
        status: "error",
        metadata: {
          ...(account.metadata as Record<string, Json>),
          last_error: error instanceof Error ? error.message : "Lỗi đồng bộ",
        } as Json,
      })
      .eq("id", account.id);
  }

  revalidatePath("/connections");
}

export async function disconnectAccount(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("platform_accounts").delete().eq("id", id);
  revalidatePath("/connections");
}

export async function publishToFacebook(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();

  const parsed = facebookPostSchema.safeParse({
    account_id: formData.get("account_id"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const account = await getFacebookAccount(supabase, parsed.data.account_id);
  if (!account) {
    return { status: "error", message: "Không tìm thấy kết nối Facebook." };
  }

  try {
    const token = decryptToken(account.access_token_enc);
    const post = await publishFacebookPost(
      account.account_id,
      token,
      parsed.data.message
    );
    revalidatePath("/connections");
    return {
      status: "success",
      message: `Đã đăng bài (id ${post.id}).`,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Đăng bài lỗi: ${
        error instanceof Error ? error.message : "không rõ"
      }`,
    };
  }
}
