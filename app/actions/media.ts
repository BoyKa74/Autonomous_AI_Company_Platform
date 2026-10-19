"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { mediaJobSchema } from "@/lib/validators";
import type { FormState } from "@/lib/action-state";

export async function createMediaJob(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = mediaJobSchema.safeParse({
    kind: formData.get("kind"),
    prompt: formData.get("prompt"),
    channel_id: formData.get("channel_id") ?? undefined,
    vocal_language: formData.get("vocal_language") ?? undefined,
    lyrics: formData.get("lyrics") ?? undefined,
    voice: formData.get("voice") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
    };
  }

  const { kind, prompt, channel_id, vocal_language, lyrics, voice } =
    parsed.data;

  const params =
    kind === "music"
      ? {
          vocal_language: vocal_language || "vi",
          lyrics: lyrics || "",
          inference_steps: 8,
          output_format: "wav16",
        }
      : { voice: voice || "" };

  const supabase = await createClient();
  const { error } = await supabase.from("media_jobs").insert({
    owner_id: me.id,
    channel_id,
    kind,
    prompt,
    params,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/ai");
  return {
    status: "success",
    message:
      "Đã đưa vào hàng đợi. Worker trên máy chạy sẽ xử lý khi máy bật.",
  };
}

export async function cancelMediaJob(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("media_jobs")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["queued", "running"]);

  if (error) throw new Error(error.message);

  revalidatePath("/ai");
}
