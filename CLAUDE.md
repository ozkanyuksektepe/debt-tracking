# Borç Takibi

Tamamen yerelde (macOS) çalışan kişisel borç ve ödeme takip paneli. Tek kullanıcı, oturum açma yok,
banka entegrasyonu yok; tüm veriyi kullanıcı elle girer. Uygulama internet olmadan çalışmalıdır:
CDN, Google Fonts veya harici API ekleme.

Arayüz metinleri **Türkçe**; kod, değişken ve dosya adları İngilizce. Para birimi TL, biçim `tr-TR`.

## Yapı

```
src/DebtTracker/     .NET 10 Minimal API + EF Core SQLite  → http://localhost:5080
  Models.cs          Varlıklar: Loan, CreditCard, CardInstallment, OtherDebt, Account, Payment, Snapshot
  Finance.cs         Tüm hesaplamalar (kalan anapara, kart son ödeme tarihi, takvim kalemleri)
  Endpoints.cs       /api/* uçları, ödeme kaydı/geri alma, günlük snapshot
  data/borclar.db    Kullanıcının GERÇEK verisi (gitignore'da)
  wwwroot/           Boş tutulur; silinirse `dotnet watch` çöker
web/                 Next.js 16 (App Router, TS, Tailwind 4)  → http://localhost:3000
  src/app/           Sayfalar: / krediler kartlar diger hesaplar takvim raporlar odemeler
  src/lib/api.ts     Sunucu tarafı fetch (API_URL, varsayılan localhost:5080)
  src/lib/actions.ts Server Action'lar (kaydet/sil/ödeme/geri al) + refresh()
  src/lib/forms.ts   Form alanı tanımları (FORMS[resource])
  src/lib/banks.ts   Türk bankaları listesi (ad, kısaltma, renk, alias)
  src/lib/types.ts   API yanıt tipleri (C# record'larıyla elle senkron)
  src/components/    ui.tsx (Card, Kpi, Badge, Stat...), charts.tsx (SVG), form-dialog.tsx ...
  public/banks/      Banka logoları: <slug>.png (bazıları yok → renkli kısaltma gösterilir)
start.sh             Production: API + `next build`/`next start`
start-dev.sh         Geliştirme: `dotnet watch` + `next dev` (anlık yenileme)
```

## Çalıştırma ve doğrulama

- Kullanıcı uygulamayı genelde `./start-dev.sh` ile açık tutar (3000/5080 portları dolu olabilir).
- **Kullanıcının verisine ve açık uygulamasına dokunma.** Test için ayrı port ve geçici veritabanı kullan:
  ```bash
  cd src/DebtTracker && dotnet run --no-launch-profile --urls http://localhost:5099 --DataDir <scratchpad>/testdata
  # web'i scratchpad'e klonla (cp -cR, node_modules dahil; symlink Turbopack'te çalışmaz), .next'i sil:
  API_URL=http://localhost:5099 npx next dev -p 3099
  ```
  Test verisini `curl -X POST localhost:5099/api/...` ile ekle; iş bitince sunucuları kapat, klasörleri sil.
- Kontroller: `cd web && npx tsc --noEmit && npm run lint`, `npm run build`; backend için `dotnet build`.
- Route tipleri (`PageProps<"/takvim">`) için gerekirse `npx next typegen`.

## Next.js 16 notları (eğitim verinden farklı!)

`web/AGENTS.md` gereği kod yazmadan önce `web/node_modules/next/dist/docs/` altındaki ilgili rehberi oku.
Bu projede karşılaşılanlar:
- `cacheComponents: true` açık: istek zamanı veri okuyan async bileşenler `<Suspense>` içinde olmalı.
  Sayfalarda kalıp: senkron sayfa + `<Suspense fallback={<PageSkeleton/>}>` içinde async içerik.
- Mutasyonlar Server Action → .NET API → `refresh()` (`next/cache`). Hata `throw` edilmez, `{ error }` döndürülür.
- `searchParams` bir Promise'tir; Suspense içindeki bileşende `await` edilir.
- `error.tsx` prop'ları `{ error, retry }` (reset değil). Bileşene `Error` adı verme (global'i gölgeler).
- `"use client"` modülünden sunucuya düz değer (string vb.) export etme; ayrı modüle koy (bkz. `lib/theme-script.ts`).
- Production'da `public/` yalnızca derleme anındaki dosyaları sunar; `start.sh` src/public değişince yeniden derler.

