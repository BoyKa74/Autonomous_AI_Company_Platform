import type { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession, jsonError } from "@/lib/api";

const bodySchema = z.object({
  role: z.enum(["user", "admin"]),
});

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/users/[id]">
) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return jsonError(403, "Chỉ admin được truy cập");
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body phải là JSON hợp lệ");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "role phải là user hoặc admin");

  if (id === user.id && parsed.data.role !== "admin") {
    return jsonError(400, "Không thể tự thu quyền admin của mình");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(400, error.message);
  if (!data) return jsonError(404, "Không tìm thấy người dùng");

  return Response.json({ data });
}
