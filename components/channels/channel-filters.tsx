"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select, buttonStyles } from "@/components/ui/kit";
import { PLATFORMS, PLATFORM_ORDER, REGIONS, STATUSES, STATUS_ORDER } from "@/lib/constants";
import { tr, type Locale } from "@/lib/i18n/messages";

export function ChannelFilters({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/channels?${params.toString()}`);
  }

  const hasFilters = ["platform", "status", "region", "q"].some((key) =>
    searchParams.get(key)
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1">
        <Select
          aria-label={tr(locale, "Lọc theo nền tảng")}
          value={searchParams.get("platform") ?? "all"}
          onChange={(event) => apply("platform", event.target.value)}
        >
          <option value="all">{tr(locale, "Tất cả nền tảng")}</option>
          {PLATFORM_ORDER.map((platform) => (
            <option key={platform} value={platform}>
              {tr(locale, PLATFORMS[platform].label)}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-36">
        <Select
          aria-label={tr(locale, "Lọc theo trạng thái")}
          value={searchParams.get("status") ?? "all"}
          onChange={(event) => apply("status", event.target.value)}
        >
          <option value="all">{tr(locale, "Mọi trạng thái")}</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {tr(locale, STATUSES[status].label)}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-32">
        <Select
          aria-label={tr(locale, "Lọc theo khu vực")}
          value={searchParams.get("region") ?? "all"}
          onChange={(event) => apply("region", event.target.value)}
        >
          <option value="all">{tr(locale, "Mọi khu vực")}</option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-48 flex-1">
        <Input
          key={searchParams.get("q") ?? ""}
          aria-label={tr(locale, "Tìm kênh")}
          placeholder={tr(locale, "Tìm theo tên hoặc handle…")}
          defaultValue={searchParams.get("q") ?? ""}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              apply("q", (event.target as HTMLInputElement).value.trim());
            }
          }}
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            const company = searchParams.get("company");
            router.push(company ? `/channels?company=${company}` : "/channels");
          }}
          className={buttonStyles("ghost", "md")}
        >
          {tr(locale, "Xoá lọc")}
        </button>
      )}
    </div>
  );
}
