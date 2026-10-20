using Microsoft.EntityFrameworkCore;

namespace DebtTracker;

/// <summary>
/// EnsureCreated mevcut veritabanına yeni kolon eklemez. Eski veritabanlarını yerinde yükseltir;
/// değişiklikten önce aynı klasöre yedek alır.
/// </summary>
public static class SchemaUpgrade
{
    public static void Run(AppDb db, string dataDir, ILogger logger)
    {
        var cardColumns = Columns(db, "Cards");
        var loanColumns = Columns(db, "Loans");
        var needCards = !cardColumns.Contains("PaidAmount") || !cardColumns.Contains("UnbilledAmount");
        var needLoanOpened = !loanColumns.Contains("OpenedDate");
        if (!needCards && !needLoanOpened) return;

        var backup = Path.Combine(dataDir, $"borclar-yedek-{DateTime.Now:yyyyMMdd-HHmmss}.db");
        db.Database.ExecuteSqlRaw("VACUUM INTO {0}", backup);
        logger.LogInformation("Veritabanı yükseltiliyor; yedek alındı: {Backup}", backup);

        using var tx = db.Database.BeginTransaction();

        // Kolonlar, EF ile kayıt okunmadan önce eklenmeli (aksi halde sorgu eksik kolona takılır).
        if (needLoanOpened)
            db.Database.ExecuteSqlRaw("ALTER TABLE Loans ADD COLUMN OpenedDate TEXT NULL");
        if (!cardColumns.Contains("PaidAmount"))
            db.Database.ExecuteSqlRaw("ALTER TABLE Cards ADD COLUMN PaidAmount TEXT NOT NULL DEFAULT '0.0'");
        if (!cardColumns.Contains("UnbilledAmount"))
            db.Database.ExecuteSqlRaw("ALTER TABLE Cards ADD COLUMN UnbilledAmount TEXT NOT NULL DEFAULT '0.0'");

        if (needCards)
        {
            // Eski modelde güncel borç elle giriliyordu: aradaki fark dönem içi harcama sayılır, böylece toplam aynı kalır.
            foreach (var card in db.Cards.ToList())
            {
                card.UnbilledAmount = Math.Max(0, card.CurrentBalance - card.StatementBalance);
                card.RecalculateBalance();
            }
            db.SaveChanges();
        }
        tx.Commit();
    }

    static HashSet<string> Columns(AppDb db, string table)
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info({table})";
        using var reader = cmd.ExecuteReader();
        var names = new HashSet<string>();
        while (reader.Read()) names.Add(reader.GetString(1));
        return names;
    }
}
