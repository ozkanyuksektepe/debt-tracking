import { CreditCard, Gauge, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { Suspense } from "react";
import { CardVisual } from "@/components/card-visual";
import { DeleteButton, EntityFormButton } from "@/components/entity-buttons";
import { PayButton } from "@/components/payment-buttons";
import { Badge, Card, DueBadge, Empty, Hint, Kpi, KpiGrid, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { fmtDate, money } from "@/lib/format";
import type { Overview } from "@/lib/types";

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
  const d = await apiGet<Overview>("/overview");
  const totalLimit = d.cards.reduce((s, c) => s + c.card.limit, 0);
  const available = d.cards.reduce((s, c) => s + Math.max(0, c.availableLimit), 0);

  return (
    <>
      <KpiGrid>
        <Kpi label="Dönem borçları" value={money(d.cardsStatementTotal)} icon={Receipt} tone="c2" sub="Bu ekstrelerde ödenecek" />
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
                      {c.isOverdue ? <Badge tone="danger">Ödeme gecikmiş</Badge> : x.statementBalance > 0 ? (
                        <><Badge tone="accent">Son ödeme {fmtDate(c.dueDate)}</Badge><DueBadge date={c.dueDate} today={d.today} /></>
                      ) : <Badge tone="ok">Dönem borcu ödendi</Badge>}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <Stat label="Dönem borcu" tone={c.isOverdue ? "danger" : undefined}>{money(x.statementBalance)}</Stat>
                      <Stat label="Asgari ödeme">{money(x.minimumPayment)}</Stat>
                      <Stat label="Dönem içi harcama">{money(c.unbilledAmount)}</Stat>
                      <Stat label="Gelecek taksitler">{money(c.futureInstallmentsTotal)}</Stat>
                      <Stat label="Toplam borç">{money(c.totalDebt)}</Stat>
                      <Stat label="Kullanılabilir">{money(c.availableLimit)}</Stat>
                      <Stat label="Limit">{money(x.limit)}</Stat>
                      <Stat label="Sonraki ekstre">{fmtDate(c.nextStatementDate)}</Stat>
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
                                  <td className="px-2 py-2 text-right text-muted">{i.remainingCount}/{i.installment.totalCount}</td>
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
                            type: "card", id: x.id, name: x.name, amount: x.statementBalance || null,
                            hint: `Dönem borcu ${money(x.statementBalance)} · asgari ${money(x.minimumPayment)}`,
                          }} />
                      )}
                      <EntityFormButton resource="cards" values={x} label="Ekstreyi güncelle" small />
                      <span className="ml-auto" />
                      <DeleteButton resource="cards" id={x.id} name={x.name} iconOnly />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <Hint>
            Yeni ekstre kesildiğinde &quot;Ekstreyi güncelle&quot; ile dönem borcu, asgari ödeme ve güncel borcu bankandaki değerlerle güncelle.
            Taksitli alışverişlere yalnızca henüz güncel borca yansımamış taksitleri ekle.
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
