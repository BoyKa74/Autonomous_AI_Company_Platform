import { getApiSession, jsonError } from "@/lib/api";

export async function GET() {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") {
    return jsonError(403, "Chỉ super_admin được truy cập");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return jsonError(400, error.message);

  return Response.json({ data });
}
