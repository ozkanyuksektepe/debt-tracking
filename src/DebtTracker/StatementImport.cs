using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ExcelDataReader;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Exceptions;
using UglyToad.PdfPig.Graphics.Operations.TextShowing;
using UglyToad.PdfPig.Tokens;

namespace DebtTracker;

/// <summary>Ekstreden okunan bir değer ve bulunduğu satır (kullanıcı kontrol etsin diye).</summary>
public record Found<T>(T Value, string Line);

/// <summary>
/// Ekstre dosyasından çıkarılan özet. Veritabanına yazılmaz; arayüz önizleme olarak gösterir,
/// kullanıcı onaylayınca kart normal kart güncellemesiyle kaydedilir.
/// </summary>
public record ParsedStatement(
    string FileName,
    string Text,
    Found<decimal>? StatementBalance,
    Found<decimal>? MinimumPayment,
    Found<DateOnly>? StatementDate,
    Found<DateOnly>? DueDate,
    Found<decimal>? Limit,
    string? CardLast4,
    /// <summary>Ekstre dönemi içinde yapılan ödemeler. Dönem borcundan zaten düşülmüştür; yalnızca bilgi.</summary>
    Found<decimal>? PeriodPayments);

public class StatementException(string message, bool needsPassword = false) : Exception(message)
{
    public bool NeedsPassword { get; } = needsPassword;
}

/// <summary>
/// Banka ekstrelerini (PDF, Excel, CSV, metin) okuyup dönem borcu, asgari, tarihler ve limiti bulur.
/// Bankaya özel şablon yok: Türkçe etiketleri arar, değeri aynı satırda etiketin hemen arkasında
/// ya da tablo düzeninde alttaki satırda aynı sütunda bekler.
/// </summary>
public static class StatementImport
{
    public const long MaxFileSize = 15 * 1024 * 1024;

