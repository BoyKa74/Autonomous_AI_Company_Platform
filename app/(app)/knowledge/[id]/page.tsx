import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getKnowledgeDoc, listCompanies } from "@/lib/data";
import { deleteKnowledgeDoc } from "@/app/actions/knowledge";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Eyebrow,
  Panel,
  Tag,
  buttonStyles,
} from "@/components/ui/kit";
import { KNOWLEDGE_CATEGORIES } from "@/lib/constants";
import { ArrowLeftIcon } from "@/components/icons";
import { formatDateTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/knowledge/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const doc = await getKnowledgeDoc(id);
  return { title: doc?.title ?? "Tài liệu" };
}

export default async function KnowledgeDetailPage({
  params,
}: PageProps<"/knowledge/[id]">) {
  await connection();
  const { id } = await params;
  const doc = await getKnowledgeDoc(id);
  if (!doc) notFound();

  const companies = await listCompanies();
  const meta = KNOWLEDGE_CATEGORIES[doc.category];

  return (
    <div className="mx-auto max-w-3xl space-y-6 rise-in">
      <header className="space-y-3">
        <Link
          href="/knowledge"
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          Thư viện tri thức
        </Link>
        <div>
          <Eyebrow>{meta.label}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {doc.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {doc.company_id ? (
              <Tag>
                {companies.find((company) => company.id === doc.company_id)
                  ?.name ?? "Công ty"}
              </Tag>
            ) : (
              <Tag>Dùng chung</Tag>
            )}
            {doc.pinned && <Tag>Ghim</Tag>}
            {doc.active ? <Tag>AI đang dùng</Tag> : <Tag>Tắt</Tag>}
            {doc.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            <span className="font-mono text-[10px] text-fog-600">
              Cập nhật {formatDateTime(doc.updated_at)}
            </span>
          </div>
        </div>
      </header>

      <Panel eyebrow="Chỉnh sửa" title="Nội dung tài liệu" bodyClassName="p-5">
        <KnowledgeForm
          mode="edit"
          doc={doc}
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
        />
      </Panel>

      <Panel eyebrow="Xoá" title="Xoá khỏi bộ nhớ AI" bodyClassName="p-5">
        <form action={deleteKnowledgeDoc}>
          <input type="hidden" name="id" value={doc.id} />
          <SubmitButton
            variant="danger"
            pendingText="Đang xoá…"
            confirm={`Xoá tài liệu "${doc.title}"?`}
          >
            Xoá tài liệu
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
