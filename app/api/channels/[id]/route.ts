import type { NextRequest } from "next/server";
import { getApiSession, jsonError } from "@/lib/api";
import { channelInputSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/channels/[id]">
) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  const { id } = await ctx.params;
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return jsonError(400, error.message);
  if (!data) return jsonError(404, "Không tìm thấy kênh");

  return Response.json({ data });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/channels/[id]">
) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body phải là JSON hợp lệ");
  }

  const parsed = channelInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return jsonError(
      422,
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")
    );
  }

  const { data, error } = await supabase
    .from("channels")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(400, error.message);
  if (!data) return jsonError(404, "Không tìm thấy kênh");

  return Response.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/channels/[id]">
) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  const { id } = await ctx.params;
  const { error, count } = await supabase
    .from("channels")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return jsonError(400, error.message);
  if (!count) return jsonError(404, "Không tìm thấy kênh");

  return Response.json({ ok: true });
}
