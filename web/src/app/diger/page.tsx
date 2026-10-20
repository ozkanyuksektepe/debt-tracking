import { HandCoins, Repeat, UserRound } from "lucide-react";
import { Suspense } from "react";
import { DeleteButton, EntityFormButton } from "@/components/entity-buttons";
import { PayButton } from "@/components/payment-buttons";
import { Badge, Card, CardHeader, DueBadge, Empty, Hint, Kpi, KpiGrid, ListRow, PageHeader, PageSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { fmtDate, money } from "@/lib/format";
import type { Account, OtherView, Overview } from "@/lib/types";

export default function OthersPage() {
  return (
    <>
      <PageHeader eyebrow="Borçlar" title="Diğer borçlar" subtitle="Kişisel borçların ve kira, fatura gibi düzenli ödemelerin.">
        <EntityFormButton resource="others" label="Ekle" variant="primary" defaults={{ kind: "Borç" }} />
      </PageHeader>
      <Suspense fallback={<PageSkeleton />}>
        <Others />
      </Suspense>
    </>
  );
}

async function Others() {
  const d = await apiGet<Overview>("/overview");
  const debts = d.others.filter((o) => o.debt.kind === "Borç");
  const recurring = d.others.filter((o) => o.debt.kind === "Düzenli");

  return (
    <>
      <KpiGrid>
        <Kpi label="Kişisel borçlar" value={money(d.othersTotal)} icon={UserRound} tone="c3" sub={`${debts.filter((o) => o.debt.remainingAmount > 0).length} açık borç`} />
        <Kpi label="Düzenli ödemeler" value={money(d.monthlyRecurring)} icon={Repeat} tone="c4" sub={`Aylık · ${recurring.length} kalem`} />
      </KpiGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="animate-fade-up">
          <CardHeader title="Kişisel borçlar" subtitle="Arkadaş, aile veya başka kişilere borçların" icon={UserRound} tone="c3" />
          {debts.length
            ? <div className="flex flex-col gap-0.5">{debts.map((o) => <OtherRow key={o.debt.id} o={o} today={d.today} accounts={d.accounts} />)}</div>
            : <Empty icon={HandCoins}>Kişisel borç yok.</Empty>}
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title="Düzenli ödemeler" subtitle="Her ay tekrarlanan ödemeler" icon={Repeat} tone="c4" />
          {recurring.length
            ? <div className="flex flex-col gap-0.5">{recurring.map((o) => <OtherRow key={o.debt.id} o={o} today={d.today} accounts={d.accounts} />)}</div>
            : <Empty icon={Repeat}>Kira, fatura, abonelik gibi düzenli ödemelerini ekleyebilirsin.</Empty>}
          <Hint>Düzenli ödemeler toplam borca eklenmez; aylık ödeme yükünde ve takvimde görünür.</Hint>
        </Card>
      </div>
    </>
  );
}

function OtherRow({ o, today, accounts }: { o: OtherView; today: string; accounts: Account[] }) {
  const x = o.debt;
  const isRec = x.kind === "Düzenli";
  const closed = !isRec && x.remainingAmount <= 0;
  const meta = [
    x.creditor,
    !isRec && x.monthlyAmount > 0 && `Aylık ${money(x.monthlyAmount)}`,
    x.dueDay && `Her ayın ${x.dueDay}. günü`,
    !isRec && x.dueDate && !x.monthlyAmount && `Vade ${fmtDate(x.dueDate)}`,
    o.remainingMonths && `${o.remainingMonths} ay kaldı`,
  ].filter(Boolean).join(" · ");
  const suggested = isRec ? x.monthlyAmount : x.monthlyAmount > 0 ? Math.min(x.monthlyAmount, x.remainingAmount) : x.remainingAmount;
  const Icon = isRec ? Repeat : UserRound;

  return (
    <ListRow className="flex-wrap sm:flex-nowrap">
      <span className={`grid size-10 shrink-0 place-items-center rounded-[28%] text-white ${isRec ? "bg-c4" : "bg-c3"}`}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold">
          <span className="truncate">{x.name}</span>
          {closed && <Badge tone="ok">Kapandı</Badge>}
          {o.paidThisMonth ? <Badge tone="ok">Bu ay ödendi</Badge> : !closed && <DueBadge date={o.nextDueDate} today={today} />}
        </div>
        <div className="truncate text-[12.5px] text-muted">{meta || "—"}{x.notes && ` · ${x.notes}`}</div>
      </div>
      <div className="text-right">
        <div className="tabular whitespace-nowrap font-semibold">{money(isRec ? x.monthlyAmount : x.remainingAmount)}</div>
        <div className="text-[11.5px] text-muted">{isRec ? "aylık" : "kalan"}</div>
      </div>
      <div className="flex items-center gap-0.5">
        {!closed && <PayButton accounts={accounts} target={{ type: "other", id: x.id, name: x.name, amount: suggested }} />}
        <EntityFormButton resource="others" values={x} label="Düzenle" variant="ghost" small iconOnly />
        <DeleteButton resource="others" id={x.id} name={x.name} iconOnly />
      </div>
    </ListRow>
  );
}
