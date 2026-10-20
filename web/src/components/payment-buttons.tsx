"use client";

import { Check, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { recordPayment, undoPayment } from "@/lib/actions";
import type { Field } from "@/lib/forms";
import { money, todayIso } from "@/lib/format";
import type { Account, TargetType } from "@/lib/types";
import { FormDialog } from "./form-dialog";

export type PayTarget = {
  type: TargetType;
  id: number;
  name: string;
  /** Önerilen tutar; null ise backend hesaplar (kredide taksit × adet). */
  amount: number | null;
  hint?: string;
};

export function PayButton({
  target,
  accounts,
  label = "Öde",
  primary,
}: {
  target: PayTarget;
  accounts: Account[];
  label?: string;
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const fields: Field[] = [
    ...(target.type === "loan"
      ? [{ name: "installmentCount", label: "Ödenen taksit sayısı", type: "int", min: 1 } satisfies Field]
      : []),
    { name: "amount", label: "Tutar", type: "money", nullable: true, hint: target.hint },
    { name: "date", label: "Ödeme tarihi", type: "date", required: true },
    {
      name: "accountId", label: "Hangi hesaptan?", type: "select", full: true,
      options: [["", "Hesaptan düşme"], ...accounts.map((a): [string, string] => [String(a.id), `${a.name} · ${money(a.balance)}`])],
    },
    { name: "note", label: "Not", nullable: true, full: true },
  ];

  return (
    <>
      <button type="button" className={`${primary ? "btn-primary" : "btn"} btn-sm`} onClick={() => setOpen(true)}>
        <Check className="size-3.5" strokeWidth={2.5} />
        {label}
      </button>
      {open && (
        <FormDialog
          title={`Ödeme: ${target.name}`}
          fields={fields}
          initial={{ amount: target.amount, date: todayIso(), installmentCount: 1, accountId: "" }}
          submitText="Ödemeyi kaydet"
          onClose={() => setOpen(false)}
          onSubmit={async (v) =>
            (
              await recordPayment({
                targetType: target.type,
                targetId: target.id,
                amount: v.amount as number | null,
                date: v.date as string,
                accountId: v.accountId ? Number(v.accountId) : null,
                installmentCount: target.type === "loan" ? Number(v.installmentCount) || 1 : null,
                note: v.note as string | null,
              })
            ).error
          }
        />
      )}
    </>
  );
}

export function UndoPaymentButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-danger btn-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bu ödeme geri alınsın mı? Borç ve hesap bakiyesi eski haline döner.")) return;
        startTransition(async () => {
          const r = await undoPayment(id);
          if (r.error) alert(r.error);
        });
      }}
    >
      <Undo2 className="size-3.5" strokeWidth={2.25} />
      Geri al
    </button>
  );
}
