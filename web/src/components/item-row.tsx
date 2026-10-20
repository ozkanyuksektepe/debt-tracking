import { kindColor, money } from "@/lib/format";
import type { Account, CalendarItem } from "@/lib/types";
import { PayButton } from "./payment-buttons";
import { Badge, DateTile, DueBadge, dueTone, ListRow } from "./ui";

/** Takvim / yaklaşan ödeme satırı. Tahmini kalemler için ödeme butonu gösterilmez. */
export function ItemRow({ item, today, accounts, payable = true }: { item: CalendarItem; today: string; accounts: Account[]; payable?: boolean }) {
  return (
    <ListRow>
      <DateTile date={item.date} tone={dueTone(item.date, item.overdue, today)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold">
          <span className="truncate">{item.title}</span>
          <DueBadge date={item.date} overdue={item.overdue} today={today} />
          {item.estimated && <Badge>tahmini</Badge>}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-muted">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: kindColor(item.kind) }} />
          {item.kind}
          {item.note && ` · ${item.note}`}
        </div>
      </div>
      <div className="tabular whitespace-nowrap text-[15px] font-semibold">{money(item.amount)}</div>
      {payable && !item.estimated && (
        <PayButton
          accounts={accounts}
          target={{
            type: item.targetType,
            id: item.targetId,
            name: item.title,
            amount: item.targetType === "loan" ? null : item.amount,
            hint: item.targetType === "loan" ? "Boş bırakırsan taksit × adet" : undefined,
          }}
        />
      )}
    </ListRow>
  );
}
