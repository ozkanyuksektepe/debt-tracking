import { findBank } from "@/lib/banks";
import { fmtDay, money, NUM } from "@/lib/format";
import type { CardView } from "@/lib/types";
import { BankLogo } from "./bank-logo";

/** Bankanın renginde kredi kartı görseli. */
export function CardVisual({ c }: { c: CardView }) {
  const x = c.card;
  const bank = findBank(x.bank);
  const color = bank?.color ?? "#5b5cf0";
  const util = Math.min(c.utilizationPct, 100);

  return (
    <div
      className="relative aspect-[1.586] w-full overflow-hidden rounded-[22px] p-5 text-white shadow-card"
      style={{ background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 55%, #0b0d1a) 100%)` }}
    >
      {/* Dekoratif halkalar */}
      <div aria-hidden className="absolute -right-16 -top-20 size-56 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-24 -left-10 size-56 rounded-full bg-white/[.06]" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {x.bank && <BankLogo bank={x.bank} size={32} />}
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">{x.name}</div>
              <div className="text-[12px] text-white/70">{bank?.name ?? x.bank}</div>
            </div>
          </div>
          {/* Çip */}
          <div aria-hidden className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" />
        </div>

        <div className="mt-auto">
          <div className="text-[11.5px] uppercase tracking-wider text-white/65">Güncel borç</div>
          <div className="tabular text-[26px] font-bold tracking-tight">{money(x.currentBalance)}</div>
          {x.limit > 0 && (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${util}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11.5px] text-white/75">
                <span>Limit %{NUM.format(c.utilizationPct)}</span>
                <span>Son ödeme {x.statementBalance > 0 ? fmtDay(c.dueDate) : "—"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
