"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { channelInputSchema } from "@/lib/validators";
import type { FormState } from "@/lib/action-state";

function parseChannelForm(formData: FormData) {
  return channelInputSchema.safeParse({
    name: formData.get("name"),
    platform: formData.get("platform"),
    handle: formData.get("handle") ?? undefined,
    url: formData.get("url") ?? undefined,
    region: formData.get("region"),
    status: formData.get("status"),
    goal: formData.get("goal") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    followers: formData.get("followers") || 0,
  });
}

function revalidateChannels(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/channels");
  if (id) revalidatePath(`/channels/${id}`);
  revalidatePath("/admin/channels");
}

export async function createChannel(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();
  const parsed = parseChannelForm(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .insert({ ...parsed.data, owner_id: me.id })
    .select("id")
    .single();

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidateChannels(data.id);
  redirect(`/channels/${data.id}`);
}

export async function updateChannel(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Thiếu ID kênh." };

  const parsed = parseChannelForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidateChannels(id);
  return { status: "success", message: "Đã lưu thay đổi." };
}

export async function deleteChannel(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("channels").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateChannels();
  redirect("/channels");
}
