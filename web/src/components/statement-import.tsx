"use client";

import { FileUp, LockKeyhole, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { parseStatement, saveEntity } from "@/lib/actions";
import { detectBank, findBank } from "@/lib/banks";
import { fmtDate, money, NUM, parseNum } from "@/lib/format";
import type { CardView, Found, ParsedStatement } from "@/lib/types";
import { Badge } from "./ui";

/** Ödemeler sayfasındaki kart ödemelerinin özeti; hesap kesimden sonra ödeneni bulmak için. */
export type CardPayment = { targetId: number; date: string; amount: number };

const ACCEPT = ".pdf,.xlsx,.xls,.csv,.txt";

/** Kartın ekstresini dosyadan okuyup önizleten, onaylanınca kartı güncelleyen buton. */
export function StatementImportButton({ cardId, cards, payments }: { cardId: number; cards: CardView[]; payments: CardPayment[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        <FileUp className="size-3.5" strokeWidth={2.25} />
        Ekstre yükle
      </button>
      {open && <StatementDialog cardId={cardId} cards={cards} payments={payments} onClose={() => setOpen(false)} />}
    </>
  );
}

const fmtNum = (v: number | null | undefined) => (v === null || v === undefined ? "" : NUM.format(v));
const numOr0 = (s: string) => {
  const n = parseNum(s);
  return n === null || Number.isNaN(n) ? 0 : n;
};
const dayOf = (iso: string) => Number(iso.slice(8, 10));

/** Ekstre hangi karta ait: önce kart adında/notunda geçen son 4 hane, sonra banka, yoksa açıldığı kart. */
function guessCard(s: ParsedStatement, cards: CardView[], fallbackId: number): { id: number; reason?: string } {
  if (s.cardLast4) {
    const byNumber = cards.find((c) => `${c.card.name} ${c.card.notes ?? ""}`.includes(s.cardLast4!));
    if (byNumber) return { id: byNumber.card.id, reason: `kart numarasının son 4 hanesi (${s.cardLast4})` };
  }
  const bank = detectBank(s.text);
  const opened = cards.find((c) => c.card.id === fallbackId);
  if (bank && findBank(opened?.card.bank)?.slug !== bank.slug) {
    const sameBank = cards.filter((c) => findBank(c.card.bank)?.slug === bank.slug);
    if (sameBank.length === 1) return { id: sameBank[0].card.id, reason: `banka (${bank.name})` };
  }
  return { id: fallbackId };
}

/** Hesap kesimden sonra bu karta kaydedilmiş ödemeler (o günkü ödemeler ekstreye yansımış sayılır). */
const paidAfter = (payments: CardPayment[], cardId: number, statementDate: string) =>
  payments.filter((p) => p.targetId === cardId && (!statementDate || p.date > statementDate)).reduce((s, p) => s + p.amount, 0);

type Draft = {
  cardId: number;
  statementBalance: string;
  minimumPayment: string;
  statementDate: string;
  dueDate: string;
  paidAmount: string;
  currentBalance: string;
  limit: string;
  updateLimit: boolean;
  updateStatementDay: boolean;
  updateDueDay: boolean;
};

function initialDraft(s: ParsedStatement, cards: CardView[], payments: CardPayment[], cardId: number): Draft {
  const view = cards.find((c) => c.card.id === cardId)!;
  const card = view.card;
  const statementDate = s.statementDate?.value ?? "";
  const statementBalance = s.statementBalance?.value ?? card.statementBalance;
  // Aynı ekstre tekrar yüklenirse elle girilmiş "bu dönem ödenen" kaybolmasın.
  const same = statementDate === view.lastStatementDate && statementBalance === card.statementBalance;
  const paid = Math.max(paidAfter(payments, cardId, statementDate), same ? card.paidAmount : 0);
  return {
    cardId,
    statementBalance: fmtNum(statementBalance),
    minimumPayment: fmtNum(s.minimumPayment?.value ?? card.minimumPayment),
    statementDate,
    dueDate: s.dueDate?.value ?? "",
    paidAmount: fmtNum(paid),
    // Hesap kesim borcu değiştirmez: güncel borç en az eski güncel borç, en az kalan dönem borcu kadardır.
    currentBalance: fmtNum(Math.max(card.currentBalance, statementBalance - paid)),
    limit: fmtNum(s.limit?.value ?? card.limit),
    updateLimit: s.limit !== null && s.limit.value !== card.limit,
    updateStatementDay: false,
    updateDueDay: false,
  };
}

function StatementDialog({ cardId, cards, payments, onClose }: {
  cardId: number; cards: CardView[]; payments: CardPayment[]; onClose: () => void;
}) {
  const [statement, setStatement] = useState<ParsedStatement>();
  const [matchReason, setMatchReason] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [paidTouched, setPaidTouched] = useState(false);
  const [file, setFile] = useState<File>();
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function read(f: File, pwd?: string) {
    setFile(f);
    setError(undefined);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", f);
      if (pwd) fd.set("password", pwd);
      const r = await parseStatement(fd);
      if (!r.statement) {
        setError(r.error ?? "Ekstre okunamadı.");
        setNeedsPassword(!!r.needsPassword);
        return;
      }
      const guess = guessCard(r.statement, cards, cardId);
      setNeedsPassword(false);
      setPassword("");
      setStatement(r.statement);
      setMatchReason(guess.reason);
      setPaidTouched(false);
      setDraft(initialDraft(r.statement, cards, payments, guess.id));
    });
  }

  function reset() {
    setStatement(undefined);
    setDraft(undefined);
    setFile(undefined);
    setError(undefined);
    setNeedsPassword(false);
  }

  const view = draft && cards.find((c) => c.card.id === draft.cardId);
  const set = (patch: Partial<Draft>) => setDraft((d) => d && { ...d, ...patch });

  function changeCard(id: number) {
    if (!statement) return;
    setPaidTouched(false);
    setDraft(initialDraft(statement, cards, payments, id));
  }

  function changeStatementDate(statementDate: string) {
    if (!draft) return;
    set(paidTouched ? { statementDate } : { statementDate, paidAmount: fmtNum(paidAfter(payments, draft.cardId, statementDate)) });
  }

  // Backend'deki kart doğrulamasıyla aynı kural: güncel borç kalan dönem borcundan az olamaz.
  const shortfall = draft ? numOr0(draft.statementBalance) - numOr0(draft.paidAmount) - numOr0(draft.currentBalance) : 0;

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !view) return;
    for (const [label, v] of [["Dönem borcu", draft.statementBalance], ["Asgari ödeme", draft.minimumPayment],
      ["Bu dönem ödenen", draft.paidAmount], ["Güncel toplam borç", draft.currentBalance], ["Kart limiti", draft.limit]] as const) {
      if (Number.isNaN(parseNum(v))) return setError(`"${label}" geçerli bir sayı değil.`);
    }
    if (shortfall > 0.005) return setError("Güncel toplam borç, kalan dönem borcundan (dönem borcu − ödenen) az olamaz.");
    const card = view.card;
    const values = {
      ...card,
      statementBalance: numOr0(draft.statementBalance),
      minimumPayment: numOr0(draft.minimumPayment),
      paidAmount: numOr0(draft.paidAmount),
      currentBalance: numOr0(draft.currentBalance),
      limit: draft.updateLimit ? numOr0(draft.limit) : card.limit,
      statementDay: draft.updateStatementDay && draft.statementDate ? dayOf(draft.statementDate) : card.statementDay,
      dueDay: draft.updateDueDay && draft.dueDate ? dayOf(draft.dueDate) : card.dueDay,
    };
    setError(undefined);
    startTransition(async () => {
      const r = await saveEntity("cards", values);
      if (r.error) setError(r.error);
      else onClose();
    });
  }

  const bank = statement && detectBank(statement.text);
  const cardBank = view && findBank(view.card.bank);
  const warnings: string[] = [];
  if (statement && draft && view) {
    if (bank && cardBank && bank.slug !== cardBank.slug)
      warnings.push(`Ekstre ${bank.name} bankasına ait görünüyor, seçili kart ise ${cardBank.name}. Doğru kartı seçtiğinden emin ol.`);
    if (draft.statementDate && draft.statementDate < view.lastStatementDate)
      warnings.push(`Bu ekstre kartın son hesap kesiminden (${fmtDate(view.lastStatementDate)}) daha eski. Uygularsan güncel dönem bilgisinin üzerine yazılır.`);
    if (draft.statementDate === view.lastStatementDate && numOr0(draft.statementBalance) === view.card.statementBalance)
      warnings.push("Bu ekstre karta zaten girilmiş görünüyor. Uygularsan yalnızca değiştirdiğin alanlar güncellenir.");
    if (!statement.statementBalance && !statement.minimumPayment && !statement.dueDate)
      warnings.push("Ekstrede tanıdık bir etiket bulunamadı. Değerleri aşağıdaki okunan metinden kontrol edip elle gir.");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid animate-fade place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={apply}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label="Ekstreden güncelle"
        className="max-h-[92vh] w-full max-w-[640px] animate-pop overflow-auto rounded-t-[24px] border border-line bg-surface p-6 shadow-pop sm:rounded-[24px]"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">Ekstreden güncelle</h2>
          <button type="button" className="btn-ghost btn-icon rounded-full" onClick={onClose} aria-label="Kapat">
            <X className="size-5" />
          </button>
        </div>

        {!statement || !draft || !view ? (
          <>
            <div
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"
              }`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) read(f);
              }}
            >
              <FileUp className="size-7 text-muted" />
              <div className="text-[15px] font-semibold">{pending ? "Ekstre okunuyor…" : file ? file.name : "Ekstre dosyasını buraya bırak ya da seç"}</div>
              <div className="text-[13px] text-muted">PDF, Excel (xlsx/xls) veya CSV. Dosya bilgisayarından çıkmaz, kaydedilmez.</div>
              <input ref={fileInput} type="file" accept={ACCEPT} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
            </div>

            {needsPassword && file && (
              <div className="mt-4 flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted"><LockKeyhole className="size-3.5" /> PDF şifresi</span>
                <div className="flex gap-2">
                  <input className="input flex-1" type="password" autoComplete="off" autoFocus value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (password) read(file, password); } }} />
                  <button type="button" className="btn-primary" disabled={!password || pending} onClick={() => read(file, password)}>Aç</button>
                </div>
                <small className="text-xs text-muted">E-posta ile gelen ekstreler genelde bankanın belirlediği şifreyle korunur. Şifre saklanmaz.</small>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line px-3.5 py-2.5 text-[13.5px]">
              <span className="min-w-0 truncate font-semibold">{statement.fileName}</span>
              {bank && <Badge tone="accent">{bank.name}</Badge>}
              {statement.cardLast4 && <Badge>•••• {statement.cardLast4}</Badge>}
              <button type="button" className="btn-ghost btn-sm ml-auto" onClick={reset}>
                <RotateCcw className="size-3.5" /> Başka dosya
              </button>
            </div>

            <label className="mt-4 flex flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">Uygulanacak kart</span>
              <select className="input" value={draft.cardId} onChange={(e) => changeCard(Number(e.target.value))}>
                {cards.map((c) => (
                  <option key={c.card.id} value={c.card.id}>{c.card.name}{c.card.bank ? ` · ${c.card.bank}` : ""}</option>
                ))}
              </select>
              {matchReason && <small className="text-xs text-muted">Ekstredeki {matchReason} ile eşleştirildi.</small>}
            </label>

            {warnings.map((w) => (
              <div key={w} className="mt-3 flex gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13px] font-medium text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {w}
              </div>
            ))}

            <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <MoneyInput label="Dönem borcu (ekstre tutarı)" value={draft.statementBalance} found={statement.statementBalance}
                was={view.card.statementBalance} onChange={(v) => set({ statementBalance: v })} />
              <MoneyInput label="Asgari ödeme" value={draft.minimumPayment} found={statement.minimumPayment}
                was={view.card.minimumPayment} onChange={(v) => set({ minimumPayment: v })} />
              <DateInput label="Hesap kesim tarihi" value={draft.statementDate} found={statement.statementDate} onChange={changeStatementDate}
                dayCheck={draft.statementDate && dayOf(draft.statementDate) !== view.card.statementDay ? {
                  text: `Hesap kesim gününü ${dayOf(draft.statementDate)} yap (şu an ${view.card.statementDay})`,
                  checked: draft.updateStatementDay, onChange: (v) => set({ updateStatementDay: v }),
                } : undefined} />
              <DateInput label="Son ödeme tarihi" value={draft.dueDate} found={statement.dueDate} onChange={(v) => set({ dueDate: v })}
                dayCheck={draft.dueDate && dayOf(draft.dueDate) !== view.card.dueDay ? {
                  text: `Son ödeme gününü ${dayOf(draft.dueDate)} yap (şu an ${view.card.dueDay}). Tatil kaydırmasıysa işaretleme.`,
                  checked: draft.updateDueDay, onChange: (v) => set({ updateDueDay: v }),
                } : undefined} />
              <MoneyInput label="Bu dönem ödenen" value={draft.paidAmount}
                onChange={(v) => { setPaidTouched(true); set({ paidAmount: v }); }}
                hint={draft.statementDate ? "Hesap kesimden sonra uygulamada kaydettiğin bu karta ait ödemeler" : "Hesap kesimden sonra bu ekstreye ödediğin toplam"}
                note={statement.periodPayments && {
                  text: `Ekstre dönemindeki ödemeler: ${money(statement.periodPayments.value)}. Bunlar önceki ekstreye yapıldı ve dönem borcundan zaten düşülmüş, bu yüzden buraya eklenmez.`,
                  title: statement.periodPayments.line,
                }} />
              <MoneyInput label="Güncel toplam borç" value={draft.currentBalance} onChange={(v) => set({ currentBalance: v })}
                error={shortfall > 0.005 ? "Kalan dönem borcundan az olamaz" : undefined}
                hint="Ekstre güncel borcu göstermez; ekstreden sonraki harcamalar varsa bankadaki değeri gir" />
              {statement.limit && (
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="flex items-center gap-2 text-[13.5px]">
                    <input type="checkbox" checked={draft.updateLimit} onChange={(e) => set({ updateLimit: e.target.checked })} />
                    Kart limitini güncelle: <span className="tabular font-semibold">{money(statement.limit.value)}</span>
                    <span className="text-muted">(şu an {money(view.card.limit)})</span>
                  </label>
                  <small className="pl-6 text-xs text-muted">Ekstrede: {statement.limit.line}</small>
                </div>
              )}
            </div>

            <details className="mt-4 rounded-2xl border border-line">
              <summary className="cursor-pointer px-3.5 py-2.5 text-[13px] font-medium text-muted">Ekstreden okunan metni göster</summary>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-line px-3.5 py-2.5 text-[12px] text-muted">{statement.text}</pre>
            </details>
          </>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13.5px] font-medium text-danger">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          {statement && draft && (
            <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Kaydediliyor…" : "Karta uygula"}</button>
          )}
        </div>
      </form>
    </div>,
    document.body,
  );
}

function Source({ found }: { found: Found<unknown> | null | undefined }) {
  if (found === undefined) return null;
  return found
    ? <small className="truncate text-xs text-muted" title={found.line}>Ekstrede: {found.line}</small>
    : <small className="text-xs font-medium text-warning">Ekstrede bulunamadı, kontrol edip elle gir</small>;
}

function MoneyInput({ label, value, onChange, found, was, hint, note, error }: {
  label: string; value: string; onChange: (v: string) => void;
  found?: Found<number> | null; was?: number; hint?: string; error?: string;
  /** Ekstreden okunan, alana yazılmayan bilgi. */
  note?: { text: string; title: string } | null;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] font-medium text-muted">
        {label}
        {was !== undefined && <span className="font-normal"> · önceki {money(was)}</span>}
      </span>
      <input className="input" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={value}
        onChange={(e) => onChange(e.target.value)} />
      {error ? <small className="text-xs font-medium text-danger">{error}</small> : <Source found={found} />}
      {hint && <small className="text-xs text-muted">{hint}</small>}
      {note && <small className="rounded-lg bg-surface-2 px-2 py-1.5 text-xs text-muted" title={note.title}>{note.text}</small>}
    </label>
  );
}

function DateInput({ label, value, onChange, found, dayCheck }: {
  label: string; value: string; onChange: (v: string) => void; found: Found<string> | null;
  dayCheck?: { text: string; checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <input className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <Source found={found} />
      {dayCheck && (
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" className="mt-0.5" checked={dayCheck.checked} onChange={(e) => dayCheck.onChange(e.target.checked)} />
          {dayCheck.text}
        </label>
      )}
    </div>
  );
}
