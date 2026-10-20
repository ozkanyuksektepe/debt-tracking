import { CalendarCheck, CreditCard, HandCoins, Landmark, Receipt } from "lucide-react";
import { Suspense } from "react";
import { UndoPaymentButton } from "@/components/payment-buttons";
import { Badge, Card, Empty, Hint, Kpi, KpiGrid, PageHeader, PageSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { fmtDate, money, todayIso } from "@/lib/format";
import type { Account, Payment, TargetType } from "@/lib/types";

const TYPES: Record<TargetType, { label: string; icon: typeof Receipt; color: string }> = {
  loan: { label: "Kredi", icon: Landmark, color: "var(--c1)" },
  card: { label: "Kredi kartı", icon: CreditCard, color: "var(--c2)" },
  other: { label: "Diğer", icon: HandCoins, color: "var(--c3)" },
};

export default function PaymentsPage() {
  return (
    <>
      <PageHeader eyebrow="Planlama" title="Ödeme geçmişi" subtitle="Kaydettiğin tüm ödemeler." />
      <Suspense fallback={<PageSkeleton />}>
        <Payments />
      </Suspense>
    </>
  );
}

async function Payments() {
  const [payments, accounts] = await Promise.all([apiGet<Payment[]>("/payments"), apiGet<Account[]>("/accounts")]);
  const accountName = (id: number | null) => accounts.find((a) => a.id === id)?.name;
  const month = todayIso().slice(0, 7);
  const thisMonth = payments.filter((p) => p.date.startsWith(month));

  return (
    <>
      <KpiGrid>
        <Kpi label="Toplam ödenen" value={money(payments.reduce((s, p) => s + p.amount, 0))} icon={Receipt} tone="accent" sub={`${payments.length} kayıt`} />
        <Kpi label="Bu ay ödenen" value={money(thisMonth.reduce((s, p) => s + p.amount, 0))} icon={CalendarCheck} tone="ok" sub={`${thisMonth.length} kayıt`} />
      </KpiGrid>

      <Card className="mt-6 animate-fade-up">
        {payments.length ? (
          <div className="flex flex-col gap-0.5">
            {payments.map((p) => {
              const t = TYPES[p.targetType];
              const Icon = t.icon;
              return (
                <div key={p.id} className="-mx-2 flex flex-wrap items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-surface-2 sm:flex-nowrap">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[28%] text-white" style={{ background: t.color }}>
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                      <span className="truncate">{p.targetName}</span>
                      {p.installmentCount > 1 && <Badge>{p.installmentCount} taksit</Badge>}
                    </div>
                    <div className="truncate text-[12.5px] text-muted">
                      {[fmtDate(p.date), t.label, accountName(p.accountId), p.note].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="tabular whitespace-nowrap font-semibold">{money(p.amount)}</div>
                  <UndoPaymentButton id={p.id} />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty icon={Receipt} title="Henüz ödeme kaydı yok">Bir krediye, karta veya borca &quot;Öde&quot; dediğinde burada görünür.</Empty>
        )}
      </Card>
      <Hint>&quot;Geri al&quot; ödemeyi siler; borca ve hesap bakiyesine yaptığı etkiyi de geri çevirir.</Hint>
    </>
  );
}
