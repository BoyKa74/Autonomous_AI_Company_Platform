import { createClient } from "@/lib/supabase/server";

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function getApiSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
