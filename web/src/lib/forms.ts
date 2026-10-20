// Form alanı tanımları. İstemci bileşenlerinde kullanılır (show fonksiyonları sunucudan gönderilemez).
import type { Resource } from "./actions";

export type FormValues = Record<string, unknown>;

export type Field = {
  name: string;
  label: string;
  type?: "text" | "bank" | "money" | "percent" | "int" | "date" | "month" | "select" | "textarea";
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
  { name: "firstInstallmentDate", label: "İlk taksit tarihi", type: "date", required: true },
  { name: "paidInstallments", label: "Ödenmiş taksit sayısı", type: "int", hint: "Bugüne kadar ödediğin taksitler" },
  { name: "notes", label: "Notlar", type: "textarea", full: true, nullable: true },
];

const cardFields: Field[] = [
  { name: "name", label: "Kart adı", required: true, placeholder: "Örn. Bonus", full: true },
  { name: "bank", label: "Banka", type: "bank", nullable: true },
  { name: "limit", label: "Kart limiti", type: "money" },
  { name: "statementBalance", label: "Dönem borcu (ekstre)", type: "money", hint: "Son ekstreden ödenmemiş kalan" },
  { name: "minimumPayment", label: "Asgari ödeme", type: "money" },
  { name: "currentBalance", label: "Güncel toplam borç", type: "money", hint: "Ekstre + dönem içi harcamalar" },
  { name: "statementDay", label: "Hesap kesim günü", type: "int", min: 1, max: 31, required: true },
  { name: "dueDay", label: "Son ödeme günü", type: "int", min: 1, max: 31, required: true },
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
