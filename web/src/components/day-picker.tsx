"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Bugünden itibaren ayın verilen gününe denk gelen ilk tarih (kısa aylarda son güne kırpılır). */
function nextOccurrence(day: number, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 2; i++) {
    const y = today.getFullYear(), m = today.getMonth() + i;
    const d = new Date(y, m, Math.min(day, daysInMonth(y, m)));
    if (d >= today) return d;
  }
  return today;
}

const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Ayın gününü takvimden seçtirir. Değer "1".."31" metnidir (her ay tekrarlanan gün);
 * takvimde tıklanan tarihin yalnızca günü kaydedilir.
 */
export function DayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = Number(value) || 0;
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [view, setView] = useState(() => {
    const base = selected ? nextOccurrence(selected) : now;
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // Pazartesi başlangıçlı
  const total = daysInMonth(view.y, view.m);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  // Seçilen gün bu ayda yoksa (ör. 31 → Şubat) ayın son günü vurgulanır.
  const highlighted = selected ? Math.min(selected, total) : 0;
  const isToday = (d: number) => d === now.getDate() && view.m === now.getMonth() && view.y === now.getFullYear();

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="input flex items-center gap-2.5 text-left">
        <CalendarDays className="size-4 shrink-0 text-muted" />
        {selected ? (
          <span className="min-w-0 flex-1 truncate">
            Her ayın <b className="font-semibold">{selected}.</b> günü
            <span className="text-muted"> · sonraki {fmt(nextOccurrence(selected))}</span>
          </span>
        ) : (
          <span className="flex-1 text-muted">Takvimden gün seç</span>
        )}
      </button>

      {open && (
        <div
          className="mt-2 animate-pop rounded-2xl border border-line bg-surface p-3 shadow-card"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              // Yalnızca takvimi kapat, form penceresini değil.
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn-ghost btn-icon rounded-full" onClick={() => shift(-1)} aria-label="Önceki ay">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[14px] font-semibold capitalize">
              {first.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
            </span>
            <button type="button" className="btn-ghost btn-icon rounded-full" onClick={() => shift(1)} aria-label="Sonraki ay">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-[11px] font-semibold uppercase text-muted">{w}</div>
            ))}
            {cells.map((d, i) =>
              d === null ? <div key={`e${i}`} /> : (
                <button key={d} type="button" aria-pressed={d === highlighted}
                  aria-label={`${d} ${first.toLocaleDateString("tr-TR", { month: "long" })}`}
                  onClick={() => { onChange(String(d)); setOpen(false); }}
                  className={`tabular aspect-square rounded-xl text-[13.5px] font-medium transition-colors ${
                    d === highlighted
                      ? "bg-gradient-to-br from-accent to-accent-2 text-white shadow-sm"
                      : isToday(d)
                        ? "text-accent ring-1 ring-accent/40 hover:bg-accent-soft"
                        : "hover:bg-surface-2"
                  }`}>
                  {d}
                </button>
              ),
            )}
          </div>
          <p className="mt-2 px-1 text-[11.5px] text-muted">Seçtiğin gün her ay tekrarlanır.</p>
        </div>
      )}
    </div>
  );
}
