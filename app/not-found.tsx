import Link from "next/link";
import { buttonStyles } from "@/components/ui/kit";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal-500">
        404 · Không có tín hiệu
      </p>
      <h1 className="font-display text-2xl font-bold text-fog-100">
        Trang này không tồn tại
      </h1>
      <p className="max-w-sm text-sm text-fog-500">
        Đường dẫn có thể đã bị xoá hoặc bạn không có quyền truy cập.
      </p>
      <Link href="/dashboard" className={buttonStyles("primary")}>
        Về bảng điều khiển
      </Link>
    </div>
  );
}
