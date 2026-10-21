import { CalendarCheck, CreditCard, Gauge, Receipt, Scissors, ShoppingBag, Wallet } from "lucide-react";
import { Suspense } from "react";
import { CardVisual } from "@/components/card-visual";
import { DeleteButton, EntityFormButton } from "@/components/entity-buttons";
import { PayButton } from "@/components/payment-buttons";
import { StatementImportButton, type CardPayment } from "@/components/statement-import";
import { Badge, Card, DueBadge, Empty, Hint, Kpi, KpiGrid, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { fmtDate, money } from "@/lib/format";
import type { CardView, Overview, Payment } from "@/lib/types";

export default function CardsPage() {
  return (
    <>
      <PageHeader eyebrow="Borçlar" title="Kredi kartları" subtitle="Dönem borçların, limitlerin ve taksitli alışverişlerin.">
        <EntityFormButton resource="cards" label="Kart ekle" variant="primary" defaults={{ statementDay: 1, dueDay: 11 }} />
      </PageHeader>
      <Suspense fallback={<PageSkeleton />}>
        <Cards />
      </Suspense>
    </>
  );
}

async function Cards() {
  const [d, allPayments] = await Promise.all([apiGet<Overview>("/overview"), apiGet<Payment[]>("/payments")]);
  const cardPayments: CardPayment[] = allPayments
    .filter((p) => p.targetType === "card")
    .map((p) => ({ targetId: p.targetId, date: p.date, amount: p.amount }));
  const totalLimit = d.cards.reduce((s, c) => s + c.card.limit, 0);
  const available = d.cards.reduce((s, c) => s + Math.max(0, c.availableLimit), 0);

  return (
    <>
      <KpiGrid>
        <Kpi label="Kalan dönem borçları" value={money(d.cardsStatementTotal)} icon={Receipt} tone="c2" sub="Bu ekstrelerden ödenecek kalan" />
        <Kpi label="Toplam kart borcu" value={money(d.cardsTotal)} icon={Wallet} tone="danger" sub="Gelecek taksitler dahil" />
        <Kpi label="Toplam limit" value={money(totalLimit)} icon={CreditCard} tone="accent" sub={`${d.cards.length} kart`} />
        <Kpi label="Kullanılabilir limit" value={money(available)} icon={Gauge} tone="ok"
          sub={totalLimit > 0 ? `%${Math.round((100 * (totalLimit - available)) / totalLimit)} kullanımda` : undefined} />
      </KpiGrid>

      {d.cards.length ? (
        <>
          <div className="mt-6 flex flex-col gap-5">
            {d.cards.map((c) => {
              const x = c.card;
              return (
                <Card key={x.id} className="grid animate-fade-up grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
                  <div className="flex flex-col gap-3">
                    <CardVisual c={c} />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.isOverdue ? <Badge tone="danger">Ödeme gecikmiş</Badge> : x.remainingStatement > 0 ? (
                        <><Badge tone="accent">Son ödeme {fmtDate(c.dueDate)}</Badge><DueBadge date={c.dueDate} today={d.today} /></>
                      ) : <Badge tone="ok">Dönem borcu ödendi</Badge>}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-4">
                    <StatementTimeline c={c} today={d.today} />

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                      <Stat label="Dönem borcu">{money(x.statementBalance)}</Stat>
                      <Stat label="Bu dönem ödenen" tone={x.paidAmount > 0 ? "ok" : undefined}>{money(x.paidAmount)}</Stat>
                      <Stat label="Kalan dönem borcu" tone={c.isOverdue ? "danger" : undefined}>{money(x.remainingStatement)}</Stat>
                      <Stat label="Kalan asgari ödeme">{money(x.remainingMinimum)}</Stat>
                      <Stat label="Dönem içi harcama">{money(x.unbilledAmount)}</Stat>
                      <Stat label="Güncel toplam borç">{money(x.currentBalance)}</Stat>
                      <Stat label="Gelecek taksitler">{money(c.futureInstallmentsTotal)}</Stat>
                      <Stat label="Kullanılabilir limit" tone={c.availableLimit < 0 ? "danger" : undefined}>{money(c.availableLimit)}</Stat>
                      <Stat label="Limit">{money(x.limit)}</Stat>
                      <Stat label="Toplam borç">{money(c.totalDebt)}</Stat>
                    </div>

                    <div className="rounded-2xl border border-line">
                      <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <div className="flex items-center gap-2 text-[14px] font-semibold">
                          <ShoppingBag className="size-4 text-muted" /> Taksitli alışverişler
                          {c.installments.length > 0 && <Badge>{c.installments.length}</Badge>}
                        </div>
                        <EntityFormButton resource="card-installments" defaults={{ creditCardId: x.id, totalCount: 3 }} label="Taksit ekle" variant="ghost" small />
                      </div>
                      {c.installments.length > 0 ? (
                        <div className="overflow-x-auto border-t border-line">
                          <table className="tabular w-full border-collapse text-[13.5px]">
                            <thead>
                              <tr className="text-left text-[12px] text-muted">
                                <th className="px-4 py-2 font-medium">Açıklama</th>
                                <th className="px-2 py-2 text-right font-medium">Aylık</th>
                                <th className="px-2 py-2 text-right font-medium">Kalan</th>
                                <th className="px-2 py-2 text-right font-medium">Toplam</th>
                                <th className="w-20" />
                              </tr>
                            </thead>
                            <tbody>
                              {c.installments.map((i) => (
                                <tr key={i.installment.id} className="border-t border-line">
                                  <td className="px-4 py-2 font-medium">{i.installment.description}</td>
                                  <td className="px-2 py-2 text-right">{money(i.installment.monthlyAmount)}</td>
                                  <td className="px-2 py-2 text-right text-muted">{i.remainingCount}</td>
                                  <td className="px-2 py-2 text-right font-semibold">{money(i.remainingTotal)}</td>
                                  <td className="whitespace-nowrap px-2 py-1 text-right">
                                    <EntityFormButton resource="card-installments" values={i.installment} label="Taksidi düzenle" variant="ghost" small iconOnly />
                                    <DeleteButton resource="card-installments" id={i.installment.id} name={i.installment.description} iconOnly />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border-t border-line px-4 py-3 text-[13px] text-muted">Henüz güncel borca yansımamış taksit yok.</div>
                      )}
                    </div>

                    {x.notes && <div className="whitespace-pre-wrap rounded-2xl border border-dashed border-line px-3.5 py-2.5 text-[13px] text-muted">{x.notes}</div>}

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {x.currentBalance > 0 && (
                        <PayButton primary label="Ödeme yap" accounts={d.accounts}
                          target={{
                            type: "card", id: x.id, name: x.name, amount: x.remainingStatement || null,
                            hint: `Kalan dönem borcu ${money(x.remainingStatement)} · kalan asgari ${money(x.remainingMinimum)}. Tutar "bu dönem ödenen"e eklenir.`,
                          }} />
                      )}
                      <EntityFormButton resource="cards" values={{ ...x, futureInstallmentsTotal: c.futureInstallmentsTotal }} label="Ekstreyi güncelle" small />
                      <StatementImportButton cardId={x.id} cards={d.cards} payments={cardPayments} />
                      <span className="ml-auto" />
                      <DeleteButton resource="cards" id={x.id} name={x.name} iconOnly />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <Hint>
            Dönem içi harcama, girdiğin güncel toplam borçtan; kullanılabilir limit de limit ve güncel borçtan otomatik hesaplanır.
            &quot;Ödeme yap&quot; ile kaydettiğin ödemeler &quot;bu dönem ödenen&quot;e eklenir ve güncel borcu düşürür.
            Yeni ekstre kesildiğinde &quot;Ekstreyi güncelle&quot; ile yeni dönem borcunu ve asgariyi gir, ödeneni sıfırla, güncel borcu bankadaki değerle güncelle.
            Ya da &quot;Ekstre yükle&quot; ile bankadan indirdiğin PDF, Excel veya CSV ekstreyi seç: değerler okunur, kontrol edip onaylayınca kart güncellenir.
            Kullanılabilir limitten taksitli alışverişlerin kalan tutarı da düşülür.
          </Hint>
        </>
      ) : (
        <Card className="mt-6">
          <Empty icon={CreditCard} title="Henüz kredi kartı eklemedin"
            action={<EntityFormButton resource="cards" label="İlk kartı ekle" variant="primary" defaults={{ statementDay: 1, dueDay: 11 }} />}>
            Kartlarını eklediğinde dönem borcunu, son ödeme tarihini ve limitini burada görürsün.
          </Empty>
        </Card>
      )}
    </>
  );
}

/** Hesap kesim ve son ödeme tarihlerini sırasıyla gösterir; geçmiş, sıradaki ve gecikmiş adımları ayırır. */
function StatementTimeline({ c, today }: { c: CardView; today: string }) {
  const steps = [
    { label: "Son hesap kesim", date: c.lastStatementDate, due: false },
    { label: "Son ödeme", date: c.dueDate, due: true },
    { label: "Sonraki hesap kesim", date: c.nextStatementDate, due: false },
    { label: "Sonraki son ödeme", date: c.nextDueDate, due: true },
  ];
  const nextIndex = steps.findIndex((s) => s.date >= today);

  return (
    <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {steps.map((s, i) => {
        const past = s.date < today;
        const overdue = past && s.due && i === 1 && c.isOverdue;
        const isNext = i === nextIndex;
        return (
          <li key={s.label}
            className={`rounded-2xl border px-3.5 py-2.5 ${
              overdue ? "border-danger/30 bg-danger-soft" : isNext ? "border-accent/40 bg-accent-soft" : "border-line"
            }`}>
            <div className="flex items-center gap-1.5 text-[12px] text-muted">
              {s.due ? <CalendarCheck className="size-3.5" /> : <Scissors className="size-3.5" />}
              {s.label}
            </div>
            <div className={`mt-0.5 text-[14px] font-semibold ${overdue ? "text-danger" : isNext ? "text-accent" : past ? "text-muted" : ""}`}>
              {fmtDate(s.date)}
            </div>
            {overdue && <div className="text-[11.5px] font-medium text-danger">Gecikmiş</div>}
            {isNext && !overdue && <div className="text-[11.5px] font-medium text-accent">Sıradaki</div>}
          </li>
        );
      })}
    </ol>
  );
}
