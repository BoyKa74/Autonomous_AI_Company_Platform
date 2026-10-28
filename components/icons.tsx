import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  } as const;
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 15l4-6" />
      <path d="M4 20a8 8 0 1 1 16 0" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BroadcastIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" />
      <path d="M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19c.7-3 2.9-4.6 5.5-4.6s4.8 1.6 5.5 4.6" />
      <path d="M15.5 6.4a3.2 3.2 0 0 1 0 5.4M17.8 14.8c1.4.8 2.4 2.3 2.8 4.2" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" transform="translate(2 2)" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l7 3v5c0 4.5-2.8 7.8-7 9-4.2-1.2-7-4.5-7-9V6z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </svg>
  );
}

export function PlugIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8z" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
      <path d="M4 7v11a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H6a2 2 0 0 1-2-2z" />
      <circle cx="16.5" cy="14" r="1.2" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22V4.5z" />
      <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19" />
      <path d="M9 6h6M9 10h6" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h3a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18" />
      <path d="M8 7h3M8 11h3M8 15h3" />
    </svg>
  );
}
