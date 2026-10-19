"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select, buttonStyles } from "@/components/ui/kit";
import { PLATFORMS, PLATFORM_ORDER, REGIONS, STATUSES, STATUS_ORDER } from "@/lib/constants";

export function ChannelFilters() {
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
          aria-label="Lọc theo nền tảng"
          value={searchParams.get("platform") ?? "all"}
          onChange={(event) => apply("platform", event.target.value)}
        >
          <option value="all">Tất cả nền tảng</option>
          {PLATFORM_ORDER.map((platform) => (
            <option key={platform} value={platform}>
              {PLATFORMS[platform].label}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-36">
        <Select
          aria-label="Lọc theo trạng thái"
          value={searchParams.get("status") ?? "all"}
          onChange={(event) => apply("status", event.target.value)}
        >
          <option value="all">Mọi trạng thái</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUSES[status].label}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-32">
        <Select
          aria-label="Lọc theo khu vực"
          value={searchParams.get("region") ?? "all"}
          onChange={(event) => apply("region", event.target.value)}
        >
          <option value="all">Mọi khu vực</option>
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
          aria-label="Tìm kênh"
          placeholder="Tìm theo tên hoặc handle…"
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
          onClick={() => router.push("/channels")}
          className={buttonStyles("ghost", "md")}
        >
          Xoá lọc
        </button>
      )}
    </div>
  );
}
