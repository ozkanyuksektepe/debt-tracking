import { Banknote, CalendarClock, Coins, Gauge, Landmark, PiggyBank, TrendingUp, Wallet, WalletCards } from "lucide-react";
import { Suspense } from "react";
import { BankLogo } from "@/components/bank-logo";
import { DeleteButton, EntityFormButton } from "@/components/entity-buttons";
import { Badge, Card, Empty, Hint, IconChip, Kpi, KpiGrid, PageHeader, PageSkeleton, Progress, Stat, type Tone } from "@/components/ui";
import { accountKind, type AccountKind } from "@/lib/account-types";
import { apiGet } from "@/lib/api";
import { findBank } from "@/lib/banks";
import { daysBetween, fmtDate, money, NUM, todayIso } from "@/lib/format";
import type { Account } from "@/lib/types";

const KIND_STYLE: Record<AccountKind, { icon: typeof Wallet; tone: Tone }> = {
  Vadesiz: { icon: Landmark, tone: "accent" },
  Günlük: { icon: TrendingUp, tone: "c1" },
  Vadeli: { icon: CalendarClock, tone: "c2" },
  Altın: { icon: Coins, tone: "warn" },
  Birikim: { icon: PiggyBank, tone: "c3" },
  KMH: { icon: Gauge, tone: "danger" },
  Nakit: { icon: Banknote, tone: "ok" },
  Diğer: { icon: Wallet, tone: "neutral" },
};

