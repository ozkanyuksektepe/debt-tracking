import { CalendarDays, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ItemRow } from "@/components/item-row";
import { Badge, Card, Empty, Hint, PageHeader, PageSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { money, monthName, todayIso } from "@/lib/format";
import type { Account, CalendarMonth } from "@/lib/types";

const OPTIONS = [6, 12, 24];

export default function CalendarPage({ searchParams }: PageProps<"/takvim">) {
  return (
    <Suspense fallback={<><PageHeader eyebrow="Planlama" title="Ödeme takvimi" /><PageSkeleton /></>}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendar({ searchParams }: { searchParams: PageProps<"/takvim">["searchParams"] }) {
  const m = Number((await searchParams).m);
  const months = OPTIONS.includes(m) ? m : 12;
  const [data, accounts] = await Promise.all([
    apiGet<CalendarMonth[]>(`/calendar?months=${months}`),
    apiGet<Account[]>("/accounts"),
  ]);
  const today = todayIso();
  const max = Math.max(...data.map((x) => x.total), 1);

  return (
    <>
      <PageHeader eyebrow="Planlama" title="Ödeme takvimi" subtitle={`Önümüzdeki ${months} ayda ödenecek tutarlar.`}>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-soft">
          {OPTIONS.map((n) => (
            <Link key={n} href={`/takvim?m=${n}`}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                n === months ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg"
              }`}>
              {n} ay
            </Link>
          ))}
        </div>
      </PageHeader>

      {data.length ? (
        <div className="flex flex-col gap-3">
          {data.map((month, idx) => (
            <details key={`${month.year}-${month.month}`} open={idx < 2}
              className="group animate-fade-up overflow-hidden rounded-[20px] border border-line bg-surface shadow-soft">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{monthName(month.year, month.month)}</span>
                    {idx === 0 && <Badge tone="accent">Bu ay</Badge>}
                    <Badge>{month.items.length} ödeme</Badge>
                  </div>
                  <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${(100 * month.total) / max}%` }} />
                  </div>
                </div>
                <b className="tabular text-[17px] font-semibold tracking-tight">{money(month.total)}</b>
                <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-0.5 border-t border-line px-5 py-3">
                {month.items.map((i) => (
                  <ItemRow key={`${i.targetType}${i.targetId}${i.date}${i.note}`} item={i} today={today} accounts={accounts} payable={idx === 0} />
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <Card><Empty icon={CalendarDays} title="Planlanmış ödeme yok">Kredi, kart veya düzenli ödeme eklediğinde burada görünür.</Empty></Card>
      )}
      <Hint>&quot;Tahmini&quot; kalemler kartın dönem içi harcamalarından ve taksitli alışverişlerden hesaplanır; ekstre kesilince güncelle.</Hint>
    </>
  );
}
