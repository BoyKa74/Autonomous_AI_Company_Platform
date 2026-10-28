import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, KnowledgeDoc } from "@/types/database";

/**
 * Nạp tài liệu tri thức đang bật cho một công ty:
 * tài liệu dùng chung (company_id null) + tài liệu riêng của công ty.
 */
export async function loadKnowledgeDocs(
  client: SupabaseClient<Database>,
  ownerId: string,
  companyId: string | null
): Promise<KnowledgeDoc[]> {
  const shared = await client
    .from("knowledge_docs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("active", true)
    .is("company_id", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(6);

  let scoped: KnowledgeDoc[] = [];
  if (companyId) {
    const result = await client
      .from("knowledge_docs")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("active", true)
      .eq("company_id", companyId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(6);
    scoped = (result.data ?? []) as KnowledgeDoc[];
  }

  const seen = new Set<string>();
  return [...((shared.data ?? []) as KnowledgeDoc[]), ...scoped].filter(
    (doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    }
  );
}

export async function buildKnowledgeContext(
  client: SupabaseClient<Database>,
  ownerId: string,
  companyId: string | null
): Promise<string> {
  const docs = await loadKnowledgeDocs(client, ownerId, companyId);
  if (docs.length === 0) return "";

  const body = docs
    .slice(0, 6)
    .map(
      (doc) =>
        `### [${doc.category} / ${doc.domain}] ${doc.title}${doc.pinned ? " (ghim)" : ""}\n${doc.content.slice(0, 1400)}`
    )
    .join("\n\n");

  return `\n\n[KHO TRI THỨC CỦA DOANH NGHIỆP — BẮT BUỘC TUÂN THỦ]
Các tài liệu dưới đây là chuẩn làm việc của chủ doanh nghiệp. Hãy áp dụng đúng hướng dẫn, giọng điệu và công thức trong đó; nếu mâu thuẫn với yêu cầu, ưu tiên tài liệu ghim.

${body.slice(0, 6000)}`;
}
