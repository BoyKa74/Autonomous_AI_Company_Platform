"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  knowledgeDocSchema,
  knowledgeDocUpdateSchema,
} from "@/lib/validators";
import type { FormState } from "@/lib/action-state";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

export async function createKnowledgeDoc(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = knowledgeDocSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    domain: formData.get("domain") ?? "Chung",
    company_id: formData.get("company_id") ?? undefined,
    content: formData.get("content"),
    tags: formData.get("tags") ?? "",
    pinned: formData.get("pinned") === "on",
    active: formData.get("active") !== null,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_docs")
    .insert({ ...parsed.data, owner_id: me.id })
    .select("id")
    .single();

  if (error) return { status: "error", message: error.message };

  revalidatePath("/knowledge");
  redirect(`/knowledge/${data.id}`);
}

export async function updateKnowledgeDoc(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();

  const parsed = knowledgeDocUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    category: formData.get("category"),
    domain: formData.get("domain") ?? "Chung",
    company_id: formData.get("company_id") ?? undefined,
    content: formData.get("content"),
    tags: formData.get("tags") ?? "",
    pinned: formData.get("pinned") === "on",
    active: formData.get("active") !== null,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const { id, ...updates } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_docs")
    .update(updates)
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${id}`);
  return { status: "success", message: "Đã lưu tài liệu." };
}

export async function deleteKnowledgeDoc(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/knowledge");
  redirect("/knowledge");
}
