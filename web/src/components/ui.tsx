import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { daysBetween } from "@/lib/format";

export type Tone = "neutral" | "accent" | "danger" | "warn" | "ok" | "c1" | "c2" | "c3" | "c4";

const softTone: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  warn: "bg-warning-soft text-warning",
  ok: "bg-success-soft text-success",
  c1: "bg-[color-mix(in_srgb,var(--c1)_14%,transparent)] text-c1",
  c2: "bg-[color-mix(in_srgb,var(--c2)_14%,transparent)] text-c2",
  c3: "bg-[color-mix(in_srgb,var(--c3)_14%,transparent)] text-c3",
  c4: "bg-[color-mix(in_srgb,var(--c4)_14%,transparent)] text-c4",
};

export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow?: ReactNode; title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-[13px] font-medium text-accent">{eyebrow}</div>}
        <h1 className="text-[28px] font-bold leading-tight tracking-[-.025em] md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14.5px] text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[20px] border border-line bg-surface p-5 shadow-soft md:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, tone = "accent", action }: { title: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; tone?: Tone; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconChip icon={icon} tone={tone} size="sm" />}
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function IconChip({ icon: Icon, tone = "accent", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "size-8 rounded-[10px]" : size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const ic = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${softTone[tone]}`}>
      <Icon className={ic} strokeWidth={2} />
    </span>
  );
}

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${softTone[tone]}`}>
      {Icon && <Icon className="size-3" strokeWidth={2.5} />}
      {children}
    </span>
  );
}

export function Kpi({ label, value, sub, icon, tone = "accent", valueTone }: {
  label: string; value: string; sub?: ReactNode; icon?: LucideIcon; tone?: Tone; valueTone?: "pos" | "neg";
}) {
  return (
    <Card className="animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium text-muted">{label}</div>
        {icon && <IconChip icon={icon} tone={tone} size="sm" />}
      </div>
      <div className={`tabular mt-2 text-[26px] font-bold tracking-[-.03em] ${valueTone === "neg" ? "text-danger" : valueTone === "pos" ? "text-success" : ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12.5px] text-muted">{sub}</div>}
    </Card>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function Progress({ pct, tone, color, size = "md" }: { pct: number; tone?: "warn" | "danger"; color?: string; size?: "sm" | "md" }) {
  const bg = color ?? (tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warning)" : "linear-gradient(90deg, var(--accent), var(--accent-2))");
  return (
    <div className={`${size === "sm" ? "h-1.5" : "h-2.5"} overflow-hidden rounded-full bg-surface-3`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: bg }} />
    </div>
  );
}

/** Küçük bilgi kutucuğu. */
export function Stat({ label, children, tone }: { label: string; children: ReactNode; tone?: "danger" | "ok" }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={`tabular mt-0.5 text-[14.5px] font-semibold ${tone === "danger" ? "text-danger" : tone === "ok" ? "text-success" : ""}`}>{children}</div>
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

export function Empty({ icon: Icon, title, children, action }: { icon?: LucideIcon; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {Icon && (
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
          <Icon className="size-6" />
        </span>
      )}
      {title && <div className="font-semibold">{title}</div>}
      {children && <div className="mt-1 max-w-sm text-[13.5px] text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{children}</p>;
}

export function ListRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2 ${className}`}>
      {children}
    </div>
  );
}

/** Takvimdeki gün kutucuğu. */
export function DateTile({ date, tone }: { date: string; tone?: "danger" | "warn" }) {
  const d = new Date(date + "T00:00:00");
  const color = tone === "danger" ? "bg-danger-soft text-danger" : tone === "warn" ? "bg-warning-soft text-warning" : "bg-surface-2 text-fg";
  return (
    <div className={`grid w-12 shrink-0 place-items-center rounded-2xl py-1.5 leading-none ${color}`}>
      <span className="text-[17px] font-bold tabular">{d.getDate()}</span>
      <span className="mt-1 text-[10.5px] font-semibold uppercase opacity-75">
        {d.toLocaleDateString("tr-TR", { month: "short" })}
      </span>
    </div>
  );
}

/** Vadesi yaklaşan / geçen ödeme rozeti. */
export function DueBadge({ date, overdue, today }: { date: string | null; overdue?: boolean; today: string }) {
  if (!date && !overdue) return null;
  const n = date ? daysBetween(today, date) : -1;
  if (overdue || n < 0) return <Badge tone="danger">Gecikmiş</Badge>;
  if (n === 0) return <Badge tone="warn">Bugün</Badge>;
  if (n <= 7) return <Badge tone="warn">{n} gün kaldı</Badge>;
  return null;
}

export function dueTone(date: string, overdue: boolean, today: string): "danger" | "warn" | undefined {
  const n = daysBetween(today, date);
  if (overdue || n < 0) return "danger";
  if (n <= 7) return "warn";
  return undefined;
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-40 rounded-[24px] bg-surface-3/70" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-[20px] bg-surface-3/70" />)}
      </div>
      <div className="h-72 rounded-[20px] bg-surface-3/70" />
    </div>
  );
}
