"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

const registerSchema = loginSchema.extend({
  full_name: z.string().trim().min(1, "Nhập tên của bạn").max(120),
});

function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (normalized.includes("already registered")) {
    return "Email này đã được đăng ký. Hãy đăng nhập.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Kiểm tra hộp thư của bạn.";
  }
  if (normalized.includes("password should be")) {
    return "Mật khẩu chưa đủ mạnh (tối thiểu 6 ký tự).";
  }
  if (normalized.includes("rate limit")) {
    return "Bạn thao tác quá nhanh. Thử lại sau ít phút.";
  }
  return message;
}

export async function login(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: translateAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function register(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  });

  if (error) {
    return { status: "error", message: translateAuthError(error.message) };
  }

  if (!data.session) {
    return {
      status: "success",
      message:
        "Tài khoản đã tạo. Mở email để xác nhận, sau đó quay lại đăng nhập.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
