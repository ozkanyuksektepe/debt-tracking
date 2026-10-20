// Türkiye'de faaliyet gösteren mevduat ve katılım bankaları (BDDK listesi esas alınmıştır).
// Logo dosyaları public/banks/<slug>.png yolundan okunur; dosya yoksa renkli kısaltma gösterilir.

export type BankGroup = "Kamu" | "Özel" | "Yabancı" | "Katılım" | "Dijital";

export type Bank = {
  slug: string;
  name: string;
  /** Logo yoksa gösterilecek kısaltma. */
  code: string;
  color: string;
  domain: string;
  group: BankGroup;
  /** Elle yazılmış eski kayıtları eşleştirmek için alternatif adlar. */
  aliases?: string[];
};

export const BANKS: Bank[] = [
  // Kamu mevduat bankaları
  { slug: "ziraat", name: "Ziraat Bankası", code: "ZB", color: "#E30A17", domain: "ziraatbank.com.tr", group: "Kamu", aliases: ["ziraat", "t.c. ziraat bankası", "türkiye cumhuriyeti ziraat bankası"] },
  { slug: "halkbank", name: "Halkbank", code: "HB", color: "#0067B1", domain: "halkbank.com.tr", group: "Kamu", aliases: ["halk bankası", "türkiye halk bankası"] },
  { slug: "vakifbank", name: "VakıfBank", code: "VB", color: "#F2A900", domain: "vakifbank.com.tr", group: "Kamu", aliases: ["vakıf", "vakifbank", "vakıflar bankası", "türkiye vakıflar bankası"] },

  // Özel mevduat bankaları
  { slug: "isbank", name: "Türkiye İş Bankası", code: "İŞ", color: "#0B3C8C", domain: "isbank.com.tr", group: "Özel", aliases: ["iş bankası", "is bankasi", "işbank", "isbank"] },
  { slug: "garanti", name: "Garanti BBVA", code: "GB", color: "#1E8C4E", domain: "garantibbva.com.tr", group: "Özel", aliases: ["garanti", "garanti bankası", "bonus"] },
  { slug: "akbank", name: "Akbank", code: "AK", color: "#E2001A", domain: "akbank.com", group: "Özel", aliases: ["axess"] },
  { slug: "yapikredi", name: "Yapı Kredi", code: "YK", color: "#004B93", domain: "yapikredi.com.tr", group: "Özel", aliases: ["yapı kredi bankası", "yapi kredi", "world"] },
  { slug: "teb", name: "TEB", code: "TEB", color: "#00975F", domain: "teb.com.tr", group: "Özel", aliases: ["türk ekonomi bankası"] },
  { slug: "sekerbank", name: "Şekerbank", code: "ŞB", color: "#00843D", domain: "sekerbank.com.tr", group: "Özel", aliases: ["sekerbank"] },
  { slug: "anadolubank", name: "Anadolubank", code: "AB", color: "#C8102E", domain: "anadolubank.com.tr", group: "Özel" },
  { slug: "fibabanka", name: "Fibabanka", code: "FB", color: "#00A3AD", domain: "fibabanka.com.tr", group: "Özel", aliases: ["fiba"] },
  { slug: "alternatifbank", name: "Alternatif Bank", code: "ABank", color: "#D71920", domain: "alternatifbank.com.tr", group: "Özel", aliases: ["alternatifbank", "abank"] },
  { slug: "odeabank", name: "Odeabank", code: "OB", color: "#6D2077", domain: "odeabank.com.tr", group: "Özel", aliases: ["odea"] },
  { slug: "turkishbank", name: "Turkish Bank", code: "TB", color: "#9B1B30", domain: "turkishbank.com", group: "Özel" },
  { slug: "aktifbank", name: "Aktif Yatırım Bankası", code: "AKT", color: "#E4002B", domain: "aktifbank.com.tr", group: "Özel", aliases: ["aktifbank", "aktif bank", "n kolay"] },

  // Yabancı sermayeli bankalar
  { slug: "qnb", name: "QNB", code: "QNB", color: "#5C2D91", domain: "qnb.com.tr", group: "Yabancı", aliases: ["qnb finansbank", "finansbank", "qnb bank"] },
  { slug: "denizbank", name: "DenizBank", code: "DB", color: "#00539F", domain: "denizbank.com", group: "Yabancı", aliases: ["deniz", "denizbank"] },
  { slug: "ing", name: "ING", code: "ING", color: "#FF6200", domain: "ing.com.tr", group: "Yabancı", aliases: ["ing bank"] },
  { slug: "hsbc", name: "HSBC", code: "HSBC", color: "#DB0011", domain: "hsbc.com.tr", group: "Yabancı", aliases: ["hsbc türkiye", "hsbc bank"] },
  { slug: "burgan", name: "Burgan Bank", code: "BB", color: "#00467F", domain: "burgan.com.tr", group: "Yabancı", aliases: ["burgan"] },
  { slug: "icbc", name: "ICBC Turkey", code: "ICBC", color: "#C7000B", domain: "icbc.com.tr", group: "Yabancı", aliases: ["icbc"] },
  { slug: "citibank", name: "Citibank", code: "CITI", color: "#056DAE", domain: "citibank.com.tr", group: "Yabancı", aliases: ["citi"] },
  { slug: "atbank", name: "A&T Bank", code: "A&T", color: "#7A1F2B", domain: "atbank.com.tr", group: "Yabancı", aliases: ["arap türk bankası"] },
  { slug: "bankofchina", name: "Bank of China Turkey", code: "BOC", color: "#B81C22", domain: "bankofchina.com.tr", group: "Yabancı" },
  { slug: "deutschebank", name: "Deutsche Bank", code: "DB", color: "#0018A8", domain: "db.com", group: "Yabancı" },
  { slug: "intesa", name: "Intesa Sanpaolo", code: "IS", color: "#00804A", domain: "intesasanpaolo.com", group: "Yabancı" },
  { slug: "jpmorgan", name: "JPMorgan Chase", code: "JPM", color: "#5C4033", domain: "jpmorgan.com", group: "Yabancı" },
  { slug: "mufg", name: "MUFG Bank Turkey", code: "MUFG", color: "#E60012", domain: "mufg.jp", group: "Yabancı" },
  { slug: "socgen", name: "Société Générale", code: "SG", color: "#E9041E", domain: "societegenerale.com", group: "Yabancı" },
  { slug: "habib", name: "Habib Bank", code: "HBL", color: "#00845A", domain: "hbl.com", group: "Yabancı" },
  { slug: "mellat", name: "Bank Mellat", code: "BM", color: "#B5121B", domain: "bankmellat.ir", group: "Yabancı" },

  // Katılım bankaları
  { slug: "kuveytturk", name: "Kuveyt Türk", code: "KT", color: "#00754A", domain: "kuveytturk.com.tr", group: "Katılım", aliases: ["kuveyt türk katılım bankası", "kuveyt turk"] },
  { slug: "albaraka", name: "Albaraka Türk", code: "AT", color: "#0B6E4F", domain: "albaraka.com.tr", group: "Katılım", aliases: ["albaraka"] },
  { slug: "turkiyefinans", name: "Türkiye Finans", code: "TF", color: "#00965E", domain: "turkiyefinans.com.tr", group: "Katılım", aliases: ["türkiye finans katılım bankası"] },
  { slug: "vakifkatilim", name: "Vakıf Katılım", code: "VK", color: "#C9A227", domain: "vakifkatilim.com.tr", group: "Katılım" },
  { slug: "ziraatkatilim", name: "Ziraat Katılım", code: "ZK", color: "#B5121B", domain: "ziraatkatilim.com.tr", group: "Katılım" },
  { slug: "emlakkatilim", name: "Emlak Katılım", code: "EK", color: "#0055A5", domain: "emlakkatilim.com.tr", group: "Katılım" },
  { slug: "hayatfinans", name: "Hayat Finans", code: "HF", color: "#E4032E", domain: "hayatfinans.com.tr", group: "Katılım" },
  { slug: "dunyakatilim", name: "Dünya Katılım", code: "DK", color: "#1D3F8F", domain: "dunyakatilim.com.tr", group: "Katılım" },
  { slug: "tomkatilim", name: "T.O.M. Katılım", code: "TOM", color: "#2A2A72", domain: "tombank.com.tr", group: "Katılım", aliases: ["tom katılım", "tom bank"] },

  // Dijital bankalar
  { slug: "enpara", name: "Enpara", code: "EN", color: "#7B2CBF", domain: "enpara.com", group: "Dijital", aliases: ["enpara.com", "enpara bank"] },
  { slug: "colendi", name: "Colendi Bank", code: "CB", color: "#1B1F3B", domain: "colendi.com", group: "Dijital", aliases: ["colendi"] },
];

export const BANK_GROUPS: { group: BankGroup; label: string }[] = [
  { group: "Kamu", label: "Kamu bankaları" },
  { group: "Özel", label: "Özel bankalar" },
  { group: "Yabancı", label: "Yabancı sermayeli bankalar" },
  { group: "Katılım", label: "Katılım bankaları" },
  { group: "Dijital", label: "Dijital bankalar" },
];

/** Türkçe karakterleri sadeleştirip küçük harfe çevirir (arama ve eşleştirme için). */
export function normalize(s: string) {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kayıttaki banka metnini listedeki bankayla eşleştirir (eski elle yazılmış kayıtlar dahil). */
export function findBank(value: string | null | undefined): Bank | undefined {
  if (!value) return undefined;
  const v = normalize(value);
  return BANKS.find((b) => normalize(b.name) === v || b.aliases?.some((a) => normalize(a) === v));
}

export function searchBanks(query: string): Bank[] {
  const q = normalize(query);
  if (!q) return BANKS;
  return BANKS.filter((b) => [b.name, b.code, ...(b.aliases ?? [])].some((s) => normalize(s).includes(q)));
}
