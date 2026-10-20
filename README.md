# Borç Takibi

Tamamen kişisel kullanım için geliştirilen, internet olmadan çalışan kişisel borç ve ödeme takip uygulaması.

- **Backend:** ASP.NET Core (.NET 10) Minimal API — `src/DebtTracker` (http://localhost:5080)
- **Veritabanı:** SQLite — `src/DebtTracker/data/borclar.db`
- **Arayüz:** Next.js 16 (App Router, TypeScript, Tailwind CSS) — `web` (http://localhost:3000)

Next.js sayfaları Server Component olarak veriyi .NET API'den çeker; kayıt, ödeme ve silme işlemleri
Server Action'lar üzerinden API'ye gider. Grafikler sunucuda SVG olarak üretilir, internet gerekmez.

## Çalıştırma

```bash
./start.sh
```

İlk çalıştırmada arayüz derlenir, ardından tarayıcıda http://localhost:3000 açılır.
Uygulama yalnızca bu bilgisayardan erişilebilir.

Geliştirme yaparken (değişiklikler anında görünür):

```bash
./start-dev.sh
```

API farklı bir adresteyse `web` için `API_URL` ortam değişkenini ayarla.

## Özellikler

| Bölüm | İçerik |
|---|---|
| Özet | Toplam kalan borç, bu ay kalan ödemeler, mevcut para, ödemeler sonrası fark, gecikmiş ve yaklaşan ödemeler |
| Krediler | Kalan taksit, kalan toplam ödeme, tahmini kalan anapara (erken kapama), kalan faiz + vergi, fiili aylık maliyet |
| Kredi kartları | Limit, dönem borcu, asgari, güncel borç, dönem içi harcama, son ödeme tarihi, taksitli alışverişler |
| Diğer borçlar | Kişisel borçlar (taksitli veya vadeli) ve düzenli ödemeler (kira, fatura, abonelik) |
| Hesaplar | Banka hesapları, nakit, birikim bakiyeleri |
| Ödeme takvimi | 6/12/24 aylık ödeme planı |
| Raporlar | Borç dağılımı, aylık ödeme yükü, borç azalma projeksiyonu, zaman içindeki değişim |
| Ödeme geçmişi | Tüm ödemeler; "Geri al" borca ve hesaba etkisini geri çevirir |

## Hesaplama notları

- **Kalan toplam ödeme ≠ kalan anapara.** Kalan anapara, çekilen tutar + taksit + vadeden bulunan fiili
  maliyet oranıyla (KKDF/BSMV dahil) kalan taksitlerin bugünkü değeri olarak hesaplanır.
- **Dönem borcu ≠ toplam kart borcu.** Toplam kart borcu = güncel borç + henüz yansımamış taksitler.
- Düzenli ödemeler toplam borca eklenmez; aylık yükte ve takvimde görünür.
- Uygulama her açıldığında günlük bir anlık görüntü kaydeder; "Zaman içindeki değişim" grafiği buradan beslenir.

## Yedekleme

Tüm veri tek dosyada: `src/DebtTracker/data/borclar.db`. Uygulama kapalıyken bu dosyayı kopyalaman yeterli.
