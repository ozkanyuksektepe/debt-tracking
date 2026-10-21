using Microsoft.EntityFrameworkCore;

namespace DebtTracker;

public record PaymentRequest(
    string TargetType, int TargetId, decimal? Amount, DateOnly? Date,
    int? AccountId, int? InstallmentCount, string? Note);

public static class Endpoints
{
    public static void MapApi(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        // ---- Özet ve hesaplanmış görünümler ----
        api.MapGet("/overview", async (AppDb db) =>
        {
            var today = Finance.Today;
            var o = await BuildOverview(db, today);
            await SaveSnapshot(db, o, today);
            var thisMonthDue = o.Items
                .Where(i => Finance.MonthIndex(i.Date) <= Finance.MonthIndex(today))
                .Sum(i => i.Amount);
            var monthStart = Finance.MonthStart(today);
            var paidThisMonth = (await db.Payments.Where(p => p.Date >= monthStart).ToListAsync()).Sum(p => p.Amount);

            return new
            {
                Today = today,
                o.TotalDebt,
                o.TotalDebtPrincipalBased,
                o.LoansRemainingTotal,
                o.LoansRemainingPrincipal,
                o.CardsTotal,
                o.CardsStatementTotal,
                o.OthersTotal,
                o.TotalAssets,
                ThisMonthDue = thisMonthDue,
                PaidThisMonth = paidThisMonth,
                AfterPayments = o.TotalAssets - thisMonthDue,
                MonthlyRecurring = o.Others.Where(x => x.Debt.Kind == OtherKinds.Recurring).Sum(x => x.Debt.MonthlyAmount),
                Overdue = o.Items.Where(i => i.Overdue).ToList(),
                Upcoming = o.Items.Where(i => !i.Overdue && i.Date <= today.AddDays(30)).ToList(),
                o.Loans,
                o.Cards,
                o.Others,
                o.Accounts,
            };
        });

        api.MapGet("/calendar", async (AppDb db, int? months) =>
        {
            var today = Finance.Today;
            var o = await BuildOverview(db, today, Math.Clamp(months ?? 12, 1, 120));
            return Finance.GroupByMonth(o.Items, today, Math.Clamp(months ?? 12, 1, 120));
        });

        api.MapGet("/reports", async (AppDb db) =>
        {
            var today = Finance.Today;
            var o = await BuildOverview(db, today, 12);
            await SaveSnapshot(db, o, today);
            var snapshots = (await db.Snapshots.ToListAsync()).OrderBy(s => s.Date).ToList();

            // Yeni borç eklenmezse borcun ay ay nasıl azalacağı.
            var remaining = o.TotalDebt;
            var current = Finance.MonthIndex(today);
            var projection = new List<object>();
            for (var m = 0; m < 36 && remaining > 0; m++)
            {
                var paid = o.Items.Where(i => i.CountsAsDebt && Math.Max(Finance.MonthIndex(i.Date), current) == current + m).Sum(i => i.Amount);
                remaining = Math.Max(0, remaining - paid);
                var key = current + m;
                projection.Add(new { Year = key / 12, Month = key % 12 + 1, Paid = paid, Remaining = remaining });
            }

            return new
            {
                o.TotalDebt,
                o.TotalAssets,
                NetWorth = o.TotalAssets - o.TotalDebt,
                Breakdown = new[]
                {
                    new { Label = "Krediler", Amount = o.LoansRemainingTotal },
                    new { Label = "Kredi kartları", Amount = o.CardsTotal },
                    new { Label = "Diğer borçlar", Amount = o.OthersTotal },
                },
                LoanInterestRemaining = o.Loans.Sum(l => l.RemainingInterest),
                Monthly = Finance.GroupByMonth(o.Items, today, 12),
                Projection = projection,
                Snapshots = snapshots,
            };
        });

        // ---- CRUD ----
        MapCrud<Loan>(api, "/loans", db => db.Loans, l =>
        {
            if (l.MonthlyInstallment <= 0 && l.Principal > 0)
                l.MonthlyInstallment = Finance.Annuity(l.Principal, l.InterestRate, l.TermMonths);
            l.PaidInstallments = Math.Clamp(l.PaidInstallments, 0, Math.Max(l.TermMonths, 0));
            return string.IsNullOrWhiteSpace(l.Name) ? "Kredi adı gerekli." :
                   l.TermMonths <= 0 ? "Vade (ay) 0'dan büyük olmalı." :
                   l.OpenedDate > l.FirstInstallmentDate ? "Açılış tarihi ilk taksit tarihinden sonra olamaz." : null;
        });
        MapCrud<CreditCard>(api, "/cards", db => db.Cards, c =>
        {
            c.Installments = [];
            c.PaidAmount = Math.Max(0, c.PaidAmount);
            // Kullanıcı güncel toplam borcu girer; dönem içi harcama ondan türetilir:
            // güncel = dönem borcu + dönem içi − ödenen  ⇒  dönem içi = güncel − dönem borcu + ödenen
            var unbilled = c.CurrentBalance - c.StatementBalance + c.PaidAmount;
            if (unbilled < -0.005m)
                return $"Güncel toplam borç, kalan dönem borcundan ({c.RemainingStatement:N2} TL) az olamaz. \"Bu dönem ödenen\" tutarını kontrol et.";
            c.UnbilledAmount = Math.Max(0, unbilled);
            c.RecalculateBalance();
            return string.IsNullOrWhiteSpace(c.Name) ? "Kart adı gerekli." :
                   c.StatementDay is < 1 or > 31 || c.DueDay is < 1 or > 31 ? "Gün 1-31 arasında olmalı." : null;
        });
        MapCrud<CardInstallment>(api, "/card-installments", db => db.CardInstallments, i =>
            string.IsNullOrWhiteSpace(i.Description) ? "Açıklama gerekli." :
            i.TotalCount <= 0 ? "Taksit sayısı 0'dan büyük olmalı." : null);
        MapCrud<OtherDebt>(api, "/others", db => db.Others, o =>
            string.IsNullOrWhiteSpace(o.Name) ? "Ad gerekli." :
            o.Kind == OtherKinds.Recurring && o.MonthlyAmount <= 0 ? "Düzenli ödeme için aylık tutar gerekli." : null);
        MapCrud<Account>(api, "/accounts", db => db.Accounts, a =>
        {
            // Ad boşsa hesap türü ad olarak kullanılır (ör. "Artı Para").
            if (string.IsNullOrWhiteSpace(a.Name)) a.Name = a.Type;
            return string.IsNullOrWhiteSpace(a.Name) ? "Hesap türü ya da adı gerekli." :
                   a.Limit < 0 || a.Quantity < 0 ? "Limit ve miktar eksi olamaz." : null;
        });

        // ---- Ekstre içe aktarma (yalnızca okur) ----
        api.MapStatementImport();

        // ---- Ödemeler ----
        api.MapGet("/payments", async (AppDb db) =>
            (await db.Payments.ToListAsync()).OrderByDescending(p => p.Date).ThenByDescending(p => p.Id));

        api.MapPost("/payments", async (AppDb db, PaymentRequest req) =>
        {
            var p = new Payment
            {
                Date = req.Date ?? Finance.Today,
                TargetType = req.TargetType,
                TargetId = req.TargetId,
                AccountId = req.AccountId,
                Note = req.Note,
            };

            switch (req.TargetType)
            {
                case TargetTypes.Loan:
                    var loan = await db.Loans.FindAsync(req.TargetId);
                    if (loan is null) return Results.NotFound();
                    var count = Math.Clamp(req.InstallmentCount ?? 1, 0, loan.TermMonths - loan.PaidInstallments);
                    if (count == 0 && req.InstallmentCount != 0) return Results.BadRequest(new { error = "Bu kredinin ödenecek taksiti kalmadı." });
                    loan.PaidInstallments += count;
                    p.InstallmentCount = count;
                    p.Amount = req.Amount ?? loan.MonthlyInstallment * count;
                    p.TargetName = loan.Name;
                    break;

                case TargetTypes.Card:
                    var card = await db.Cards.FindAsync(req.TargetId);
                    if (card is null) return Results.NotFound();
                    // Ödeme "bu dönem ödenen" tutarına eklenir; güncel borç ondan hesaplanır.
                    p.Amount = req.Amount ?? card.RemainingStatement;
                    p.RemainingDelta = p.Amount;
                    card.PaidAmount += p.Amount;
                    card.RecalculateBalance();
                    p.TargetName = card.Name;
                    break;

                case TargetTypes.Other:
                    var other = await db.Others.FindAsync(req.TargetId);
                    if (other is null) return Results.NotFound();
                    p.Amount = req.Amount ?? (other.Kind == OtherKinds.Recurring ? other.MonthlyAmount
                        : other.MonthlyAmount > 0 ? Math.Min(other.MonthlyAmount, other.RemainingAmount)
                        : other.RemainingAmount);
                    if (other.Kind == OtherKinds.Debt)
                    {
                        p.RemainingDelta = Math.Min(p.Amount, other.RemainingAmount);
                        other.RemainingAmount -= p.RemainingDelta;
                    }
                    p.TargetName = other.Name;
                    break;

                default:
                    return Results.BadRequest(new { error = "Geçersiz ödeme türü." });
            }

            if (p.Amount <= 0) return Results.BadRequest(new { error = "Ödeme tutarı 0'dan büyük olmalı." });

            if (req.AccountId is int accountId)
            {
                var account = await db.Accounts.FindAsync(accountId);
                if (account is null) return Results.BadRequest(new { error = "Hesap bulunamadı." });
                account.Balance -= p.Amount;
            }

            db.Payments.Add(p);
            await db.SaveChangesAsync();
            return Results.Ok(p);
        });

        // Ödemeyi silmek, borca ve hesaba yaptığı etkiyi geri alır.
        api.MapDelete("/payments/{id:int}", async (AppDb db, int id) =>
        {
            var p = await db.Payments.FindAsync(id);
            if (p is null) return Results.NotFound();

            switch (p.TargetType)
            {
                case TargetTypes.Loan when await db.Loans.FindAsync(p.TargetId) is { } loan:
                    loan.PaidInstallments = Math.Max(0, loan.PaidInstallments - p.InstallmentCount);
                    break;
                case TargetTypes.Card when await db.Cards.FindAsync(p.TargetId) is { } card:
                    // Yeni model: ödenen tutardan düş. Eski model (delta alanları dolu): bakiyeleri geri ekle.
                    card.PaidAmount = Math.Max(0, card.PaidAmount - p.RemainingDelta);
                    card.StatementBalance += p.StatementDelta;
                    card.MinimumPayment += p.MinimumDelta;
                    card.UnbilledAmount += Math.Max(0, p.CurrentDelta - p.StatementDelta);
                    card.RecalculateBalance();
                    break;
                case TargetTypes.Other when await db.Others.FindAsync(p.TargetId) is { } other:
                    other.RemainingAmount += p.RemainingDelta;
                    break;
            }
            if (p.AccountId is int accountId && await db.Accounts.FindAsync(accountId) is { } account)
                account.Balance += p.Amount;

            db.Payments.Remove(p);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    static void MapCrud<T>(RouteGroupBuilder api, string path, Func<AppDb, DbSet<T>> set, Func<T, string?> validate)
        where T : class, IEntity
    {
        api.MapGet(path, async (AppDb db) => await set(db).ToListAsync());

        api.MapPost(path, async (AppDb db, T item) =>
        {
            item.Id = 0;
            if (validate(item) is { } error) return Results.BadRequest(new { error });
            set(db).Add(item);
            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        api.MapPut(path + "/{id:int}", async (AppDb db, int id, T item) =>
        {
            var existing = await set(db).FindAsync(id);
            if (existing is null) return Results.NotFound();
            item.Id = id;
            if (validate(item) is { } error) return Results.BadRequest(new { error });
            db.Entry(existing).CurrentValues.SetValues(item);
            await db.SaveChangesAsync();
            return Results.Ok(existing);
        });

        api.MapDelete(path + "/{id:int}", async (AppDb db, int id) =>
        {
            var existing = await set(db).FindAsync(id);
            if (existing is null) return Results.NotFound();
            set(db).Remove(existing);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    static async Task<Overview> BuildOverview(AppDb db, DateOnly today, int recurringMonths = 24)
    {
        var monthStart = Finance.MonthStart(today);
        return Finance.Build(
            await db.Loans.ToListAsync(),
            await db.Cards.Include(c => c.Installments).ToListAsync(),
            await db.Others.ToListAsync(),
            await db.Accounts.ToListAsync(),
            await db.Payments.Where(p => p.Date >= monthStart).ToListAsync(),
            today,
            recurringMonths);
    }

    static async Task SaveSnapshot(AppDb db, Overview o, DateOnly today)
    {
        var thisMonthDue = o.Items.Where(i => Finance.MonthIndex(i.Date) <= Finance.MonthIndex(today)).Sum(i => i.Amount);
        var snap = await db.Snapshots.FirstOrDefaultAsync(s => s.Date == today);
        if (snap is null) db.Snapshots.Add(snap = new Snapshot { Date = today });
        snap.TotalDebt = o.TotalDebt;
        snap.TotalAssets = o.TotalAssets;
        snap.MonthlyDue = thisMonthDue;
        await db.SaveChangesAsync();
    }
}
