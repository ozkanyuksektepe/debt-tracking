// Bankaların hesap ürünleri. Hesap formunda seçilen bankaya göre "Hesap türü" listesi buradan süzülür.
// Adlar bankaların kendi sitelerinden (Ekim 2026); ürün eklemek için ilgili bankanın listesine yaz.
// Seçilen ad hesabın "type" alanında saklanır; türün grubu (vadesiz, KMH...) adından bulunur.
import { findBank } from "./banks";

export type AccountKind = "Vadesiz" | "Günlük" | "Vadeli" | "Altın" | "Birikim" | "KMH" | "Nakit" | "Diğer";

export const KIND_LABELS: Record<AccountKind, string> = {
  Vadesiz: "Vadesiz hesaplar",
  Günlük: "Günlük (gecelik) faizli",
  Vadeli: "Vadeli hesaplar",
  Altın: "Altın ve kıymetli maden",
  Birikim: "Birikim hesapları",
  KMH: "Kredili mevduat hesabı (KMH)",
  Nakit: "Nakit",
  Diğer: "Diğer",
};

type Products = Partial<Record<AccountKind, string[]>>;

const BANK_PRODUCTS: Record<string, Products> = {
  garanti: {
    Vadesiz: ["Vadesiz TL Hesabı", "Vadesiz Döviz Hesabı"],
    Günlük: ["Yanımda Mevduat Hesabı"],
    Vadeli: ["Vadeli TL Hesabı", "e-Vadeli Hesap", "Vadeli Döviz Hesabı", "Biriktirdiğini Ödeyen Mevduat"],
    Altın: ["Vadesiz Altın Hesabı", "Vadeli Altın Hesabı", "Vadesiz Gümüş Hesabı"],
    Birikim: ["Kolay Birikim Hesabı", "Smart Birikim Hesabı", "Net Hesap", "Birikimli Altın Hesabı", "Garantili Gelecek"],
    KMH: ["Avans Hesap"],
  },
  yapikredi: {
    Vadesiz: ["Vadesiz Hesap"],
    Vadeli: ["Vadeli Mevduat Hesabı", "Döviz Dönüşümlü Kur Korumalı TL Vadeli Mevduat"],
    Altın: ["Altın Mevduatı"],
    Birikim: ["Kartopu", "İlk Param"],
    KMH: ["Esnek Hesap"],
  },
  akbank: {
    Vadesiz: ["Vadesiz Mevduat Hesabı", "Vadesiz DTH"],
    Günlük: ["Serbest Plus"],
    Vadeli: ["Vadeli TL Hesabı", "Vadeli DTH"],
    Altın: ["Vadesiz Altın Hesabı", "Vadeli Altın Hesabı"],
    Birikim: ["Mevduat Birikim Hesabı", "Altın Biriktiren Esnek Birikim Hesabı"],
    KMH: ["Artı Para"],
  },
  isbank: {
    Vadesiz: ["Vadesiz TL Mevduat Hesabı", "Vadesiz Döviz Hesabı"],
    Günlük: ["Maximum Vadeli Hesap", "Günlük Kazandıran Hesap"],
    Vadeli: ["Vadeli TL Mevduat Hesabı", "Vade Bekletmeyen Mevduat Hesabı", "Vadeli Döviz Hesabı"],
    Altın: ["Vadesiz Altın Hesabı", "Vadeli Altın Hesabı"],
    Birikim: ["Biriktiren Genç Hesap", "Günlük Vadeli Kumbara Hesabı", "Vadeli Kumbara Hesabı"],
    KMH: ["Ek Hesap"],
  },
  // Diğer bankalarda yalnızca KMH ürününün adı biliniyor; hesaplar için genel türler kullanılır.
  ziraat: { KMH: ["Kredili Mevduat Hesabı"] },
  halkbank: { KMH: ["Kredili Mevduat Hesabı"] },
  vakifbank: { KMH: ["Kredili Bankomat Hesabı"] },
  qnb: { KMH: ["Ek Hesap"] },
  denizbank: { KMH: ["Kurtaran Hesap"] },
  enpara: { KMH: ["Ek Para"] },
};

/** Bankaya özel ürünü olmayan gruplarda gösterilen genel türler. */
const GENERIC: Products = {
  Vadesiz: ["Vadesiz hesap", "Vadesiz döviz hesabı"],
  Günlük: ["Günlük faizli hesap"],
  Vadeli: ["Vadeli hesap"],
  Altın: ["Altın hesabı"],
  Birikim: ["Birikim hesabı"],
  KMH: ["Kredili Mevduat Hesabı (KMH)"],
  Diğer: ["Diğer"],
};

/** Banka seçilmemişse (nakit, cüzdan...) gösterilenler. */
const NO_BANK: Products = { Nakit: ["Nakit"], Birikim: ["Birikim"], Diğer: ["Diğer"] };

/** Eski kayıtlardaki genel türler. */
const LEGACY: Record<string, AccountKind> = { Banka: "Vadesiz", Nakit: "Nakit", Birikim: "Birikim", Diğer: "Diğer" };

const KIND_ORDER: AccountKind[] = ["Vadesiz", "Günlük", "Vadeli", "Altın", "Birikim", "KMH", "Nakit", "Diğer"];

/** Seçilen bankaya göre hesap türü seçenekleri, gruplu. Bankanın ürünü olmayan gruplarda genel tür çıkar. */
export function accountTypeGroups(bank: string | null | undefined): { group: string; options: [string, string][] }[] {
  const products = bank ? BANK_PRODUCTS[findBank(bank)?.slug ?? ""] ?? {} : null;
  return KIND_ORDER.flatMap((kind) => {
    const names = products ? (products[kind]?.length ? products[kind] : GENERIC[kind]) : NO_BANK[kind];
    return names?.length ? [{ group: KIND_LABELS[kind], options: names.map((n): [string, string] => [n, n]) }] : [];
  });
}

/** Hesap türü adından grubunu bulur (bilinmeyen ad → Diğer). */
export function accountKind(type: string): AccountKind {
  if (LEGACY[type]) return LEGACY[type];
  for (const products of [GENERIC, ...Object.values(BANK_PRODUCTS)]) {
    for (const kind of KIND_ORDER) if (products[kind]?.includes(type)) return kind;
  }
  return "Diğer";
}