export default function AccountsPage() {
  return (
    <>
      <PageHeader eyebrow="Varlıklar" title="Hesaplar" subtitle="Banka hesapların, nakdin ve birikimlerin.">
        <EntityFormButton resource="accounts" label="Hesap ekle" variant="primary" />
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
  const byKind = (...kinds: AccountKind[]) =>
    accounts.filter((a) => kinds.includes(accountKind(a.type))).reduce((s, a) => s + a.balance, 0);
  // Pay hesabında KMH gibi eksi bakiyeler sayılmaz; yoksa paylar %100'ü aşar.
  const positive = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const kmh = accounts.filter((a) => accountKind(a.type) === "KMH");
  const kmhUsed = kmh.reduce((s, a) => s + Math.max(0, -a.balance), 0);
  const kmhAvailable = kmh.reduce((s, a) => s + Math.max(0, a.limit + a.balance), 0);
  const today = todayIso();

  return (
    <>
      <KpiGrid>
        <Kpi label="Toplam mevcut para" value={money(total)} icon={WalletCards} tone="accent" sub={`${accounts.length} hesap`} valueTone={total < 0 ? "neg" : undefined} />
        <Kpi label="Vadesiz ve günlük faizli" value={money(byKind("Vadesiz", "Günlük"))} icon={Landmark} tone="c1" />
        <Kpi label="Vadeli, altın ve birikim" value={money(byKind("Vadeli", "Altın", "Birikim"))} icon={PiggyBank} tone="c3" />
        {kmh.length ? (
          <Kpi label="KMH kullanımı" value={money(kmhUsed)} icon={Gauge} tone="danger" sub={`Kullanılabilir ${money(kmhAvailable)}`} />
        ) : (
          <Kpi label="Nakit" value={money(byKind("Nakit"))} icon={Banknote} tone="ok" />
        )}
      </KpiGrid>

      {accounts.length ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const kind = accountKind(a.type);
            const style = KIND_STYLE[kind];
            const bankName = findBank(a.bank)?.name ?? a.bank;
            const sub = [bankName, a.name !== a.type ? a.type : null].filter(Boolean).join(" · ") || a.type;
            const share = positive > 0 && a.balance > 0 ? Math.round((100 * a.balance) / positive) : null;
            return (
              <Card key={a.id} className="flex animate-fade-up flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {a.bank ? <BankLogo bank={a.bank} size={40} /> : <IconChip icon={style.icon} tone={style.tone} />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{a.name}</span>
                        {kind === "KMH" && <Badge tone="danger">KMH</Badge>}
                      </div>
                      <div className="truncate text-[12.5px] text-muted">{sub}{share !== null && ` · toplamın %${share}'i`}</div>
                    </div>
                  </div>
                  <DeleteButton resource="accounts" id={a.id} name={a.name} iconOnly />
                </div>
                <div className={`tabular text-[26px] font-bold tracking-[-.03em] ${a.balance < 0 ? "text-danger" : ""}`}>{money(a.balance)}</div>
                <AccountDetails a={a} kind={kind} today={today} />
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
            action={<EntityFormButton resource="accounts" label="İlk hesabı ekle" variant="primary" />}>
            Bakiyelerini eklediğinde ödemelerden sonra elinde ne kalacağını görebilirsin.
          </Empty>
        </Card>
      )}
      <Hint>
        Hesap eklerken bankayı seçince hesap türü listesi o bankanın ürünlerine göre süzülür (ör. Garanti BBVA → Avans Hesap, Akbank → Artı Para).
        Hesap türüne göre ilgili alanlar açılır: KMH&apos;de limit ve kullanılabilir bakiye, vadeli hesapta vade sonu ve faiz, altında gram.
        KMH&apos;de bankanın gösterdiği bakiyeyi gir; eksi bakiye kullandığın tutardır ve toplam mevcut paradan düşülür.
        Ödeme kaydederken hesap seçersen tutar o hesabın bakiyesinden otomatik düşülür.
      </Hint>
    </>
  );
}

/** Hesap türüne göre ek bilgiler: KMH limiti, vade sonu, faiz, altın miktarı. */
function AccountDetails({ a, kind, today }: { a: Account; kind: AccountKind; today: string }) {
  const rate = a.interestRate > 0 ? `%${NUM.format(a.interestRate)}` : null;

  if (kind === "KMH") {
    if (a.limit <= 0) return <div className="text-[12.5px] text-muted">Limit girilmedi. &quot;Bakiye güncelle&quot; ile {a.type} limitini ekle.</div>;
    const used = Math.max(0, -a.balance);
    const available = a.limit + a.balance;
    const pct = (100 * used) / a.limit;
    return (
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={`${a.type} limiti`}>{money(a.limit)}</Stat>
          <Stat label="Kullanılabilir bakiye" tone={available < 0 ? "danger" : "ok"}>{money(available)}</Stat>
        </div>
        <Progress pct={pct} size="sm" tone={pct >= 90 ? "danger" : pct >= 60 ? "warn" : undefined} />
        <div className="flex justify-between text-[12px] text-muted">
          <span>{used > 0 ? `Limitin %${Math.round(pct)}'i kullanılıyor` : "Kullanım yok"}</span>
          {rate && <span>Aylık faiz {rate}</span>}
        </div>
      </div>
    );
  }

  if (kind === "Vadeli" && (a.maturityDate || rate)) {
    const days = a.maturityDate ? daysBetween(today, a.maturityDate) : null;
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {a.maturityDate && (
          <Stat label="Vade sonu" tone={days !== null && days <= 0 ? "ok" : undefined}>
            {fmtDate(a.maturityDate)}
            <div className="text-[11.5px] font-medium text-muted">{days! > 0 ? `${days} gün kaldı` : "Vadesi doldu"}</div>
          </Stat>
        )}
        {rate && <Stat label="Yıllık faiz">{rate}</Stat>}
      </div>
    );
  }

  if (kind === "Günlük" && rate) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Yıllık faiz">{rate}</Stat>
        <Stat label="Günlük getiri (brüt)">{money((a.balance * a.interestRate) / 100 / 365)}</Stat>
      </div>
    );
  }

  if (kind === "Altın" && a.quantity > 0) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Miktar">{NUM.format(a.quantity)} gr</Stat>
        <Stat label="Gram başına">{money(a.balance / a.quantity)}</Stat>
      </div>
    );
  }

  return null;
}
