"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  expenseEntrySchema,
  revenueEntrySchema,
  revenuePlanSchema,
} from "@/lib/validators";
import type { FormState } from "@/lib/action-state";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

export async function addRevenueEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = revenueEntrySchema.safeParse({
    company_id: formData.get("company_id"),
    channel_id: formData.get("channel_id") ?? undefined,
    occurred_on:
      formData.get("occurred_on") || new Date().toISOString().slice(0, 10),
    source: formData.get("source"),
    platform: formData.get("platform") ?? undefined,
    amount_vnd: formData.get("amount_vnd"),
    note: formData.get("note") ?? undefined,
    external_ref: formData.get("external_ref") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("revenue_entries")
    .insert({ ...parsed.data, owner_id: me.id });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/revenue");
  return { status: "success", message: "Đã ghi nhận doanh thu." };
}

export async function addExpenseEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = expenseEntrySchema.safeParse({
    company_id: formData.get("company_id"),
    occurred_on:
      formData.get("occurred_on") || new Date().toISOString().slice(0, 10),
    category: formData.get("category"),
    amount_vnd: formData.get("amount_vnd"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_entries")
    .insert({ ...parsed.data, owner_id: me.id });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/revenue");
  return { status: "success", message: "Đã ghi nhận chi phí." };
}

export async function deleteRevenueEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("revenue_entries").delete().eq("id", id);
  revalidatePath("/revenue");
}

export async function deleteExpenseEntry(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("expense_entries").delete().eq("id", id);
  revalidatePath("/revenue");
}

export async function saveRevenuePlan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireUser();

  const parsed = revenuePlanSchema.safeParse({
    company_id: formData.get("company_id"),
    monthly_revenue_target_vnd: formData.get("monthly_revenue_target_vnd"),
    monthly_views: formData.get("monthly_views"),
    ctr_pct: formData.get("ctr_pct"),
    conversion_pct: formData.get("conversion_pct"),
    avg_order_value_vnd: formData.get("avg_order_value_vnd"),
    commission_pct: formData.get("commission_pct"),
    ads_budget_vnd: formData.get("ads_budget_vnd"),
    usd_vnd_rate: formData.get("usd_vnd_rate"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const {
    company_id,
    monthly_revenue_target_vnd,
    ...planValues
  } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("revenue_plans")
    .upsert(
      { company_id, owner_id: me.id, ...planValues },
      { onConflict: "company_id" }
    );

  if (error) return { status: "error", message: error.message };

  const { error: companyError } = await supabase
    .from("companies")
    .update({ monthly_revenue_target_vnd })
    .eq("id", company_id);

  if (companyError) {
    return { status: "error", message: companyError.message };
  }

  revalidatePath("/revenue");
  return { status: "success", message: "Đã lưu kế hoạch doanh thu." };
}
