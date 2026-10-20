namespace DebtTracker;

public record CalendarItem(
    DateOnly Date,
    string Title,
    string Kind,
    decimal Amount,
    bool Estimated,
    bool Overdue,
    bool CountsAsDebt,
    string TargetType,
    int TargetId,
    string? Note);

public record LoanView(
    Loan Loan,
    int RemainingInstallments,
    decimal RemainingTotal,
    decimal RemainingPrincipal,
    decimal RemainingInterest,
    DateOnly? NextDueDate,
    int OverdueCount,
    decimal ProgressPct,
    decimal ImpliedMonthlyRatePct);

public record InstallmentView(CardInstallment Installment, int RemainingCount, decimal RemainingTotal, DateOnly? LastDueDate);

public record CardView(
    CreditCard Card,
    decimal AvailableLimit,
    decimal UtilizationPct,
    decimal UnbilledAmount,
    DateOnly LastStatementDate,
    DateOnly DueDate,
    bool IsOverdue,
    DateOnly NextStatementDate,
    DateOnly NextDueDate,
    decimal FutureInstallmentsTotal,
    decimal TotalDebt,
    List<InstallmentView> Installments);

public record OtherView(OtherDebt Debt, bool PaidThisMonth, DateOnly? NextDueDate, int? RemainingMonths);

public class Overview
{
    public List<LoanView> Loans { get; init; } = [];
    public List<CardView> Cards { get; init; } = [];
    public List<OtherView> Others { get; init; } = [];
    public List<Account> Accounts { get; init; } = [];
    /// <summary>Ödenmemiş tüm gelecek/gecikmiş ödemeler (tarihe göre sıralı).</summary>
    public List<CalendarItem> Items { get; init; } = [];

    public decimal LoansRemainingTotal => Loans.Sum(l => l.RemainingTotal);
    public decimal LoansRemainingPrincipal => Loans.Sum(l => l.RemainingPrincipal);
    public decimal CardsTotal => Cards.Sum(c => c.TotalDebt);
    public decimal CardsStatementTotal => Cards.Sum(c => c.Card.StatementBalance);
    public decimal OthersTotal => Others.Where(o => o.Debt.Kind == OtherKinds.Debt).Sum(o => o.Debt.RemainingAmount);
    public decimal TotalDebt => LoansRemainingTotal + CardsTotal + OthersTotal;
    public decimal TotalDebtPrincipalBased => LoansRemainingPrincipal + CardsTotal + OthersTotal;
    public decimal TotalAssets => Accounts.Sum(a => a.Balance);
}

