import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listCompanies } from "@/lib/data";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { Eyebrow, Panel, buttonStyles } from "@/components/ui/kit";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Thêm tài liệu" };

export default async function NewKnowledgePage() {
  await connection();
  const companies = await listCompanies();

  return (
    <div className="mx-auto max-w-3xl space-y-6 rise-in">
      <header>
        <Link
          href="/knowledge"
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          Thư viện tri thức
        </Link>
        <Eyebrow className="mt-3">Tài liệu mới</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          Thêm vào bộ nhớ AI
        </h1>
        <p className="mt-1 text-sm text-fog-500">
          Chọn loại (Prompt / Playbook / …) và mảng cụ thể để AI dùng đúng
          ngữ cảnh khi làm việc.
        </p>
      </header>

      <Panel bodyClassName="p-5">
        <KnowledgeForm
          mode="create"
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
        />
      </Panel>
    </div>
  );
}
