// Form alanı tanımları. İstemci bileşenlerinde kullanılır (show fonksiyonları sunucudan gönderilemez).
import type { Resource } from "./actions";
import { addMonthsIso, fmtDate, money, parseNum } from "./format";

export type FormValues = Record<string, unknown>;

export type Field = {
  name: string;
  label: string;
  type?: "text" | "bank" | "day" | "computed" | "money" | "percent" | "int" | "date" | "month" | "select" | "textarea";
  required?: boolean;
  nullable?: boolean;
  full?: boolean;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: [string, string][];
  /** Ham form değerlerine göre alanın görünüp görünmeyeceği. */
  show?: (raw: Record<string, string>) => boolean;
  /** "computed" alanlar: girilen değerlerden canlı hesaplanır, kaydedilmez. */
  compute?: (raw: Record<string, string>, initial: FormValues) => { value: string; tone?: "danger" | "ok" };
};

/** Form içindeki ham metni sayıya çevirir (boş/geçersiz → 0). */
const num = (raw: Record<string, string>, name: string) => {
  const n = parseNum(raw[name] ?? "");
  return n === null || Number.isNaN(n) ? 0 : n;
};

const opts = (...values: string[]): [string, string][] => values.map((v) => [v, v]);

const loanFields: Field[] = [
  { name: "name", label: "Kredi adı", required: true, placeholder: "Örn. İhtiyaç kredisi", full: true },
  { name: "bank", label: "Banka", type: "bank", nullable: true },
  { name: "type", label: "Tür", type: "select", options: opts("İhtiyaç", "Konut", "Taşıt", "KMH / Esnek", "Diğer") },
  { name: "principal", label: "Çekilen tutar (anapara)", type: "money", required: true },
  { name: "interestRate", label: "Aylık faiz oranı (%)", type: "percent", placeholder: "Örn. 3,49", hint: "Bilgi amaçlı" },
  { name: "monthlyInstallment", label: "Aylık taksit", type: "money", hint: "Boş bırakırsan faizden hesaplanır (vergiler hariç)" },
  { name: "termMonths", label: "Vade (ay)", type: "int", required: true, min: 1 },
  { name: "openedDate", label: "Kredi açılış tarihi", type: "date", hint: "Kredinin hesabına geçtiği tarih" },
  { name: "firstInstallmentDate", label: "İlk taksit tarihi", type: "date", required: true },
  {
    name: "endDate", label: "Bitiş tarihi (son taksit)", type: "computed",
    hint: "İlk taksit tarihi + vade",
    compute: (r) => {
      const term = parseInt(r.termMonths ?? "", 10);
      return r.firstInstallmentDate && term > 0
        ? { value: fmtDate(addMonthsIso(r.firstInstallmentDate, term - 1)) }
        : { value: "İlk taksit ve vade girilince hesaplanır" };
    },
  },
  { name: "paidInstallments", label: "Ödenmiş taksit sayısı", type: "int", hint: "Bugüne kadar ödediğin taksitler" },
  { name: "notes", label: "Notlar", type: "textarea", full: true, nullable: true },
];