    public static void MapStatementImport(this RouteGroupBuilder api)
    {
        // Yalnızca okur; hiçbir kaydı değiştirmez.
        api.MapPost("/statements/parse", async (HttpRequest request) =>
        {
            if (!request.HasFormContentType) return Results.BadRequest(new { error = "Dosya gönderilmedi." });
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0) return Results.BadRequest(new { error = "Dosya seçilmedi." });
            if (file.Length > MaxFileSize) return Results.BadRequest(new { error = "Dosya çok büyük (en fazla 15 MB)." });

            try
            {
                await using var stream = file.OpenReadStream();
                var ms = new MemoryStream();
                await stream.CopyToAsync(ms);
                var password = form["password"].ToString();
                return Results.Ok(Parse(file.FileName, ms.ToArray(), string.IsNullOrEmpty(password) ? null : password));
            }
            catch (StatementException ex)
            {
                return Results.BadRequest(new { error = ex.Message, needsPassword = ex.NeedsPassword });
            }
        });
    }

    public static ParsedStatement Parse(string fileName, byte[] data, string? password = null)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var isPdf = data.Length > 4 && Encoding.ASCII.GetString(data, 0, 4) == "%PDF";
        var lines = isPdf ? ReadPdf(data, password)
            : ext is ".xlsx" or ".xls" ? ReadExcel(data)
            : ext is ".csv" or ".txt" or "" ? ReadText(data, ext == ".csv")
            : throw new StatementException("Desteklenmeyen dosya türü. PDF, Excel (xlsx/xls), CSV veya TXT yükle.");

        lines = lines.Where(l => l.Tokens.Count > 0).ToList();
        if (lines.Count == 0)
            throw new StatementException(isPdf
                ? "PDF'te okunabilir metin bulunamadı (taranmış görüntü olabilir). Bankanın internet şubesinden indirilen ekstreyi dene."
                : "Dosyada okunabilir metin bulunamadı.");

        return new ParsedStatement(
            fileName,
            string.Join('\n', lines.Select(l => l.Text)),
            FindAmount(lines, StatementLabels),
            FindAmount(lines, MinimumLabels),
            FindDate(lines, StatementDateLabels),
            FindDate(lines, DueDateLabels),
            FindAmount(lines, LimitLabels),
            FindCardLast4(lines),
            FindPeriodPayments(lines));
    }

    // ---- Etiketler (sadeleştirilmiş yazımla: küçük harf, Türkçe karakter yok) ----
    // Sıra önemli: daha belirgin olan önce. Hemen önünde "exclude" sözcüklerinden biri geçen eşleşme atlanır.

    record Label(string Text, params string[] Exclude);

    static readonly string[] PastPeriod = ["onceki", "gecen", "devreden", "devir", "asgari", "kullanilabilir", "kalan"];

    static readonly Label[] StatementLabels =
    [
        new("hesap ozeti borcu", PastPeriod), new("hesap ozeti tutari", PastPeriod), new("ekstre borcu", PastPeriod),
        new("ekstre tutari", PastPeriod), new("donem borcu", PastPeriod), new("toplam borcunuz", PastPeriod),
        new("odenmesi gereken toplam tutar", PastPeriod), new("odenmesi gereken tutar", ["asgari", "en az"]),
        new("toplam ekstre borcu", PastPeriod), new("toplam borc", PastPeriod),
    ];

    static readonly Label[] MinimumLabels =
    [
        new("asgari odeme tutari", "kalan"), new("asgari tutar/oran", "kalan"), new("odenmesi gereken asgari tutar", "kalan"),
        new("asgari odenmesi gereken", "kalan"), new("en az odenmesi gereken", "kalan"), new("en az odeme tutar", "kalan"),
        new("min. odeme tutar", "kalan"), new("min odeme tutar", "kalan"), new("minimum odeme tutar", "kalan"),
        new("asgari odeme", "kalan"), new("asgari tutar", "kalan"),
    ];

    static readonly Label[] StatementDateLabels =
    [
        new("hesap kesim tarihi", "sonraki", "gelecek"), new("hesap ozeti tarihi", "sonraki", "gelecek"),
        new("ekstre kesim tarihi", "sonraki", "gelecek"), new("ekstre tarihi", "sonraki", "gelecek"),
        new("kesim tarihi", "sonraki", "gelecek"), new("hesap kesim", "sonraki", "gelecek"),
    ];

    static readonly Label[] DueDateLabels =
    [
        new("son odeme tarihi", "sonraki", "gelecek", "onceki"), new("son odeme gunu", "sonraki", "gelecek", "onceki"),
        new("son odeme", "sonraki", "gelecek", "onceki"),
    ];

    static readonly Label[] LimitLabels =
    [
        new("kart limiti", "kullanilabilir", "nakit", "kalan"), new("kredi karti limiti", "kullanilabilir", "nakit", "kalan"),
        new("toplam limit", "kullanilabilir", "nakit", "kalan"), new("kart limitiniz", "kullanilabilir", "nakit", "kalan"),
        new("limitiniz", "kullanilabilir", "nakit", "kalan"), new("limit", "kullanilabilir", "nakit", "kalan", "harcama", "taksit"),
    ];

    // ---- Değer kalıpları ----

    // Türkçe (12.345,67) ve bazı bankaların kullandığı İngilizce (12,345.67) biçim; ondalık her zaman 2 hane.
    static readonly Regex AmountRx = new(@"(?<![\d.,])-?(?:\d{1,3}(?:\.\d{3})+,\d{2}|\d{1,3}(?:,\d{3})+\.\d{2}|\d+[.,]\d{2})(?!\d|[.,]\d)", RegexOptions.Compiled);
    static readonly Regex NumericDateRx = new(@"(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?!\d)", RegexOptions.Compiled);
    static readonly string[] MonthNames = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];
    static readonly Regex NamedDateRx = new(@"(?<!\d)(\d{1,2})\s+(" + string.Join('|', MonthNames) + @")\s+(\d{4})(?!\d)", RegexOptions.Compiled);
    // Bazı bankalar tutarın boş hanelerini yıldızla doldurur: "*.572,20".
    static readonly Regex FillRx = new(@"(?<![\d*])\*+[.,]?(?=\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d))", RegexOptions.Compiled);
    static readonly Regex CardRx = new(@"(?<!\d)\d{4}[\s-]?[\d*x•]{2,4}[\s-]?[*x•]{4}[\s-]?(\d{4})(?!\d)", RegexOptions.Compiled);
    // Etiketle değer arasında yalnızca bunlar olabilir (iki nokta, para birimi, parantez...).
    static readonly Regex SeparatorRx = new(@"^[^\p{L}\d\uFFFD]*(?:(?:tl|try)[^\p{L}\d\uFFFD]*)?$", RegexOptions.Compiled);

    static Found<decimal>? FindAmount(List<Line> lines, Label[] labels) =>
        Find<decimal>(lines, labels, AmountRx, m => ParseAmount(m.Value));

    /// <summary>Sondan üçüncü karakter ondalık ayırıcıdır; diğer ayırıcı binlik sayılıp atılır.</summary>
    static decimal? ParseAmount(string s)
    {
        var dec = s[^3];
        var plain = s.Replace(dec == ',' ? "." : ",", "").Replace(',', '.');
        return decimal.TryParse(plain, NumberStyles.Number, CultureInfo.InvariantCulture, out var v) ? Math.Abs(v) : null;
    }

    static Found<DateOnly>? FindDate(List<Line> lines, Label[] labels) =>
        Find(lines, labels, NumericDateRx, ParseNumericDate) ?? Find(lines, labels, NamedDateRx, ParseNamedDate);

    static Found<T>? Find<T>(List<Line> lines, Label[] labels, Regex valueRx, Func<Match, T?> parse) where T : struct
    {
        foreach (var label in labels)
        {
            for (var i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                foreach (var start in LabelMatches(line.Folded, label))
                {
                    var end = start + label.Text.Length;
                    // Etiket sözcüğünün devamını atla ("borcu" → "borcunuz", "tarihi" → "tarihidir" vb.).
                    while (end < line.Folded.Length && IsWordChar(line.Folded[end])) end++;

                    // 1) Aynı satırda, etiketin hemen arkasında.
                    var m = valueRx.Match(line.Folded, end);
                    if (m.Success && SeparatorRx.IsMatch(line.Folded[end..m.Index]) && parse(m) is T v1)
                        return new Found<T>(v1, line.Text);

                    // 2) Tablo düzeni: alttaki satırlarda, etiketle aynı sütunda.
                    var (lx0, lx1) = line.Span(start, end);
                    for (var j = i + 1; j < Math.Min(lines.Count, i + 3); j++)
                    {
                        var below = lines[j];
                        var best = valueRx.Matches(below.Folded)
                            .Select(x => (x, span: below.Span(x.Index, x.Index + x.Length)))
                            .Where(t => Overlaps(t.span, (lx0, lx1)))
                            .OrderBy(t => Math.Abs((t.span.Item1 + t.span.Item2) / 2 - (lx0 + lx1) / 2))
                            .Select(t => (t.x, v: parse(t.x)))
                            .FirstOrDefault(t => t.v is not null);
                        // Satırın tamamı yerine yalnızca sütun başlığı ve altındaki değer gösterilir.
                        if (best.v is T v2) return new Found<T>(v2, $"{line.Text[start..end]}: {below.Text.Substring(best.x.Index, best.x.Length)}");
                    }
                }
            }
        }
        return null;
    }

    static IEnumerable<int> LabelMatches(string folded, Label label)
    {
        for (var at = WildIndexOf(folded, label.Text, 0); at >= 0; at = WildIndexOf(folded, label.Text, at + 1))
        {
            if (at > 0 && IsWordChar(folded[at - 1])) continue; // sözcük ortası
            var before = string.Join(' ', folded[..at].Split(' ', StringSplitOptions.RemoveEmptyEntries).TakeLast(2));
            if (label.Exclude.Any(e => WildIndexOf(before, e, 0) >= 0)) continue;
            yield return at;
        }
    }

    /// <summary>Kodu çözülemeyen harf (bkz. <see cref="AfpWords"/>); eşleştirmede herhangi bir harf yerine geçer.</summary>
    const char Unknown = '\uFFFD';

    static bool IsWordChar(char c) => char.IsLetter(c) || c == Unknown;

    static int WildIndexOf(string hay, string needle, int start)
    {
        for (var i = start; i <= hay.Length - needle.Length; i++)
        {
            var k = 0;
            while (k < needle.Length && (hay[i + k] == needle[k] || (hay[i + k] == Unknown && char.IsLetter(needle[k])))) k++;
            if (k == needle.Length) return i;
        }
        return -1;
    }

    // Sütunlar tam hizalı olmayabilir; değer etiketin genişliğinin biraz dışına taşabilir.
    static bool Overlaps((double, double) a, (double, double) b)
    {
        var pad = Math.Max(4, (b.Item2 - b.Item1) * 0.25);
        return a.Item1 <= b.Item2 + pad && a.Item2 >= b.Item1 - pad;
    }

    static DateOnly? ParseNumericDate(Match m)
    {
        var year = int.Parse(m.Groups[3].Value);
        if (year < 100) year += 2000;
        return MakeDate(year, int.Parse(m.Groups[2].Value), int.Parse(m.Groups[1].Value));
    }

    static DateOnly? ParseNamedDate(Match m) =>
        MakeDate(int.Parse(m.Groups[3].Value), Array.IndexOf(MonthNames, m.Groups[2].Value) + 1, int.Parse(m.Groups[1].Value));

    static DateOnly? MakeDate(int y, int mo, int d) =>
        y is >= 2000 and <= 2100 && mo is >= 1 and <= 12 && d >= 1 && d <= DateTime.DaysInMonth(y, mo) ? new DateOnly(y, mo, d) : null;

    static readonly Label[] PeriodPaymentLabels = [new("donem ici odemeler"), new("donem ici odemeleriniz")];

    // Hareket listesinde ödeme satırları. "Ödeme" tek başına aranmaz: "TAMİ-ÖDEME /STARBUCKS" gibi harcamalar da var.
    static readonly string[] PaymentKeywords =
    [
        "odemeniz icin tesekkur", "odeme-internet", "odeme - internet", "odeme-mobil", "odeme-atm", "odeme-sube",
        "hesaptan aktarim", "otomatik tahsilat", "otomatik odeme",
    ];

    /// <summary>Önce özet etiketi ("Dönem İçi Ödemeler"), yoksa hareketlerdeki ödeme satırlarının toplamı.</summary>
    static Found<decimal>? FindPeriodPayments(List<Line> lines)
    {
        if (FindAmount(lines, PeriodPaymentLabels) is { } total) return total;
        var found = new List<(decimal Amount, string Line)>();
        foreach (var line in lines)
        {
            var at = PaymentKeywords.Select(k => WildIndexOf(line.Folded, k, 0)).Where(i => i >= 0).DefaultIfEmpty(-1).Min();
            if (at < 0) continue;
            var m = AmountRx.Match(line.Folded, at);
            if (m.Success && ParseAmount(m.Value) is decimal v && v > 0) found.Add((v, line.Text));
        }
        return found.Count == 0 ? null
            : new Found<decimal>(found.Sum(f => f.Amount), string.Join("  ·  ", found.Select(f => f.Line)));
    }

    static string? FindCardLast4(List<Line> lines) =>
        lines.Select(l => CardRx.Match(l.Folded)).FirstOrDefault(m => m.Success)?.Groups[1].Value;

    // ---- Dosya okuma: her biçim konumlu sözcük satırlarına çevrilir ----

    record Token(string Text, double X0, double X1);

    class Line
    {
        public List<Token> Tokens { get; }
        public string Text { get; }
        /// <summary>Eşleştirme için sadeleştirilmiş metin; <see cref="Text"/> ile aynı uzunlukta (indeksler ortak).</summary>
        public string Folded { get; }
        readonly int[] tokenAt;

        public Line(List<Token> tokens)
        {
            Tokens = tokens;
            Text = string.Join(' ', tokens.Select(t => t.Text));
            Folded = FillRx.Replace(Fold(Text), m => new string(' ', m.Length));
            tokenAt = new int[Text.Length];
            var pos = 0;
            for (var k = 0; k < tokens.Count; k++)
            {
                for (var c = 0; c < tokens[k].Text.Length; c++) tokenAt[pos + c] = k;
                if (pos + tokens[k].Text.Length < Text.Length) tokenAt[pos + tokens[k].Text.Length] = k;
                pos += tokens[k].Text.Length + 1;
            }
        }

        /// <summary>Metindeki [start, end) aralığının yatay konumu.</summary>
        public (double, double) Span(int start, int end)
        {
            if (Text.Length == 0) return (0, 0);
            var a = Tokens[tokenAt[Math.Clamp(start, 0, Text.Length - 1)]];
            var b = Tokens[tokenAt[Math.Clamp(end - 1, 0, Text.Length - 1)]];
            return (a.X0, b.X1);
        }
    }

    /// <summary>Küçük harf + Türkçe karakter sadeleştirme; karakter sayısını korur.</summary>
    static string Fold(string s)
    {
        var chars = s.ToCharArray();
        for (var i = 0; i < chars.Length; i++)
        {
            chars[i] = chars[i] switch
            {
                'İ' or 'I' or 'ı' => 'i',
                'Ş' or 'ş' => 's',
                'Ğ' or 'ğ' => 'g',
                'Ü' or 'ü' => 'u',
                'Ö' or 'ö' => 'o',
                'Ç' or 'ç' => 'c',
                ' ' or '\t' => ' ',
                var c => char.ToLowerInvariant(c),
            };
        }
        return new string(chars);
    }

    static List<Line> ReadPdf(byte[] data, string? password)
    {
        PdfDocument doc;
        try
        {
            doc = PdfDocument.Open(data, password is null ? null : new ParsingOptions { Password = password });
        }
        catch (PdfDocumentEncryptedException)
        {
            throw new StatementException(password is null
                ? "Bu PDF şifreli. Bankanın e-ekstre şifresini gir."
                : "Şifre hatalı. Bankanın e-ekstre şifresini kontrol et.", needsPassword: true);
        }
        catch (Exception)
        {
            throw new StatementException("PDF okunamadı. Dosya bozuk olabilir.");
        }

        using (doc)
        {
            var lines = new List<Line>();
            foreach (var page in doc.GetPages())
            {
                var words = AfpWords(doc, page) ?? page.GetWords()
                    .Select(w => new PdfWord(w.Text, w.BoundingBox.Left, w.BoundingBox.Right, w.BoundingBox.Bottom, w.BoundingBox.Height))
                    .ToList();
                lines.AddRange(GroupRows(words.Where(w => !string.IsNullOrWhiteSpace(w.Text)))
                    .Select(r => new Line(r.Select(w => new Token(w.Text, w.X0, w.X1)).ToList())));
            }
            return lines;
        }
    }

    record PdfWord(string Text, double X0, double X1, double Y, double Height);

    /// <summary>Taban çizgisi yakın olanları aynı satıra toplar (yukarıdan aşağıya, soldan sağa).</summary>
    static List<List<PdfWord>> GroupRows(IEnumerable<PdfWord> words)
    {
        var rows = new List<List<PdfWord>>();
        foreach (var w in words.OrderByDescending(w => w.Y))
        {
            var row = rows.LastOrDefault();
            if (row is not null && Math.Abs(row[0].Y - w.Y) <= Math.Max(2, w.Height * 0.5)) row.Add(w);
            else rows.Add([w]);
        }
        return rows.Select(r => r.OrderBy(w => w.X0).ToList()).ToList();
    }

    static readonly Regex AfpGlyphName = new("^C[0-9A-Fa-f]{1,2}$", RegexOptions.Compiled);
    static readonly Regex EbcdicPlausible = new(@"^[\p{L}\d .,:;/\-()*+%'&=<>!?$@#""]$", RegexOptions.Compiled);

    /// <summary>
    /// Ana bilgisayar (IBM AFP) çıktısından dönüştürülen PDF'ler (ör. Akbank) harfleri EBCDIC kodlu, Unicode karşılığı
    /// olmayan Type3 yazı tipleriyle yazar; PDF okuyucular anlamsız karakterler çıkarır. Bu yazı tiplerinde glif adları
    /// "C" + onaltılık koddur. Ham baytlar EBCDIC (CP037) ile çözülür. Türkçe harfler (ı, ş, İ, ğ...) ayrı bir yazı tipinde,
    /// belgeye göre değişen kodlarla durur; bunlar <see cref="Unknown"/> olur ve eşleştirmede her harfe uyar. Uygun değilse null döner.
    /// </summary>
    static List<PdfWord>? AfpWords(PdfDocument doc, Page page)
    {
        try
        {
            DictionaryToken? Dict(IToken? t) => t is IndirectReferenceToken r ? doc.Structure.GetObject(r.Data).Data as DictionaryToken : t as DictionaryToken;
            var fonts = Dict(Dict(page.Dictionary.Data.GetValueOrDefault("Resources"))?.Data.GetValueOrDefault("Font"));
            if (fonts is null) return null;

            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
            var ebcdic = Encoding.GetEncoding(37);

            // Yazı tipi adı → true: EBCDIC metin, false: kodları belgeye özel (Türkçe harfler gibi), çözülemez.
            var afpFonts = new Dictionary<string, bool>();
            foreach (var (key, value) in fonts.Data)
            {
                var font = Dict(value);
                if (font is null || font.Data.ContainsKey("ToUnicode") || (font.Data.GetValueOrDefault("Subtype") as NameToken)?.Data != "Type3") continue;
                if ((Dict(font.Data.GetValueOrDefault("Encoding"))?.Data.GetValueOrDefault("Differences")) is not ArrayToken diffs) continue;
                var codes = new List<int>();
                var code = 0;
                foreach (var t in diffs.Data)
                {
                    if (t is NumericToken n) code = n.Int;
                    else if (t is NameToken g && AfpGlyphName.IsMatch(g.Data)) codes.Add(code++);
                    else { codes.Clear(); break; }
                }
                if (codes.Count == 0) continue;
                var plausible = codes.Count(c => EbcdicPlausible.IsMatch(ebcdic.GetString([(byte)c])));
                var isText = plausible >= codes.Count * 0.8;
                afpFonts[key] = isText;
                if ((font.Data.GetValueOrDefault("Name") as NameToken)?.Data is { } name) afpFonts[name] = isText;
            }
            if (afpFonts.Count == 0) return null;

            // Her glif için gösterilen ham bayt; harflerle aynı sırada (tek baytlık yazı tipleri).
            var bytes = new List<byte>();
            foreach (var op in page.Operations)
            {
                switch (op)
                {
                    case ShowText t: bytes.AddRange(t.Bytes.ToArray()); break;
                    case MoveToNextLineShowText t: bytes.AddRange(t.Bytes.ToArray()); break;
                    case MoveToNextLineShowTextWithSpacing t: bytes.AddRange(t.Bytes.ToArray()); break;
                    case ShowTextsWithPositioning tj:
                        foreach (var item in tj.Array)
                            if (item is HexToken h) bytes.AddRange(h.Bytes);
                            else if (item is StringToken str) bytes.AddRange(str.GetBytes());
                        break;
                }
            }
            var letters = page.Letters;
            if (bytes.Count != letters.Count) return null;

            var chars = letters.Select((l, i) => (
                Letter: l,
                Text: !afpFonts.TryGetValue(l.FontName ?? "", out var isText) ? l.Value
                    : isText ? ebcdic.GetString([bytes[i]])
                    : bytes[i] == 0x40 ? " " : Unknown.ToString())).ToList();

            // Harflerden sözcük kur: boşlukta ya da harf aralığı belirgin açıldığında böl.
            var words = new List<PdfWord>();
            var rows = GroupRows(chars.Select((c, i) => new PdfWord(i.ToString(), c.Letter.StartBaseLine.X, c.Letter.EndBaseLine.X,
                c.Letter.StartBaseLine.Y, Math.Max(c.Letter.GlyphRectangle.Height, c.Letter.FontSize))));
            foreach (var row in rows)
            {
                var sb = new StringBuilder();
                double x0 = 0, x1 = 0, y = 0, h = 0;
                void Flush()
                {
                    if (sb.Length > 0) words.Add(new PdfWord(sb.ToString(), x0, x1, y, h));
                    sb.Clear();
                }
                var avgWidth = row.Average(w => Math.Max(0.1, w.X1 - w.X0));
                foreach (var w in row)
                {
                    var text = chars[int.Parse(w.Text)].Text;
                    if (sb.Length > 0 && w.X0 - x1 > avgWidth * 0.6) Flush();
                    if (string.IsNullOrWhiteSpace(text) || char.IsControl(text[0])) { Flush(); continue; }
                    if (sb.Length == 0) (x0, y, h) = (w.X0, w.Y, w.Height);
                    sb.Append(text);
                    x1 = w.X1;
                }
                Flush();
            }
            return words;
        }
        catch (Exception)
        {
            return null; // beklenmeyen yapı: normal okumaya dön
        }
    }

    static List<Line> ReadExcel(byte[] data)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance); // eski .xls için
        var tr = CultureInfo.GetCultureInfo("tr-TR");
        var lines = new List<Line>();
        try
        {
            using var reader = ExcelReaderFactory.CreateReader(new MemoryStream(data));
            do
            {
                while (reader.Read())
                {
                    var tokens = new List<Token>();
                    for (var c = 0; c < reader.FieldCount; c++)
                    {
                        var text = reader.GetValue(c) switch
                        {
                            null => null,
                            DateTime d => d.ToString("dd.MM.yyyy", tr),
                            double n => n.ToString("#,##0.00", tr),
                            var v => v.ToString()?.Trim(),
                        };
                        // Sütun numarası yatay konum yerine geçer.
                        if (!string.IsNullOrEmpty(text)) tokens.Add(new Token(text, c, c + 1));
                    }
                    lines.Add(new Line(tokens));
                }
            } while (reader.NextResult());
        }
        catch (Exception ex) when (ex is not StatementException)
        {
            throw new StatementException("Excel dosyası okunamadı.");
        }
        return lines;
    }

    static List<Line> ReadText(byte[] data, bool csv)
    {
        string text;
        try { text = new UTF8Encoding(false, true).GetString(data); }
        catch (DecoderFallbackException)
        {
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
            text = Encoding.GetEncoding(1254).GetString(data); // Türkçe Windows
        }
        text = text.TrimStart('﻿');
        var sep = csv ? (text.Count(ch => ch == ';') >= text.Count(ch => ch == ',') / 2 ? ';' : ',') : '\0';

        return text.Split('\n').Select(raw =>
        {
            var row = raw.TrimEnd('\r');
            if (csv)
                return new Line(row.Split(sep).Select((cell, c) => new Token(cell.Trim().Trim('"').Trim(), c, c + 1))
                    .Where(t => t.Text.Length > 0).ToList());
            // Düz metin: karakter konumu yatay konum yerine geçer.
            return new Line(Regex.Matches(row, @"\S+").Select(m => new Token(m.Value, m.Index, m.Index + m.Length)).ToList());
        }).ToList();
    }
}
