import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? null,
    profile: profile as Profile | null,
  };
});

export async function requireUser() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return me;
}

export async function requireAdmin() {
  const me = await requireUser();
  if (me.profile?.role !== "super_admin") redirect("/dashboard");
  return me;
}
