import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import type { ChannelPlatform, ChannelStatus } from "@/types/database";
import { PLATFORMS, STATUSES } from "@/lib/constants";

/* ---------- Buttons ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export function buttonStyles(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm",
    variant === "primary" &&
      "bg-signal-500 text-[#241503] hover:bg-signal-400 active:bg-signal-600",
    variant === "secondary" &&
      "border border-ink-600 bg-ink-700 text-fog-100 hover:bg-ink-600",
    variant === "ghost" && "text-fog-300 hover:bg-ink-800 hover:text-fog-100",
    variant === "danger" &&
      "border border-bad-400/40 text-bad-400 hover:bg-bad-400/10",
    className
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonStyles(variant, size, className)} {...props} />;
}

/* ---------- Panel ---------- */

export function Panel({
  id,
  title,
  eyebrow,
  actions,
  className,
  bodyClassName,
  children,
}: {
  id?: string;
  title?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 rounded-lg border border-ink-700 bg-ink-850",
        className
      )}
    >
      {(title || actions || eyebrow) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-4 py-3">
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && (
              <h3 className="font-display text-sm font-semibold text-fog-100">
                {title}
              </h3>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-fog-500",
        className
      )}
    >
      {children}
    </p>
  );
}

/* ---------- Tín hiệu ---------- */

export function TallyDot({
  color,
  live = false,
  size = 8,
  className,
}: {
  color: string;
  live?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", live && "tally-live", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color,
        boxShadow: `0 0 8px ${color}66`,
      }}
    />
  );
}

export function MeterBar({
  value,
  color = "#f0a63c",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-700", className)}
      role="presentation"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ---------- Chips ---------- */

export function PlatformChip({
  platform,
  withDot = true,
  className,
  label,
}: {
  platform: ChannelPlatform;
  withDot?: boolean;
  className?: string;
  label?: string;
}) {
  const meta = PLATFORMS[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider",
        className
      )}
      style={{
        color: meta.color,
        borderColor: `${meta.color}44`,
        backgroundColor: `${meta.color}14`,
      }}
    >
      {withDot && <TallyDot color={meta.color} size={6} />}
      {label ?? meta.short}
    </span>
  );
}

export function StatusChip({
  status,
  className,
  label,
}: {
  status: ChannelStatus;
  className?: string;
  label?: string;
}) {
  const meta = STATUSES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider",
        className
      )}
      style={{ color: meta.color }}
    >
      <TallyDot color={meta.color} live={meta.live} size={7} />
      {label ?? meta.label}
    </span>
  );
}

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-fog-500",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Form ---------- */

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fog-500",
        className
      )}
    >
      {children}
    </label>
  );
}

const fieldStyles =
  "w-full rounded-md border border-ink-600 bg-ink-900 px-3 text-sm text-fog-100 placeholder:text-fog-600 transition-colors focus:border-signal-500 focus:outline-none focus:ring-2 focus:ring-signal-500/25 disabled:opacity-50";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, "h-9", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(fieldStyles, "py-2", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldStyles, "h-9 appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-fog-600">{hint}</p>}
    </div>
  );
}

/* ---------- Misc ---------- */

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-md border px-3 py-2.5 text-sm",
        tone === "error" && "border-bad-400/35 bg-bad-400/10 text-bad-400",
        tone === "success" && "border-ok-400/35 bg-ok-400/10 text-ok-400",
        tone === "info" && "border-info-400/35 bg-info-400/10 text-info-400"
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink-600 px-6 py-10 text-center">
      <p className="font-display text-sm font-semibold text-fog-100">{title}</p>
      <p className="max-w-sm text-sm text-fog-500">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function DataValue({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "font-mono text-sm font-medium tabular-nums text-fog-100",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
