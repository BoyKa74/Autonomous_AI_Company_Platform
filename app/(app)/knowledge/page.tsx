import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listCompanies, listKnowledgeDocs } from "@/lib/data";
import {
  EmptyState,
  Eyebrow,
  Tag,
  buttonStyles,
} from "@/components/ui/kit";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_DOMAINS } from "@/lib/constants";
import { PlusIcon } from "@/components/icons";
import { CompanyNav } from "@/components/company/company-nav";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";
import { formatDateTime } from "@/lib/utils";
import type { KnowledgeCategory } from "@/types/database";

export const metadata: Metadata = { title: "Knowledge library" };

export default async function KnowledgePage({
  searchParams,
}: PageProps<"/knowledge">) {
  await connection();
  const locale = await getLocale();
  const params = await searchParams;
  const category =
    typeof params.category === "string" ? params.category : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const companies = await listCompanies();
  const selectedCompany =
    typeof params.company === "string"
      ? companies.find((company) => company.id === params.company) ?? null
      : null;
  const docs = await listKnowledgeDocs({
    companyId: selectedCompany?.id ?? null,
  });
  const createHref = selectedCompany
    ? `/knowledge/new?company=${selectedCompany.id}`
    : "/knowledge/new";
  const companyQuery = selectedCompany ? `&company=${selectedCompany.id}` : "";

  const filtered = docs.filter((doc) => {
    if (category !== "all" && doc.category !== category) return false;
    if (
      q &&
      !`${doc.title} ${doc.content} ${doc.tags.join(" ")} ${doc.domain}`
        .toLowerCase()
        .includes(q.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const counts = Object.keys(KNOWLEDGE_CATEGORIES).reduce(
    (acc, key) => {
      acc[key] = docs.filter((doc) => doc.category === key).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const companyName = new Map(
    companies.map((company) => [company.id, company.name])
  );

  const grouped = new Map<string, typeof filtered>();
  for (const doc of filtered) {
    const list = grouped.get(doc.domain) ?? [];
    list.push(doc);
    grouped.set(doc.domain, list);
  }

  const domainOrder = (domain: string) => {
    const index = KNOWLEDGE_DOMAINS.indexOf(domain);
    return index === -1 ? KNOWLEDGE_DOMAINS.length : index;
  };

  const domains = [...grouped.keys()].sort(
    (a, b) => domainOrder(a) - domainOrder(b) || a.localeCompare(b)
  );

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {selectedCompany ? tr(locale, "Công ty AI") : tr(locale, "Dùng chung")}
          </Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {selectedCompany
              ? `${tr(locale, "Tri thức")} · ${selectedCompany.name}`
              : tr(locale, "Thư viện tri thức dùng chung")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fog-500">
            {tr(
              locale,
              "Mỗi tài liệu thuộc một loại (Prompt, Playbook, SOP…) và một mảng (Content Facebook, SEO, Sách…). AI tự nạp tài liệu đang bật vào mỗi bước chạy."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <Link href="/knowledge" className={buttonStyles("ghost", "sm")}>
              {tr(locale, "Tri thức dùng chung")}
            </Link>
          )}
          <Link href={createHref} className={buttonStyles("primary")}>
            <PlusIcon className="size-3.5" />
            {tr(locale, "Thêm tài liệu")}
          </Link>
        </div>
      </header>

      {selectedCompany && <CompanyNav company={selectedCompany}  locale={locale} />}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/knowledge${companyQuery ? `?${companyQuery.slice(1)}` : ""}`}
          className={buttonStyles(
            category === "all" ? "primary" : "secondary",
            "sm"
          )}
        >
          {tr(locale, "Tất cả")} ({docs.length})
        </Link>
        {(Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]).map(
          (key) => (
            <Link
              key={key}
              href={`/knowledge?category=${key}${companyQuery}`}
              className={buttonStyles(
                category === key ? "primary" : "secondary",
                "sm"
              )}
            >
              {tr(locale, KNOWLEDGE_CATEGORIES[key].label)} ({counts[key] ?? 0})
            </Link>
          )
        )}
        <form method="get" className="ml-auto flex items-center gap-2">
          {category !== "all" && (
            <input type="hidden" name="category" value={category} />
          )}
          {selectedCompany && (
            <input type="hidden" name="company" value={selectedCompany.id} />
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder={tr(locale, "Tìm trong tri thức…")}
            className="h-8 w-56 rounded-md border border-ink-600 bg-white px-2.5 text-xs text-fog-100 placeholder:text-fog-600 focus:border-signal-500 focus:outline-none"
          />
          <button type="submit" className={buttonStyles("secondary", "sm")}>
            {tr(locale, "Tìm")}
          </button>
        </form>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tr(locale, "Chưa có tài liệu nào")}
          description={tr(
              locale,
              "Thêm prompt hoặc quy trình đầu tiên — AI sẽ dùng ngay trong lần chạy kế tiếp."
            )}
          action={
            <Link href={createHref} className={buttonStyles("primary", "sm")}>
              {tr(locale, "Thêm tài liệu")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => {
            const domainDocs = grouped.get(domain) ?? [];
            return (
              <details key={domain} open className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-ink-700 bg-white px-4 py-3 transition-colors hover:border-ink-500">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-block size-1.5 rounded-full bg-signal-500" />
                    <span className="font-display text-sm font-semibold text-fog-100">
                      {domain}
                    </span>
                    <Tag>{domainDocs.length} {tr(locale, "tài liệu")}</Tag>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fog-600 group-open:hidden">
                    {tr(locale, "mở")}
                  </span>
                  <span className="hidden font-mono text-[10px] uppercase tracking-wider text-fog-600 group-open:inline">
                    {tr(locale, "đóng")}
                  </span>
                </summary>

                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {domainDocs.map((doc) => {
                    const meta = KNOWLEDGE_CATEGORIES[doc.category];
                    return (
                      <Link
                        key={doc.id}
                        href={`/knowledge/${doc.id}${
                          selectedCompany ? `?company=${selectedCompany.id}` : ""
                        }`}
                        className="group/card flex flex-col gap-1.5 rounded-lg border border-ink-700 bg-white px-3.5 py-3 transition-colors hover:border-ink-500"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-mono text-[10px] uppercase tracking-wider"
                            style={{ color: meta.color }}
                          >
                            {tr(locale, meta.label)}
                          </span>
                          <span className="flex items-center gap-1">
                            {doc.pinned && <Tag>{tr(locale, "ghim")}</Tag>}
                            {!doc.active && <Tag>{tr(locale, "tắt")}</Tag>}
                          </span>
                        </div>
                        <h3 className="line-clamp-1 text-sm font-semibold text-fog-100 group-hover/card:text-signal-500">
                          {doc.title}
                        </h3>
                        <p className="line-clamp-2 text-xs leading-relaxed text-fog-500">
                          {doc.content}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {doc.company_id ? (
                            <Tag>
                              {companyName.get(doc.company_id) ?? tr(locale, "Công ty")}
                            </Tag>
                          ) : (
                            <Tag>{tr(locale, "Dùng chung")}</Tag>
                          )}
                          {doc.tags.slice(0, 2).map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                          <span className="ml-auto font-mono text-[10px] text-fog-600">
                            {formatDateTime(doc.updated_at, locale)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
