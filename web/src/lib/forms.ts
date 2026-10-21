// Form alanı tanımları. İstemci bileşenlerinde kullanılır (show fonksiyonları sunucudan gönderilemez).
import type { Resource } from "./actions";
import { accountKind, accountTypeGroups, type AccountKind } from "./account-types";
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
  /** "select": diğer alanlara göre değişen, gruplu seçenekler (options yerine). */
  groups?: (raw: Record<string, string>) => { group: string; options: [string, string][] }[];
  /** Bu alan değişince, seçili değer yeni seçeneklerde yoksa temizlenir. */
  dependsOn?: string;
  /** Diğer alanlara göre değişen etiket/ipucu (ör. hesap türüne göre "Esnek Hesap limiti"). */
  labelFor?: (raw: Record<string, string>) => string;
  hintFor?: (raw: Record<string, string>) => string | undefined;
  /** Ham form değerlerine göre alanın görünüp görünmeyeceği. Gizli alanlar boş/0 kaydedilir. */
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

const kindOf = (r: Record<string, string>) => accountKind(r.type ?? "");
const kindIs = (...kinds: AccountKind[]) => (r: Record<string, string>) => !!r.type && kinds.includes(kindOf(r));

const accountFields: Field[] = [
  { name: "bank", label: "Banka", type: "bank", nullable: true, hint: "Nakit için boş bırak" },
  {
    name: "type", label: "Hesap türü", type: "select", required: true, dependsOn: "bank",
    groups: (r) => accountTypeGroups(r.bank), hint: "Seçilen bankanın hesapları ve kredili mevduat hesabı",
  },
  { name: "name", label: "Hesap adı", nullable: true, placeholder: "Boş bırakırsan hesap türü kullanılır", full: true },
  {
    name: "balance", label: "Bakiye", type: "money",
    labelFor: (r) => ({ KMH: "Güncel bakiye", Vadeli: "Anapara", Altın: "TL karşılığı" } as Partial<Record<AccountKind, string>>)[kindOf(r)] ?? "Bakiye",
    hintFor: (r) => ({
      KMH: "Bankanın gösterdiği bakiye; eksi (−) ise o kadar kullanmışsın",
      Altın: "Altının bugünkü TL değeri",
      Vadeli: "Vadeye yatırdığın tutar",
    } as Partial<Record<AccountKind, string>>)[kindOf(r)],
  },
  // KMH
  { name: "limit", label: "Limit", type: "money", show: kindIs("KMH"), labelFor: (r) => `${r.type} limiti` },
  {
    name: "available", label: "Kullanılabilir bakiye", type: "computed", show: kindIs("KMH"),
    hint: "Limit + güncel bakiye",
    compute: (r) => {
      const v = num(r, "limit") + num(r, "balance");
      return { value: money(v), tone: v < 0 ? "danger" : "ok" };
    },
  },
  // Faiz: KMH'de aylık, vadeli ve günlük faizli hesapta yıllık
  {
    name: "interestRate", label: "Faiz oranı (%)", type: "percent", show: kindIs("KMH", "Vadeli", "Günlük"),
    labelFor: (r) => (kindOf(r) === "KMH" ? "Aylık faiz oranı (%)" : "Yıllık faiz oranı (%)"),
    placeholder: "Örn. 4,25", hint: "Bilgi amaçlı",
  },
  { name: "maturityDate", label: "Vade sonu", type: "date", show: kindIs("Vadeli") },
  {
    name: "dailyReturn", label: "Tahmini günlük getiri (brüt)", type: "computed", show: kindIs("Günlük"),
    hint: "Bakiye × yıllık faiz ÷ 365, stopaj hariç",
    compute: (r) => ({ value: money((num(r, "balance") * num(r, "interestRate")) / 100 / 365) }),
  },
  // Altın
  { name: "quantity", label: "Miktar (gram)", type: "percent", show: kindIs("Altın"), placeholder: "Örn. 12,5" },
  { name: "notes", label: "Notlar", type: "textarea", full: true, nullable: true },
];

export const FORMS: Record<Resource, { fields: Field[]; addTitle: string; editTitle: string }> = {
  loans: { fields: loanFields, addTitle: "Yeni kredi", editTitle: "Krediyi düzenle" },
  cards: { fields: cardFields, addTitle: "Yeni kredi kartı", editTitle: "Kartı / ekstreyi güncelle" },
  "card-installments": { fields: installmentFields, addTitle: "Taksitli alışveriş ekle", editTitle: "Taksidi düzenle" },
  others: { fields: otherFields, addTitle: "Yeni borç / düzenli ödeme", editTitle: "Düzenle" },
  accounts: { fields: accountFields, addTitle: "Yeni hesap", editTitle: "Hesabı düzenle" },
};
