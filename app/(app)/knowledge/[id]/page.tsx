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
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export async function generateMetadata({
  params,
}: PageProps<"/knowledge/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const doc = await getKnowledgeDoc(id);
  return { title: doc?.title ?? "Knowledge document" };
}

export default async function KnowledgeDetailPage({
  params,
}: PageProps<"/knowledge/[id]">) {
  await connection();
  const locale = await getLocale();
  const { id } = await params;
  const doc = await getKnowledgeDoc(id);
  if (!doc) notFound();

  const companies = await listCompanies();
  const meta = KNOWLEDGE_CATEGORIES[doc.category];

  return (
    <div className="mx-auto max-w-3xl space-y-6 rise-in">
      <header className="space-y-3">
        <Link
          href={doc.company_id ? `/knowledge?company=${doc.company_id}` : "/knowledge"}
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          {tr(locale, "Thư viện tri thức")}
        </Link>
        <div>
          <Eyebrow>{tr(locale, meta.label)}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {doc.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {doc.company_id ? (
              <Tag>
                {companies.find((company) => company.id === doc.company_id)
                  ?.name ?? tr(locale, "Công ty")}
              </Tag>
            ) : (
              <Tag>{tr(locale, "Dùng chung")}</Tag>
            )}
            {doc.pinned && <Tag>{tr(locale, "Ghim")}</Tag>}
            {doc.active ? (
              <Tag>{tr(locale, "AI đang dùng")}</Tag>
            ) : (
              <Tag>{tr(locale, "Tắt")}</Tag>
            )}
            {doc.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            <span className="font-mono text-[10px] text-fog-600">
              {tr(locale, "Cập nhật")}{" "}
              {formatDateTime(doc.updated_at, locale)}
            </span>
          </div>
        </div>
      </header>

      <Panel
        eyebrow={tr(locale, "Chỉnh sửa")}
        title={tr(locale, "Nội dung tài liệu")}
        bodyClassName="p-5"
      >
        <KnowledgeForm
          mode="edit"
          doc={doc}
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          locale={locale}
        />
      </Panel>

      <Panel
        eyebrow={tr(locale, "Xoá")}
        title={tr(locale, "Xoá khỏi bộ nhớ AI")}
        bodyClassName="p-5"
      >
        <form action={deleteKnowledgeDoc}>
          <input type="hidden" name="id" value={doc.id} />
          <SubmitButton
            variant="danger"
            pendingText={tr(locale, "Đang xoá…")}
            confirm={`${tr(locale, "Xoá tài liệu")} "${doc.title}"?`}
          >
            {tr(locale, "Xoá tài liệu")}
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
