"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteEntity, saveEntity, type Resource } from "@/lib/actions";
import { FORMS, type FormValues } from "@/lib/forms";
import { FormDialog } from "./form-dialog";

type Variant = "primary" | "default" | "ghost";
const variantClass = (v: Variant, small?: boolean) =>
  `${v === "primary" ? "btn-primary" : v === "ghost" ? "btn-ghost" : "btn"} ${small ? "btn-sm" : ""}`;

/** Yeni kayıt (values yok) veya düzenleme (values var) penceresi açan buton. */
export function EntityFormButton({
  resource,
  values,
  defaults,
  label,
  variant = "default",
  small,
  ariaLabel,
  iconOnly,
}: {
  resource: Resource;
  values?: FormValues;
  defaults?: FormValues;
  label: string;
  variant?: Variant;
  small?: boolean;
  ariaLabel?: string;
  /** Yalnızca kalem ikonu göster (tablo satırları için). */
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = values ? Pencil : Plus;
  const form = FORMS[resource];
  return (
    <>
      <button type="button" className={`${variantClass(variant, small)} ${iconOnly ? "btn-icon" : ""}`} onClick={() => setOpen(true)}
        aria-label={ariaLabel ?? (iconOnly ? label : undefined)} title={iconOnly ? label : undefined}>
        <Icon className={small ? "size-3.5" : "size-4"} strokeWidth={2.25} />
        {!iconOnly && label}
      </button>
      {open && (
        <FormDialog
          title={values ? form.editTitle : form.addTitle}
          fields={form.fields}
          initial={values ?? defaults}
          onClose={() => setOpen(false)}
          onSubmit={async (v) => (await saveEntity(resource, v)).error}
        />
      )}
    </>
  );
}

export function DeleteButton({ resource, id, name, iconOnly }: { resource: Resource; id: number; name: string; iconOnly?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={`btn-danger btn-sm ${iconOnly ? "btn-icon" : ""}`}
      disabled={pending}
      aria-label={`${name} sil`}
      title="Sil"
      onClick={() => {
        if (!confirm(`"${name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
        startTransition(async () => {
          const r = await deleteEntity(resource, id);
          if (r.error) alert(r.error);
        });
      }}
    >
      <Trash2 className="size-3.5" strokeWidth={2.25} />
      {!iconOnly && "Sil"}
    </button>
  );
}
