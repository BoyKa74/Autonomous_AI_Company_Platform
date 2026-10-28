"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validators";
import type { FormState } from "@/lib/action-state";

export async function updateUserRole(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const role = z.enum(["user", "admin", "super_admin"]).safeParse(formData.get("role"));

  if (!userId || !role.success) {
    return { status: "error", message: "Dữ liệu không hợp lệ." };
  }

  if (userId === me.id && role.data !== "super_admin") {
    return {
      status: "error",
      message: "Không thể tự thu quyền super_admin của mình.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: role.data })
    .eq("id", userId);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/users");
  return { status: "success", message: "Đã cập nhật quyền." };
}

export async function updateProfile(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Bạn cần đăng nhập lại." };
  }

  const parsed = profileUpdateSchema.safeParse({
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Đã lưu hồ sơ." };
}
