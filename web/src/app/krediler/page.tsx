import { CalendarClock, Landmark, Percent, PiggyBank, Wallet } from "lucide-react";
import { Suspense } from "react";
import { BankLogo } from "@/components/bank-logo";
import { DeleteButton, EntityFormButton } from "@/components/entity-buttons";
import { PayButton } from "@/components/payment-buttons";
import { Badge, Card, Empty, Hint, Kpi, KpiGrid, PageHeader, PageSkeleton, Progress, Stat } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { findBank } from "@/lib/banks";
import { fmtDate, money, NUM } from "@/lib/format";
import type { Overview } from "@/lib/types";

export default function LoansPage() {
  return (
    <>
      <PageHeader eyebrow="Borçlar" title="Krediler" subtitle="Taksitlerin, kalan borcun ve faiz yükün.">
        <EntityFormButton resource="loans" label="Kredi ekle" variant="primary" defaults={{ type: "İhtiyaç", paidInstallments: 0 }} />
      </PageHeader>
      <Suspense fallback={<PageSkeleton />}>
        <Loans />
      </Suspense>
    </>
  );
}

async function Loans() {
  const d = await apiGet<Overview>("/overview");
  // Kapanmış krediler sona.
  const loans = [...d.loans].sort((a, b) => Number(a.remainingInstallments === 0) - Number(b.remainingInstallments === 0));
  const active = loans.filter((l) => l.remainingInstallments > 0);

  return (
    <>
      <KpiGrid>
        <Kpi label="Kalan toplam ödeme" value={money(d.loansRemainingTotal)} icon={Wallet} tone="c1" sub={`${active.length} aktif kredi`} />
        <Kpi label="Tahmini kalan anapara" value={money(d.loansRemainingPrincipal)} icon={PiggyBank} tone="accent" sub="Erken kapama tutarına yakın" />
        <Kpi label="Aylık taksit toplamı" value={money(active.reduce((s, l) => s + l.loan.monthlyInstallment, 0))} icon={CalendarClock} tone="warn" />
        <Kpi label="Kalan faiz + vergi" value={money(loans.reduce((s, l) => s + l.remainingInterest, 0))} icon={Percent} tone="danger" />
      </KpiGrid>

      {loans.length ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {loans.map((l) => {
              const x = l.loan;
              const done = l.remainingInstallments === 0;
              return (
                <Card key={x.id} className={`flex animate-fade-up flex-col gap-5 ${done ? "opacity-70" : ""}`}>
                  <div className="flex items-start gap-3.5">
                    {x.bank ? <BankLogo bank={x.bank} size={46} /> : (
                      <span className="grid size-[46px] shrink-0 place-items-center rounded-[28%] bg-accent-soft text-accent"><Landmark className="size-5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[17px] font-semibold tracking-tight">{x.name}</h3>
                        {done && <Badge tone="ok">Kapandı</Badge>}
                        {l.overdueCount > 0 && <Badge tone="danger">{l.overdueCount} taksit gecikmiş</Badge>}
                      </div>
                      <div className="text-[13px] text-muted">{[findBank(x.bank)?.name ?? x.bank, x.type].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="text-right">
                      <div className="tabular text-[24px] font-bold leading-tight tracking-[-.03em]">{money(l.remainingTotal)}</div>
                      <div className="text-[12px] text-muted">kalan toplam ödeme</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-baseline justify-between text-[13px]">
                      <span><b className="tabular font-semibold">{x.paidInstallments}</b><span className="text-muted"> / {x.termMonths} taksit ödendi</span></span>
                      <span className="tabular font-semibold text-accent">%{NUM.format(l.progressPct)}</span>
                    </div>
                    <Progress pct={l.progressPct} />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <Stat label="Aylık taksit">{money(x.monthlyInstallment)}</Stat>
                    <Stat label="Sonraki taksit">{l.nextDueDate ? fmtDate(l.nextDueDate) : "—"}</Stat>
                    <Stat label="Kalan taksit">{l.remainingInstallments}</Stat>
                    <Stat label="Tahmini kalan anapara">{money(l.remainingPrincipal)}</Stat>
                    <Stat label="Kalan faiz + vergi" tone={l.remainingInterest > 0 ? "danger" : undefined}>{money(l.remainingInterest)}</Stat>
                    <Stat label="Fiili aylık maliyet">
                      %{NUM.format(l.impliedMonthlyRatePct)}
                      {x.interestRate > 0 && <span className="text-[12px] font-normal text-muted"> · akdi %{NUM.format(x.interestRate)}</span>}
                    </Stat>
                  </div>

                  {x.notes && <div className="whitespace-pre-wrap rounded-2xl border border-dashed border-line px-3.5 py-2.5 text-[13px] text-muted">{x.notes}</div>}

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    {!done && (
                      <PayButton primary label="Taksit öde" accounts={d.accounts}
                        target={{ type: "loan", id: x.id, name: x.name, amount: null, hint: "Boş bırakırsan taksit × adet" }} />
                    )}
                    <EntityFormButton resource="loans" values={x} label="Düzenle" small />
                    <span className="ml-auto text-[12px] text-muted">Çekilen {money(x.principal)}</span>
                    <DeleteButton resource="loans" id={x.id} name={x.name} iconOnly />
                  </div>
                </Card>
              );
            })}
          </div>
          <Hint>
            Tahmini kalan anapara, bankanın taksit planından çıkarılan fiili maliyet oranıyla (KKDF/BSMV dahil) hesaplanır;
            erken kapama tutarına yakındır.
          </Hint>
        </>
      ) : (
        <Card className="mt-6">
          <Empty icon={Landmark} title="Henüz kredi eklemedin"
            action={<EntityFormButton resource="loans" label="İlk krediyi ekle" variant="primary" defaults={{ type: "İhtiyaç", paidInstallments: 0 }} />}>
            Kredilerini eklediğinde kalan taksitleri ve borcunu burada takip edebilirsin.
          </Empty>
        </Card>
      )}
    </>
  );
}
