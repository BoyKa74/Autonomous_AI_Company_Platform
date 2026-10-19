import type { NextRequest } from "next/server";
import { getApiSession, jsonError } from "@/lib/api";
import { channelInputSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  const { searchParams } = request.nextUrl;
  let query = supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: false });

  const platform = searchParams.get("platform");
  const status = searchParams.get("status");
  const region = searchParams.get("region");
  const q = searchParams.get("q");

  if (platform) query = query.eq("platform", platform as never);
  if (status) query = query.eq("status", status as never);
  if (region) query = query.eq("region", region);
  if (q) {
    const safeQuery = q.replace(/[(),]/g, " ").trim();
    if (safeQuery) {
      query = query.or(
        `name.ilike.%${safeQuery}%,handle.ilike.%${safeQuery}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) return jsonError(400, error.message);

  return Response.json({ data });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body phải là JSON hợp lệ");
  }

  const parsed = channelInputSchema.safeParse(body);
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
    .insert({ ...parsed.data, owner_id: user.id })
    .select("*")
    .single();

  if (error) return jsonError(400, error.message);

  return Response.json({ data }, { status: 201 });
}
