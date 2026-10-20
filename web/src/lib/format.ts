const TL = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const COMPACT = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });
export const NUM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export const money = (v: number | null | undefined) => TL.format(v ?? 0);
export const short = (v: number) => COMPACT.format(v);

const toDate = (d: string) => new Date(d + "T00:00:00");

export const fmtDate = (d: string | null | undefined) =>
  d ? toDate(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export const fmtDay = (d: string | null | undefined) =>
  d ? toDate(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—";

export const monthName = (y: number, m: number) =>
  new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

export const monthShort = (y: number, m: number) =>
  new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "short" }) + (m === 1 ? ` ${String(y).slice(2)}` : "");

export const daysBetween = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);

export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** "12.500,50", "12500.5", "12.500" gibi girişleri sayıya çevirir. Boşsa null, geçersizse NaN. */
export function parseNum(input: string): number | null {
  let s = input.trim().replace(/\s|TL|₺/gi, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const kindColor = (kind: string) =>
  ({ Kredi: "var(--c1)", "Kredi kartı": "var(--c2)", "Kişisel borç": "var(--c3)", "Düzenli ödeme": "var(--c4)" })[kind] ??
  "var(--muted)";
