import { BarChart3, History, Percent, PieChart, Scale, TrendingDown, Wallet, WalletCards } from "lucide-react";
import { Suspense } from "react";
import { AreaChart, BarChart, Donut } from "@/components/charts";
import { Card, CardHeader, Empty, Hint, Kpi, KpiGrid, PageHeader, PageSkeleton, Progress } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { fmtDay, money, monthShort, NUM } from "@/lib/format";
import type { Reports } from "@/lib/types";

const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)"];

export default function ReportsPage() {
  return (
    <>
      <PageHeader eyebrow="Planlama" title="Raporlar" subtitle="Borç, varlık ve ödeme yükünün özeti." />
      <Suspense fallback={<PageSkeleton />}>
        <ReportsContent />
      </Suspense>
    </>
  );
}

async function ReportsContent() {
  const r = await apiGet<Reports>("/reports");
  const total = r.breakdown.reduce((s, b) => s + b.amount, 0);
  const avgMonthly = r.monthly.length ? r.monthly.reduce((s, m) => s + m.total, 0) / r.monthly.length : 0;
  const payoff = r.projection.findIndex((p) => p.remaining <= 0);

  return (
    <>
      <KpiGrid>
        <Kpi label="Toplam borç" value={money(r.totalDebt)} icon={Wallet} tone="danger" />
        <Kpi label="Toplam varlık" value={money(r.totalAssets)} icon={WalletCards} tone="ok" />
        <Kpi label="Net durum" value={money(r.netWorth)} sub="Varlık − borç" icon={Scale} tone="accent" valueTone={r.netWorth < 0 ? "neg" : "pos"} />
        <Kpi label="Kredilerde kalan faiz + vergi" value={money(r.loanInterestRemaining)} icon={Percent} tone="warn" sub="Erken kapamayla kazanılabilecek" />
      </KpiGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card className="animate-fade-up">
          <CardHeader title="Borç dağılımı" icon={PieChart} />
          {total > 0 ? (
            <>
              <Donut data={r.breakdown.map((b, i) => ({ label: b.label, value: b.amount, color: COLORS[i] }))} size={190}
                centerLabel="Toplam" centerValue={money(total)} />
              <div className="mt-5 flex flex-col gap-3.5">
                {r.breakdown.map((b, i) => (
                  <div key={b.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[13.5px]">
                      <span className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: COLORS[i] }} />{b.label}</span>
                      <span className="tabular"><b className="font-semibold">{money(b.amount)}</b>
                        <span className="text-muted"> · %{NUM.format(Math.round((1000 * b.amount) / total) / 10)}</span></span>
                    </div>
                    <Progress pct={(100 * b.amount) / total} color={COLORS[i]} size="sm" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty icon={PieChart}>Borç yok.</Empty>
          )}
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title="Aylık ödeme yükü" subtitle={`Önümüzdeki 12 ay · ortalama ${money(avgMonthly)}`} icon={BarChart3} />
          <BarChart id="monthly" data={r.monthly.map((m) => ({ label: monthShort(m.year, m.month), value: m.total }))} />
          <Hint>Kredi taksitleri, kart ödemeleri, kişisel borç ödemeleri ve düzenli ödemeler dahil.</Hint>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="animate-fade-up">
          <CardHeader title="Borç azalma projeksiyonu" icon={TrendingDown} tone="ok"
            subtitle={payoff >= 0 ? `Planlanan ödemelerle yaklaşık ${payoff + 1} ayda biter` : "Yeni borç eklenmezse"} />
          <AreaChart id="projection" labels={r.projection.map((p) => monthShort(p.year, p.month))}
            series={[{ name: "Ay sonunda kalan borç", color: "var(--c1)", values: r.projection.map((p) => p.remaining) }]} />
          <Hint>Yeni borç eklenmez ve planlanan ödemeler yapılırsa. Tarihsiz kişisel borçlar düşmez.</Hint>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title="Zaman içindeki değişim" icon={History} subtitle="Günlük kayıtlardan" />
          <AreaChart id="history" labels={r.snapshots.map((s) => fmtDay(s.date))}
            series={[
              { name: "Toplam borç", color: "var(--danger)", values: r.snapshots.map((s) => s.totalDebt) },
              { name: "Toplam varlık", color: "var(--success)", values: r.snapshots.map((s) => s.totalAssets), fill: false },
            ]} />
          <Hint>Uygulamayı açtığın her gün otomatik kayıt alınır; grafik kullandıkça dolar.</Hint>
        </Card>
      </div>
    </>
  );
}
