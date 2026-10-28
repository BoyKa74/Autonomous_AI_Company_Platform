import Link from "next/link";
import { buttonStyles } from "@/components/ui/kit";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export default async function NotFound() {
  const locale = await getLocale();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal-500">
        404 · {tr(locale, "Không có tín hiệu")}
      </p>
      <h1 className="font-display text-2xl font-bold text-fog-100">
        {tr(locale, "Trang này không tồn tại")}
      </h1>
      <p className="max-w-sm text-sm text-fog-500">
        {tr(
          locale,
          "Đường dẫn có thể đã bị xoá hoặc bạn không có quyền truy cập."
        )}
      </p>
      <Link href="/dashboard" className={buttonStyles("primary")}>
        {tr(locale, "Về bảng điều khiển")}
      </Link>
    </div>
  );
}
