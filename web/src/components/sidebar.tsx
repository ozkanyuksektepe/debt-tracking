"use client";

import {
  CalendarDays, ChartPie, CreditCard, HandCoins, Landmark, LayoutDashboard, Lock, Receipt, Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./theme-switcher";

type Item = { href: string; label: string; icon: LucideIcon };

const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Genel", items: [{ href: "/", label: "Özet", icon: LayoutDashboard }] },
  {
    title: "Borçlar",
    items: [
      { href: "/krediler", label: "Krediler", icon: Landmark },
      { href: "/kartlar", label: "Kredi kartları", icon: CreditCard },
      { href: "/diger", label: "Diğer borçlar", icon: HandCoins },
    ],
  },
  { title: "Varlıklar", items: [{ href: "/hesaplar", label: "Hesaplar", icon: Wallet }] },
  {
    title: "Planlama",
    items: [
      { href: "/takvim", label: "Ödeme takvimi", icon: CalendarDays },
      { href: "/raporlar", label: "Raporlar", icon: ChartPie },
      { href: "/odemeler", label: "Ödeme geçmişi", icon: Receipt },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Masaüstü */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/70 px-4 py-6 backdrop-blur-xl md:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.08em] text-muted/80">{group.title}</div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[.08em] text-muted/80">Tema</div>
            <ThemeSwitcher />
          </div>
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface-2 p-3.5 text-[12.5px] text-muted">
            <Lock className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>Verilerin yalnızca bu bilgisayarda saklanır.</span>
          </div>
        </div>
      </aside>

      {/* Mobil */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <Brand compact />
          <ThemeSwitcher compact />
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {ALL.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "border-transparent bg-accent text-white" : "border-line bg-surface text-fg"
                }`}>
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 px-2">
      <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 font-bold text-white shadow-[0_8px_20px_-8px_var(--accent)] ${compact ? "size-8 text-base" : "size-10 text-lg"}`}>
        ₺
      </span>
      <div className="leading-tight">
        <div className="font-semibold tracking-tight">Borç Takibi</div>
        <div className="text-xs text-muted">Kişisel finans paneli</div>
      </div>
    </Link>
  );
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-[14.5px] font-medium transition-colors ${
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}>
      <Icon className={`size-[18px] ${active ? "text-accent" : "text-muted group-hover:text-fg"}`} strokeWidth={2} />
      {item.label}
      {active && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
    </Link>
  );
}
