import { Banknote, Landmark, PiggyBank, Wallet, WalletCards } from "lucide-react";
import { Suspense } from "react";
import { DeleteButton, EntityFormButton } from "@/components/entity-buttons";
import { Card, Empty, Hint, IconChip, Kpi, KpiGrid, PageHeader, PageSkeleton, type Tone } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { money } from "@/lib/format";
import type { Account } from "@/lib/types";

const TYPE_STYLE: Record<string, { icon: typeof Wallet; tone: Tone }> = {
  Banka: { icon: Landmark, tone: "accent" },
  Nakit: { icon: Banknote, tone: "ok" },
  Birikim: { icon: PiggyBank, tone: "c3" },
  Diğer: { icon: Wallet, tone: "neutral" },
};

export default function AccountsPage() {
  return (
    <>
      <PageHeader eyebrow="Varlıklar" title="Hesaplar" subtitle="Banka hesapların, nakdin ve birikimlerin.">
        <EntityFormButton resource="accounts" label="Hesap ekle" variant="primary" defaults={{ type: "Banka" }} />
      </PageHeader>
      <Suspense fallback={<PageSkeleton />}>
        <Accounts />
      </Suspense>
    </>
  );
}

async function Accounts() {
  const accounts = await apiGet<Account[]>("/accounts");
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const byType = (t: string) => accounts.filter((a) => a.type === t).reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <KpiGrid>
        <Kpi label="Toplam mevcut para" value={money(total)} icon={WalletCards} tone="accent" sub={`${accounts.length} hesap`} valueTone={total < 0 ? "neg" : undefined} />
        <Kpi label="Bankada" value={money(byType("Banka"))} icon={Landmark} tone="c1" />
        <Kpi label="Nakit" value={money(byType("Nakit"))} icon={Banknote} tone="ok" />
        <Kpi label="Birikim" value={money(byType("Birikim"))} icon={PiggyBank} tone="c3" />
      </KpiGrid>

      {accounts.length ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const style = TYPE_STYLE[a.type] ?? TYPE_STYLE["Diğer"];
            const share = total > 0 && a.balance > 0 ? Math.round((100 * a.balance) / total) : null;
            return (
              <Card key={a.id} className="flex animate-fade-up flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconChip icon={style.icon} tone={style.tone} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{a.name}</div>
                      <div className="text-[12.5px] text-muted">{a.type}{share !== null && ` · toplamın %${share}'i`}</div>
                    </div>
                  </div>
                  <DeleteButton resource="accounts" id={a.id} name={a.name} iconOnly />
                </div>
                <div className={`tabular text-[26px] font-bold tracking-[-.03em] ${a.balance < 0 ? "text-danger" : ""}`}>{money(a.balance)}</div>
                {a.notes && <div className="text-[12.5px] text-muted">{a.notes}</div>}
                <div className="mt-auto border-t border-line pt-3">
                  <EntityFormButton resource="accounts" values={a} label="Bakiye güncelle" small />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-6">
          <Empty icon={Wallet} title="Henüz hesap eklemedin"
            action={<EntityFormButton resource="accounts" label="İlk hesabı ekle" variant="primary" defaults={{ type: "Banka" }} />}>
            Bakiyelerini eklediğinde ödemelerden sonra elinde ne kalacağını görebilirsin.
          </Empty>
        </Card>
      )}
      <Hint>Ödeme kaydederken hesap seçersen tutar o hesabın bakiyesinden otomatik düşülür.</Hint>
    </>
  );
}
