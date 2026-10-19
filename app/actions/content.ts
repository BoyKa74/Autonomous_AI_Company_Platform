"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  contentInputSchema,
  contentStatusSchema,
} from "@/lib/validators";
import type { FormState } from "@/lib/action-state";

export async function saveContent(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();
  const parsed = contentInputSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    channel_id: formData.get("channel_id") ?? undefined,
    content: formData.get("content"),
    ai_provider: formData.get("ai_provider") ?? null,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_items")
    .insert({ ...parsed.data, owner_id: me.id, status: "draft" });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/ai");
  if (parsed.data.channel_id) {
    revalidatePath(`/channels/${parsed.data.channel_id}`);
  }
  return { status: "success", message: "Đã lưu vào kho nội dung." };
}

function revalidateContent(channelId?: FormDataEntryValue | null) {
  revalidatePath("/dashboard");
  revalidatePath("/ai");
  revalidatePath("/channels");
  if (typeof channelId === "string" && channelId) {
    revalidatePath(`/channels/${channelId}`);
  }
}

export async function setContentStatus(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = contentStatusSchema.safeParse(formData.get("status"));
  if (!id || !parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_items")
    .update({ status: parsed.data })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidateContent(formData.get("channel_id"));
}

export async function deleteContentItem(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateContent(formData.get("channel_id"));
}