const cardFields: Field[] = [
  { name: "name", label: "Kart adı", required: true, placeholder: "Örn. Bonus", full: true },
  { name: "bank", label: "Banka", type: "bank", nullable: true },
  { name: "limit", label: "Kart limiti", type: "money" },
  { name: "statementBalance", label: "Dönem borcu (ekstre tutarı)", type: "money", hint: "Son ekstrede yazan toplam borç" },
  { name: "minimumPayment", label: "Asgari ödeme", type: "money", hint: "Ekstredeki asgari tutar" },
  { name: "paidAmount", label: "Bu dönem ödenen", type: "money", hint: "Bu ekstreye ödediğin toplam. Yeni ekstrede sıfırla." },
  { name: "currentBalance", label: "Güncel toplam borç", type: "money", hint: "Bankanın gösterdiği güncel borç" },
  {
    name: "unbilledAmount", label: "Dönem içi harcamalar", type: "computed",
    hint: "Güncel borç − (dönem borcu − ödenen)",
    compute: (r) => {
      const v = num(r, "currentBalance") - (num(r, "statementBalance") - num(r, "paidAmount"));
      return v < -0.005
        ? { value: "Güncel borç, kalan dönem borcundan az olamaz", tone: "danger" }
        : { value: money(Math.max(0, v)) };
    },
  },
  {
    name: "availableLimit", label: "Kullanılabilir limit", type: "computed",
    hint: "Limit − güncel borç − gelecek taksitler",
    compute: (r, initial) => {
      const v = num(r, "limit") - num(r, "currentBalance") - Number(initial.futureInstallmentsTotal ?? 0);
      return { value: money(v), tone: v < 0 ? "danger" : "ok" };
    },
  },
  { name: "statementDay", label: "Hesap kesim günü", type: "day", required: true, hint: "Ekstrenin kesildiği gün" },
  { name: "dueDay", label: "Son ödeme günü", type: "day", required: true, hint: "Hesap kesimden sonraki ilk bu gün" },
  { name: "notes", label: "Notlar", type: "textarea", full: true, nullable: true },
];

const installmentFields: Field[] = [
  { name: "description", label: "Açıklama", required: true, placeholder: "Örn. Telefon", full: true },
  { name: "monthlyAmount", label: "Aylık taksit tutarı", type: "money", required: true },
  { name: "totalCount", label: "Toplam taksit sayısı", type: "int", min: 1, required: true },
  {
    name: "firstDueDate", label: "İlk taksidin ödeneceği ay", type: "month", required: true, full: true,
    hint: "Henüz güncel borca yansımamış taksitler hesaplamaya eklenir.",
  },
];

const isDebt = (raw: Record<string, string>) => raw.kind !== "Düzenli";

const otherFields: Field[] = [
  { name: "kind", label: "Tür", type: "select", full: true, options: [["Borç", "Kişisel borç"], ["Düzenli", "Düzenli ödeme (kira, fatura...)"]] },
  { name: "name", label: "Ad", required: true, placeholder: "Örn. Ahmet'e borç / Kira" },
  { name: "creditor", label: "Kime", nullable: true },
  { name: "remainingAmount", label: "Kalan borç", type: "money", show: isDebt },
  { name: "monthlyAmount", label: "Aylık ödeme", type: "money", hint: "Borcu taksitle ödüyorsan doldur" },
  { name: "dueDay", label: "Ödeme günü (ayın kaçı)", type: "int", min: 1, max: 31, nullable: true },
  { name: "dueDate", label: "Tek seferlik vade tarihi", type: "date", show: isDebt, hint: "Aylık ödeme yoksa" },
  { name: "notes", label: "Notlar", type: "textarea", full: true, nullable: true },
];

const accountFields: Field[] = [
  { name: "name", label: "Hesap adı", required: true, placeholder: "Örn. Ziraat vadesiz", full: true },
  { name: "type", label: "Tür", type: "select", options: opts("Banka", "Nakit", "Birikim", "Diğer") },
  { name: "balance", label: "Bakiye", type: "money" },
  { name: "notes", label: "Notlar", type: "textarea", full: true, nullable: true },
];

export const FORMS: Record<Resource, { fields: Field[]; addTitle: string; editTitle: string }> = {
  loans: { fields: loanFields, addTitle: "Yeni kredi", editTitle: "Krediyi düzenle" },
  cards: { fields: cardFields, addTitle: "Yeni kredi kartı", editTitle: "Kartı / ekstreyi güncelle" },
  "card-installments": { fields: installmentFields, addTitle: "Taksitli alışveriş ekle", editTitle: "Taksidi düzenle" },
  others: { fields: otherFields, addTitle: "Yeni borç / düzenli ödeme", editTitle: "Düzenle" },
  accounts: { fields: accountFields, addTitle: "Yeni hesap", editTitle: "Hesabı düzenle" },
};