## Veritabanı — dikkat

Şema `Database.EnsureCreated()` ile oluşturuluyor, **migration yok**. Mevcut `borclar.db` yeni kolon/tablo
almaz. Model değişikliği gerekiyorsa önce EF Core migration'larına geçişi planla ve kullanıcıya sor;
aksi halde kullanıcının mevcut verisi uygulamayı bozar. Mümkünse şemayı değiştirmeden çöz
(ör. banka seçici, banka adını mevcut `Bank` string alanında tutuyor).

Decimal'ler SQLite'ta TEXT saklanır; sıralama/toplama SQL'de değil bellekte (`ToListAsync()` sonrası) yapılır.

## Alan kuralları (Finance.cs)

- **Kalan toplam ödeme ≠ kalan anapara.** Kalan anapara = kalan taksitlerin bugünkü değeri; oran, anapara +
  taksit + vadeden bisection ile bulunan fiili aylık maliyet (KKDF/BSMV dahil). `InterestRate` yalnızca bilgi.
- Kredi taksiti k'nın tarihi = `FirstInstallmentDate + (k-1) ay`; `PaidInstallments`'tan sonrakiler ödenmemiş.
- **Kart:** dönem borcu ≠ toplam borç. Son ödeme = son hesap kesiminden sonraki ilk `DueDay`.
  Toplam kart borcu = `CurrentBalance` + henüz yansımamış taksitler (bir sonraki son ödeme ayı ve sonrası).
  Ay günleri `DayIn` ile kırpılır (31 → 30/28).
- **Düzenli ödemeler** (`Kind = "Düzenli"`) toplam borca girmez (`CountsAsDebt = false`), takvim ve aylık yükte görünür.
- **Ödeme kaydı** borcu ve seçilen hesabın bakiyesini değiştirir; geri alabilmek için delta alanları
  (`StatementDelta`, `CurrentDelta`, `MinimumDelta`, `RemainingDelta`, `InstallmentCount`) saklanır.
  Ödemeyi silmek etkisini geri çevirir. Yeni etki eklersen deltasını da sakla.
- Geçmiş aylardan kalan ödenmemiş kalemler takvimde **bu aya** "gecikmiş" olarak taşınır (`GroupByMonth`).
- `/overview` ve `/reports` her çağrıldığında günün `Snapshot`'ını günceller (zaman içindeki değişim grafiği).

## Arayüz kuralları

- Tasarım token'ları `web/src/app/globals.css` içinde CSS değişkeni (`--bg`, `--surface`, `--accent`, `--c1..c4`...)
  ve Tailwind'e `@theme inline` ile bağlı (`bg-surface`, `text-muted`, `border-line`...). Sabit renk yerine bunları kullan.
- Tema: `<html data-theme="light|dark">`, `lib/theme-script.ts` head'de boyamadan önce ayarlar;
  tercih `localStorage.theme` (yoksa sistem). Koyu token'lar `:root[data-theme="dark"]` altında.
- Ortak bileşenleri kullan: `PageHeader`, `Card`, `CardHeader`, `Kpi`/`KpiGrid`, `Stat`, `Badge`, `Empty`,
  `ListRow`, `DateTile`, `DueBadge`, `Progress`. İkonlar `lucide-react`.
- Grafikler `components/charts.tsx` içinde sunucuda üretilen SVG (kütüphane yok). Her grafiğe benzersiz `id` ver.
- Sayı girişi Türkçe biçimde (`12.500,75`): `parseNum` (lib/format.ts). Para gösterimi `money()`.
- Yeni kayıt türü/alan: `lib/forms.ts`'e alan, `lib/types.ts`'e tip, `actions.ts`'teki `RESOURCES` listesine kaynak ekle.
- Banka eklemek: `lib/banks.ts` + isteğe bağlı `public/banks/<slug>.png`. Eski elle yazılmış adlar `aliases` ile eşleşir.
