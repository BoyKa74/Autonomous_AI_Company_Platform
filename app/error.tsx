"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/kit";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bad-400">
        Lỗi hệ thống
      </p>
      <h1 className="font-display text-2xl font-bold text-fog-100">
        Không tải được màn hình này
      </h1>
      <p className="max-w-md text-sm text-fog-500">
        Kiểm tra kết nối Supabase và biến môi trường, sau đó thử lại. Chi tiết
        lỗi đã được ghi ở console.
      </p>
      <div className="flex gap-2">
        <button onClick={reset} className={buttonStyles("primary")}>
          Thử lại
        </button>
        <Link href="/dashboard" className={buttonStyles("secondary")}>
          Về bảng điều khiển
        </Link>
      </div>
    </div>
  );
}
