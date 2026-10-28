import { Brand } from "@/components/layout/sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, rgba(205,134,21,0.08), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(203,211,222,0.55) 1px, transparent 1px)",
          backgroundSize: "100% 44px",
        }}
      />

      <div className="relative flex w-full max-w-sm flex-col items-center rise-in">
        <Brand />
        <div className="mt-6 w-full">{children}</div>
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-fog-600">
          YouTube · TikTok · Facebook · Books · Marketplaces
        </p>
      </div>
    </div>
  );
}
