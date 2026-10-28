"use client";

import dynamic from "next/dynamic";
import type { AiAgent } from "@/types/database";
import type { Locale } from "@/lib/i18n/messages";

const OrgCanvas = dynamic(
  () => import("@/components/company/org-canvas").then((mod) => mod.OrgCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-600">
          Opening 3D office…
        </p>
      </div>
    ),
  }
);

export function OrgScene(props: {
  agents: AiAgent[];
  activeByAgent: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  spinning: boolean;
  title: string;
  dark: boolean;
  handoffs: { fromId: string; toId: string }[];
  leaderId: string | null;
  locale: Locale;
}) {
  return <OrgCanvas {...props} />;
}