public static class Finance
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    public static DateOnly MonthStart(DateOnly d) => new(d.Year, d.Month, 1);

    public static int MonthIndex(DateOnly d) => d.Year * 12 + d.Month - 1;

    /// <summary>Ayın belirli günü; ay daha kısaysa son güne kırpılır (31 → 30/28).</summary>
    public static DateOnly DayIn(int year, int month, int day) =>
        new(year, month, Math.Clamp(day, 1, DateTime.DaysInMonth(year, month)));

    public static DateOnly DayIn(DateOnly monthOf, int day) => DayIn(monthOf.Year, monthOf.Month, day);

    /// <summary>Anapara, taksit ve vadeden bankanın fiilen uyguladığı aylık maliyet oranını bulur (vergiler dahil).</summary>
    public static double ImpliedRate(decimal principal, decimal installment, int term)
    {
        if (principal <= 0 || installment <= 0 || term <= 0 || installment * term <= principal) return 0;
        double p = (double)principal, pmt = (double)installment, lo = 0, hi = 1;
        for (var i = 0; i < 200; i++)
        {
            var mid = (lo + hi) / 2;
            var pv = pmt * (1 - Math.Pow(1 + mid, -term)) / mid;
            if (pv > p) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    public static decimal PresentValue(decimal installment, double rate, int count)
    {
        if (count <= 0) return 0;
        if (rate <= 0) return installment * count;
        return (decimal)((double)installment * (1 - Math.Pow(1 + rate, -count)) / rate);
    }

    /// <summary>Faiz oranından eşit taksit hesaplar (taksit girilmemişse kullanılır).</summary>
    public static decimal Annuity(decimal principal, decimal monthlyRatePct, int term)
    {
        if (term <= 0) return 0;
        var r = (double)monthlyRatePct / 100;
        if (r <= 0) return Math.Round(principal / term, 2);
        return Math.Round((decimal)((double)principal * r / (1 - Math.Pow(1 + r, -term))), 2);
    }

    public static Overview Build(
        List<Loan> loans, List<CreditCard> cards, List<OtherDebt> others, List<Account> accounts,
        List<Payment> paymentsThisMonth, DateOnly today, int recurringHorizonMonths = 24)
    {
        var items = new List<CalendarItem>();
        var monthStart = MonthStart(today);

        // ---- Krediler ----
        var loanViews = new List<LoanView>();
        foreach (var l in loans)
        {
            var paid = Math.Clamp(l.PaidInstallments, 0, l.TermMonths);
            var remaining = l.TermMonths - paid;
            var rate = ImpliedRate(l.Principal, l.MonthlyInstallment, l.TermMonths);
            var remainingTotal = l.MonthlyInstallment * remaining;
            var remainingPrincipal = Math.Round(PresentValue(l.MonthlyInstallment, rate, remaining), 2);
            DateOnly? next = remaining > 0 ? l.FirstInstallmentDate.AddMonths(paid) : null;
            var overdue = 0;
            for (var k = paid + 1; k <= l.TermMonths; k++)
            {
                var date = l.FirstInstallmentDate.AddMonths(k - 1);
                var isOverdue = date < today;
                if (isOverdue) overdue++;
                items.Add(new CalendarItem(date, l.Name, "Kredi", l.MonthlyInstallment, false, isOverdue, true,
                    TargetTypes.Loan, l.Id, $"{k}/{l.TermMonths}. taksit"));
            }
            loanViews.Add(new LoanView(l, remaining, remainingTotal, remainingPrincipal,
                remainingTotal - remainingPrincipal, next, overdue,
                l.TermMonths > 0 ? Math.Round(100m * paid / l.TermMonths, 1) : 0,
                Math.Round((decimal)rate * 100, 2)));
        }

        // ---- Kredi kartları ----
        var cardViews = new List<CardView>();
        foreach (var c in cards)
        {
            var lastStatement = DayIn(today, c.StatementDay);
            if (lastStatement > today) lastStatement = DayIn(today.AddMonths(-1), c.StatementDay);
            var due = DueAfter(lastStatement, c.DueDay);
            var nextStatement = DayIn(lastStatement.AddMonths(1), c.StatementDay);
            var nextDue = DueAfter(nextStatement, c.DueDay);
            var isOverdue = c.StatementBalance > 0 && due < today;

            var instViews = new List<InstallmentView>();
            var futureByMonth = new Dictionary<int, decimal>();
            foreach (var i in c.Installments)
            {
                var count = 0;
                DateOnly? last = null;
                for (var k = 0; k < i.TotalCount; k++)
                {
                    var m = i.FirstDueDate.AddMonths(k);
                    // Bir sonraki ekstreye ve sonrasına yansıyacak taksitler henüz güncel borçta değildir.
                    if (MonthIndex(m) < MonthIndex(nextDue)) continue;
                    count++;
                    last = m;
                    var key = MonthIndex(m);
                    futureByMonth[key] = futureByMonth.GetValueOrDefault(key) + i.MonthlyAmount;
                }
                instViews.Add(new InstallmentView(i, count, count * i.MonthlyAmount, last));
            }
            var futureTotal = instViews.Sum(v => v.RemainingTotal);
            var unbilled = Math.Max(0, c.CurrentBalance - c.StatementBalance);

            if (c.StatementBalance > 0)
                items.Add(new CalendarItem(due, c.Name, "Kredi kartı", c.StatementBalance, false, isOverdue, true,
                    TargetTypes.Card, c.Id, c.MinimumPayment > 0 ? $"Dönem borcu · asgari {c.MinimumPayment:N2} TL" : "Dönem borcu"));

            var nextAmount = unbilled + futureByMonth.GetValueOrDefault(MonthIndex(nextDue));
            if (nextAmount > 0)
                items.Add(new CalendarItem(nextDue, c.Name, "Kredi kartı", nextAmount, true, false, true,
                    TargetTypes.Card, c.Id, "Sonraki ekstre (tahmini)"));

            foreach (var (key, amount) in futureByMonth.Where(kv => kv.Key > MonthIndex(nextDue)).OrderBy(kv => kv.Key))
            {
                var monthOf = new DateOnly(key / 12, key % 12 + 1, 1);
                items.Add(new CalendarItem(DayIn(monthOf, c.DueDay), c.Name, "Kredi kartı", amount, true, false, true,
                    TargetTypes.Card, c.Id, "Taksitli alışverişler"));
            }

            cardViews.Add(new CardView(c,
                c.Limit - c.CurrentBalance,
                c.Limit > 0 ? Math.Round(100 * c.CurrentBalance / c.Limit, 1) : 0,
                unbilled, lastStatement, due, isOverdue, nextStatement, nextDue,
                futureTotal, c.CurrentBalance + futureTotal, instViews));
        }

        // ---- Diğer borçlar ve düzenli ödemeler ----
        var otherViews = new List<OtherView>();
        foreach (var o in others)
        {
            var paidThisMonth = paymentsThisMonth.Any(p => p.TargetType == TargetTypes.Other && p.TargetId == o.Id);
            DateOnly? nextDate = null;
            int? remainingMonths = null;

            if (o.Kind == OtherKinds.Recurring)
            {
                for (var m = 0; m < recurringHorizonMonths; m++)
                {
                    if (m == 0 && paidThisMonth) continue;
                    var date = DayIn(monthStart.AddMonths(m), o.DueDay ?? 1);
                    nextDate ??= date;
                    items.Add(new CalendarItem(date, o.Name, "Düzenli ödeme", o.MonthlyAmount, false, date < today, false,
                        TargetTypes.Other, o.Id, o.Creditor));
                }
            }
            else if (o.RemainingAmount > 0)
            {
                if (o.MonthlyAmount > 0 && o.DueDay.HasValue)
                {
                    var left = o.RemainingAmount;
                    var months = 0;
                    for (var m = paidThisMonth ? 1 : 0; left > 0 && m < 600; m++)
                    {
                        var date = DayIn(monthStart.AddMonths(m), o.DueDay.Value);
                        var amount = Math.Min(left, o.MonthlyAmount);
                        left -= amount;
                        months++;
                        nextDate ??= date;
                        items.Add(new CalendarItem(date, o.Name, "Kişisel borç", amount, false, date < today, true,
                            TargetTypes.Other, o.Id, o.Creditor));
                    }
                    remainingMonths = months;
                }
                else if (o.DueDate.HasValue)
                {
                    nextDate = o.DueDate;
                    items.Add(new CalendarItem(o.DueDate.Value, o.Name, "Kişisel borç", o.RemainingAmount, false,
                        o.DueDate.Value < today, true, TargetTypes.Other, o.Id, o.Creditor));
                }
            }
            otherViews.Add(new OtherView(o, paidThisMonth, nextDate, remainingMonths));
        }

        return new Overview
        {
            Loans = loanViews,
            Cards = cardViews,
            Others = otherViews,
            Accounts = accounts,
            Items = items.OrderBy(i => i.Date).ThenBy(i => i.Title).ToList(),
        };
    }

    /// <summary>Ekstre kesiminden sonraki ilk son ödeme günü.</summary>
    static DateOnly DueAfter(DateOnly statement, int dueDay)
    {
        var d = DayIn(statement, dueDay);
        return d > statement ? d : DayIn(statement.AddMonths(1), dueDay);
    }

    /// <summary>Kalemleri aylara böler; geçmiş aylardan gecikmiş kalanlar bu aya eklenir.</summary>
    public static List<object> GroupByMonth(IEnumerable<CalendarItem> items, DateOnly today, int months)
    {
        var current = MonthIndex(today);
        return items
            .Select(i => (Key: Math.Max(MonthIndex(i.Date), current), Item: i))
            .Where(x => x.Key < current + months)
            .GroupBy(x => x.Key)
            .OrderBy(g => g.Key)
            .Select(g => (object)new
            {
                Year = g.Key / 12,
                Month = g.Key % 12 + 1,
                Total = g.Sum(x => x.Item.Amount),
                DebtTotal = g.Where(x => x.Item.CountsAsDebt).Sum(x => x.Item.Amount),
                Items = g.Select(x => x.Item).ToList(),
            })
            .ToList();
    }
}
