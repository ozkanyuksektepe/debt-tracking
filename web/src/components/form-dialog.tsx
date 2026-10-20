"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { NUM, parseNum } from "@/lib/format";
import { BankSelect } from "./bank-select";
import type { Field, FormValues } from "@/lib/forms";

function toRaw(field: Field, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "money" || field.type === "percent") return value === "" ? "" : NUM.format(Number(value));
  if (field.type === "month") return String(value).slice(0, 7);
  return String(value);
}

function parseValues(fields: Field[], raw: Record<string, string>, visible: (f: Field) => boolean): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const s = raw[f.name] ?? "";
    let v: unknown;
    switch (f.type) {
      case "money":
      case "percent": {
        const n = parseNum(s);
        if (Number.isNaN(n)) throw new Error(`"${f.label}" geçerli bir sayı değil.`);
        v = n ?? (f.nullable ? null : 0);
        break;
      }
      case "int":
        v = s === "" ? (f.nullable ? null : 0) : parseInt(s, 10);
        break;
      case "date":
        v = s || null;
        break;
      case "month":
        v = s ? `${s}-01` : null;
        break;
      default:
        v = s.trim() || (f.nullable ? null : "");
    }
    if (f.required && visible(f) && (v === null || v === "")) throw new Error(`"${f.label}" alanı gerekli.`);
    out[f.name] = v;
  }
  return out;
}

export function FormDialog({
  title,
  fields,
  initial = {},
  submitText = "Kaydet",
  onSubmit,
  onClose,
}: {
  title: string;
  fields: Field[];
  initial?: FormValues;
  submitText?: string;
  /** Hata mesajı döndürürse pencere açık kalır. */
  onSubmit: (values: FormValues) => Promise<string | undefined>;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, toRaw(f, initial[f.name])])),
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const firstInput = useRef<HTMLElement>(null);

  // onClose her render'da yeni fonksiyon olabilir; odağın tekrar ilk alana kaymaması için ref ile tutulur.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    firstInput.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visible = (f: Field) => !f.show || f.show(raw);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let values: FormValues;
    try {
      values = { ...initial, ...parseValues(fields, raw, visible) };
    } catch (ex) {
      setError((ex as Error).message);
      return;
    }
    startTransition(async () => {
      const err = await onSubmit(values);
      if (err) setError(err);
      else onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-[580px] animate-pop overflow-auto rounded-t-[24px] border border-line bg-surface p-6 shadow-pop sm:rounded-[24px]"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
          <button type="button" className="btn-ghost btn-icon rounded-full" onClick={onClose} aria-label="Kapat">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          {fields.filter(visible).map((f, i) => (
            <label key={f.name} className={`flex flex-col gap-1 ${f.full ? "sm:col-span-2" : ""}`}>
              <span className="text-[13px] font-medium text-muted">
                {f.label}
                {f.required && " *"}
              </span>
              <FieldInput
                field={f}
                value={raw[f.name] ?? ""}
                onChange={(v) => setRaw((r) => ({ ...r, [f.name]: v }))}
                inputRef={i === 0 ? firstInput : undefined}
              />
              {f.hint && <small className="text-xs text-muted">{f.hint}</small>}
            </label>
          ))}
        </div>
        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13.5px] font-medium text-danger">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Kaydediliyor…" : submitText}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  field: f,
  value,
  onChange,
  inputRef,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLElement | null>;
}) {
  const common = {
    name: f.name,
    value,
    className: "input",
    ref: inputRef as React.Ref<never>,
  };
  switch (f.type) {
    case "bank":
      return <BankSelect value={value} onChange={onChange} />;
    case "select":
      return (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          {f.options!.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />;
    case "date":
    case "month":
      return <input {...common} type={f.type} onChange={(e) => onChange(e.target.value)} />;
    case "int":
      return (
        <input {...common} type="number" step={1} min={f.min ?? 0} max={f.max} placeholder={f.placeholder}
          onChange={(e) => onChange(e.target.value)} />
      );
    case "money":
    case "percent":
      return (
        <input {...common} type="text" inputMode="decimal" autoComplete="off" placeholder={f.placeholder ?? "0,00"}
          onChange={(e) => onChange(e.target.value)} />
      );
    default:
      return (
        <input {...common} type="text" autoComplete="off" placeholder={f.placeholder}
          onChange={(e) => onChange(e.target.value)} />
      );
  }
}
