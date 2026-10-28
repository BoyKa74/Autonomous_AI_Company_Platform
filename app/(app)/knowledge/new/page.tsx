import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listCompanies } from "@/lib/data";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { Eyebrow, Panel, buttonStyles } from "@/components/ui/kit";
import { ArrowLeftIcon } from "@/components/icons";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Add knowledge" };

export default async function NewKnowledgePage({
  searchParams,
}: PageProps<"/knowledge/new">) {
  await connection();
  const locale = await getLocale();
  const params = await searchParams;
  const companies = await listCompanies();
  const company =
    typeof params.company === "string"
      ? companies.find((entry) => entry.id === params.company) ?? null
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 rise-in">
      <header>
        <Link
          href={company ? `/knowledge?company=${company.id}` : "/knowledge"}
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          {company ? company.name : tr(locale, "Thư viện tri thức")}
        </Link>
        <Eyebrow className="mt-3">{tr(locale, "Tài liệu mới")}</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          {tr(locale, "Thêm vào bộ nhớ AI")}
        </h1>
        <p className="mt-1 text-sm text-fog-500">
          {tr(
            locale,
            "Chọn loại (Prompt / Playbook / …) và mảng cụ thể để AI dùng đúng ngữ cảnh khi làm việc."
          )}
        </p>
      </header>

      <Panel bodyClassName="p-5">
        <KnowledgeForm
          mode="create"
          companies={companies.map((entry) => ({
            id: entry.id,
            name: entry.name,
          }))}
          defaultCompanyId={company?.id}
          locale={locale}
        />
      </Panel>
    </div>
  );
}
