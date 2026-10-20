import { AlertTriangle, ArrowUpRight, CalendarClock, CircleCheck, CreditCard, HandCoins, Landmark, PieChart, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BankLogo } from "@/components/bank-logo";
import { Donut, Legend } from "@/components/charts";
import { ItemRow } from "@/components/item-row";
import { Badge, Card, CardHeader, Empty, IconChip, Kpi, KpiGrid, ListRow, PageHeader, PageSkeleton, Progress } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { fmtDate, fmtDay, money } from "@/lib/format";
import type { Overview } from "@/lib/types";

export default function DashboardPage() {
  return (
    <Suspense fallback={<><PageHeader eyebrow="Genel bakış" title="Finansal durumum" /><PageSkeleton /></>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const d = await apiGet<Overview>("/overview");

  const debtRows = [
    ...d.loans.filter((l) => l.remainingInstallments > 0).map((l) => ({
      key: `l${l.loan.id}`, title: l.loan.name, bank: l.loan.bank, href: "/krediler", color: "var(--c1)",
      meta: `${l.remainingInstallments} taksit kaldı`, amount: l.remainingTotal, overdue: l.overdueCount > 0, progress: l.progressPct,
    })),
    ...d.cards.filter((c) => c.totalDebt > 0).map((c) => ({
      key: `c${c.card.id}`, title: c.card.name, bank: c.card.bank, href: "/kartlar", color: "var(--c2)",
      meta: c.card.statementBalance > 0 ? `Son ödeme ${fmtDay(c.dueDate)}` : "Dönem borcu ödendi", amount: c.totalDebt, overdue: c.isOverdue,
      progress: c.card.limit > 0 ? c.utilizationPct : null,
    })),
    ...d.others.filter((o) => o.debt.kind === "Borç" && o.debt.remainingAmount > 0).map((o) => ({
      key: `o${o.debt.id}`, title: o.debt.name, bank: null, href: "/diger", color: "var(--c3)",
      meta: o.debt.creditor ?? (o.nextDueDate ? `Sonraki ödeme ${fmtDay(o.nextDueDate)}` : "Kişisel borç"), amount: o.debt.remainingAmount, overdue: false,
      progress: null,
    })),
  ].sort((a, b) => b.amount - a.amount);

  const parts = [
    { label: "Krediler", value: d.loansRemainingTotal, color: "var(--c1)" },
    { label: "Kredi kartları", value: d.cardsTotal, color: "var(--c2)" },
    { label: "Diğer borçlar", value: d.othersTotal, color: "var(--c3)" },
  ];

  const upcoming = [...d.overdue, ...d.upcoming];
  const overdueTotal = d.overdue.reduce((s, i) => s + i.amount, 0);
  const isEmpty = !d.loans.length && !d.cards.length && !d.others.length && !d.accounts.length;
  const coverage = d.thisMonthDue > 0 ? Math.min(100, (100 * d.totalAssets) / d.thisMonthDue) : 100;

  return (
    <>
      <PageHeader eyebrow={fmtDate(d.today)} title="Finansal durumum" subtitle="Borçların, paran ve yaklaşan ödemelerin tek bakışta." />

      {isEmpty && (
        <Card className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <IconChip icon={Sparkles} size="lg" />
          <div className="flex-1">
            <div className="font-semibold">Hoş geldin! Başlamak için bilgilerini ekle.</div>
            <div className="text-[13.5px] text-muted">Bütün veriler yalnızca bu bilgisayarda saklanır.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/hesaplar" className="btn btn-sm">Hesap ekle</Link>
            <Link href="/krediler" className="btn btn-sm">Kredi ekle</Link>
            <Link href="/kartlar" className="btn btn-sm">Kart ekle</Link>
          </div>
        </Card>
      )}

      {d.overdue.length > 0 && (
        <div className="mb-6 flex animate-fade-up items-center gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-danger">
          <AlertTriangle className="size-5 shrink-0" />
          <div className="flex-1 text-[14px] font-medium">
            {d.overdue.length} gecikmiş ödeme var · toplam <b className="tabular">{money(overdueTotal)}</b>
          </div>
          <Link href="/takvim" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">
            Takvime git <ArrowUpRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Ana özet kartı */}
      <section className="relative mb-6 animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4f46e5] via-[#6d4cf0] to-[#9333ea] p-6 text-white shadow-[0_24px_48px_-20px_rgba(79,70,229,.6)] md:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-[2px]" />
        <div aria-hidden className="absolute -bottom-32 right-40 size-72 rounded-full bg-white/[.07]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <div className="text-[13.5px] font-medium text-white/75">Toplam kalan borç</div>
            <div className="tabular mt-1 text-[40px] font-bold leading-none tracking-[-.035em] md:text-[52px]">{money(d.totalDebt)}</div>
            <div className="mt-3 text-[13.5px] text-white/75">
              Kalan anapara bazında <b className="tabular font-semibold text-white">{money(d.totalDebtPrincipalBased)}</b>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <HeroStat label="Bu ay kalan" value={money(d.thisMonthDue)} />
            <HeroStat label="Mevcut param" value={money(d.totalAssets)} />
            <HeroStat label="Ödemeler sonrası" value={money(d.afterPayments)} negative={d.afterPayments < 0} />
          </div>
        </div>
        {d.thisMonthDue > 0 && (
          <div className="relative mt-6">
            <div className="mb-1.5 flex justify-between text-[12px] text-white/75">
              <span>Mevcut paranın bu ayki ödemeleri karşılama oranı</span>
              <span className="tabular font-semibold text-white">%{Math.round(coverage)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${coverage}%` }} />
            </div>
          </div>
        )}
      </section>

      <KpiGrid>
        <Kpi label="Krediler" value={money(d.loansRemainingTotal)} icon={Landmark} tone="c1"
          sub={`${d.loans.filter((l) => l.remainingInstallments > 0).length} aktif kredi`} />
        <Kpi label="Kredi kartları" value={money(d.cardsTotal)} icon={CreditCard} tone="c2"
          sub={`Dönem borçları ${money(d.cardsStatementTotal)}`} />
        <Kpi label="Diğer borçlar" value={money(d.othersTotal)} icon={HandCoins} tone="c3"
          sub={`Düzenli ödemeler aylık ${money(d.monthlyRecurring)}`} />
        <Kpi label="Bu ay ödenen" value={money(d.paidThisMonth)} icon={CircleCheck} tone="ok"
          sub="Ödeme geçmişine kaydedilenler" />
      </KpiGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="animate-fade-up">
          <CardHeader title="Yaklaşan ödemeler" subtitle="Gecikmişler ve önümüzdeki 30 gün" icon={CalendarClock}
            action={<Link href="/takvim" className="btn-ghost btn-sm">Tümü <ArrowUpRight className="size-3.5" /></Link>} />
          {upcoming.length ? (
            <div className="flex flex-col gap-0.5">
              {upcoming.map((i) => <ItemRow key={`${i.targetType}${i.targetId}${i.date}`} item={i} today={d.today} accounts={d.accounts} />)}
            </div>
          ) : (
            <Empty icon={CalendarClock} title="Önümüzdeki 30 günde ödeme yok">Rahat bir ay seni bekliyor.</Empty>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="animate-fade-up">
            <CardHeader title="Borç dağılımı" icon={PieChart} />
            {d.totalDebt > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
                <Donut data={parts} size={168} centerLabel="Toplam" centerValue={money(d.totalDebt)} />
                <div className="flex w-full flex-1 flex-col gap-2.5">
                  {parts.map((p) => (
                    <div key={p.label} className="flex items-center gap-2.5 text-[13.5px]">
                      <i className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="flex-1 text-muted">{p.label}</span>
                      <b className="tabular font-semibold">{money(p.value)}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Empty icon={PieChart}>Kayıtlı borç yok.</Empty>
            )}
          </Card>

          <Card className="animate-fade-up">
            <CardHeader title="Borçlarım" icon={Wallet} subtitle={`${debtRows.length} kayıt`} />
            {debtRows.length ? (
              <div className="flex flex-col gap-0.5">
                {debtRows.map((r) => (
                  <Link key={r.key} href={r.href} className="block">
                    <ListRow>
                      {r.bank ? <BankLogo bank={r.bank} size={36} /> : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-[28%] text-white" style={{ background: r.color }}>
                          <HandCoins className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className="truncate">{r.title}</span>
                          {r.overdue && <Badge tone="danger">Gecikmiş</Badge>}
                        </div>
                        <div className="text-[12.5px] text-muted">{r.meta}</div>
                        {r.progress !== null && <div className="mt-1.5"><Progress pct={r.progress} size="sm" color={r.color} /></div>}
                      </div>
                      <div className="tabular whitespace-nowrap font-semibold">{money(r.amount)}</div>
                    </ListRow>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty icon={Wallet}>Kayıtlı borç yok.</Empty>
            )}
            {debtRows.length > 0 && <Legend items={[{ label: "Kredilerde ilerleme, kartlarda limit kullanımı gösterilir", color: "var(--surface-3)" }]} />}
          </Card>
        </div>
      </div>
    </>
  );
}

function HeroStat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
      <div className="text-[12px] text-white/70">{label}</div>
      <div className={`tabular mt-0.5 text-[17px] font-semibold tracking-tight ${negative ? "text-[#ffd0d3]" : ""}`}>{value}</div>
    </div>
  );
}
