"use client";

import { useMemo, useState } from "react";
import { BANK_GROUPS, findBank, searchBanks } from "@/lib/banks";
import { BankLogo } from "./bank-logo";

/** Logolu, aranabilir banka seçici. Değer olarak bankanın adını tutar. */
export function BankSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findBank(value);
  const results = useMemo(() => searchBanks(query), [query]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function toggle() {
    setOpen((o) => !o);
    setQuery("");
  }

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="listbox"
        className="input flex items-center gap-2 text-left">
        {value ? (
          <>
            <BankLogo bank={value} size={22} />
            <span className="flex-1 truncate">{selected?.name ?? value}</span>
          </>
        ) : (
          <span className="flex-1 text-muted">Banka seç</span>
        )}
        <span className="text-muted" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="mt-2 animate-pop overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                // Yalnızca listeyi kapat, form penceresini değil.
                e.stopPropagation();
                setOpen(false);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[0]) choose(results[0].name);
              }
            }}
            placeholder="Banka ara…"
            aria-label="Banka ara"
            className="w-full border-b border-line bg-surface-2 px-3 py-2 outline-none"
          />
          <div role="listbox" className="max-h-64 overflow-y-auto py-1">
            {BANK_GROUPS.map(({ group, label }) => {
              const items = results.filter((b) => b.group === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
                  {items.map((b) => (
                    <button key={b.slug} type="button" role="option" aria-selected={selected?.slug === b.slug}
                      onClick={() => choose(b.name)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                        selected?.slug === b.slug ? "bg-accent-soft font-semibold text-accent" : ""
                      }`}>
                      <BankLogo bank={b} size={24} />
                      {b.name}
                    </button>
                  ))}
                </div>
              );
            })}
            {!results.length && <div className="px-3 py-3 text-sm text-muted">Sonuç bulunamadı.</div>}
            {value && (
              <button type="button" onClick={() => choose("")}
                className="mt-1 w-full border-t border-line px-3 py-2 text-left text-sm text-muted hover:bg-surface-2">
                Seçimi kaldır
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
