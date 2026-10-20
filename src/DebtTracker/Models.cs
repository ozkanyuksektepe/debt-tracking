namespace DebtTracker;

public interface IEntity
{
    int Id { get; set; }
}

/// <summary>Banka kredisi (ihtiyaç, konut, taşıt...).</summary>
public class Loan : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Bank { get; set; }
    public string Type { get; set; } = "İhtiyaç";
    /// <summary>Çekilen tutar (anapara).</summary>
    public decimal Principal { get; set; }
    /// <summary>Aylık akdi faiz oranı (%), bilgi amaçlı.</summary>
    public decimal InterestRate { get; set; }
    public decimal MonthlyInstallment { get; set; }
    public int TermMonths { get; set; }
    public DateOnly FirstInstallmentDate { get; set; }
    public int PaidInstallments { get; set; }
    public string? Notes { get; set; }
}

public class CreditCard : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Bank { get; set; }
    public decimal Limit { get; set; }
    /// <summary>Son kesilen ekstrenin ödenmemiş kısmı.</summary>
    public decimal StatementBalance { get; set; }
    /// <summary>Kartın güncel toplam borcu (ekstre + dönem içi harcamalar).</summary>
    public decimal CurrentBalance { get; set; }
    public decimal MinimumPayment { get; set; }
    public int StatementDay { get; set; } = 1;
    public int DueDay { get; set; } = 10;
    public string? Notes { get; set; }
    public List<CardInstallment> Installments { get; set; } = [];
}

/// <summary>Kartla yapılan, henüz güncel borca yansımamış taksitli alışveriş.</summary>
public class CardInstallment : IEntity
{
    public int Id { get; set; }
    public int CreditCardId { get; set; }
    public string Description { get; set; } = "";
    public decimal MonthlyAmount { get; set; }
    public int TotalCount { get; set; }
    /// <summary>İlk taksidin ödeneceği ay (gün önemsiz).</summary>
    public DateOnly FirstDueDate { get; set; }
}

public static class OtherKinds
{
    public const string Debt = "Borç";
    public const string Recurring = "Düzenli";
}

/// <summary>Kişisel borçlar ve düzenli ödemeler (kira, fatura, abonelik...).</summary>
public class OtherDebt : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Creditor { get; set; }
    public string Kind { get; set; } = OtherKinds.Debt;
    /// <summary>Borç türünde kalan tutar. Düzenli ödemede kullanılmaz.</summary>
    public decimal RemainingAmount { get; set; }
    /// <summary>Aylık ödeme tutarı (borçta opsiyonel, düzenli ödemede zorunlu).</summary>
    public decimal MonthlyAmount { get; set; }
    public int? DueDay { get; set; }
    /// <summary>Tek seferlik vade tarihi (borç için).</summary>
    public DateOnly? DueDate { get; set; }
    public string? Notes { get; set; }
}

public class Account : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "Banka";
    public decimal Balance { get; set; }
    public string? Notes { get; set; }
}

public static class TargetTypes
{
    public const string Loan = "loan";
    public const string Card = "card";
    public const string Other = "other";
}

/// <summary>Yapılan ödeme kaydı. Delta alanları silindiğinde etkiyi geri almak için tutulur.</summary>
public class Payment : IEntity
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public string TargetType { get; set; } = "";
    public int TargetId { get; set; }
    public string TargetName { get; set; } = "";
    public int? AccountId { get; set; }
    public int InstallmentCount { get; set; }
    public decimal StatementDelta { get; set; }
    public decimal CurrentDelta { get; set; }
    public decimal MinimumDelta { get; set; }
    public decimal RemainingDelta { get; set; }
    public string? Note { get; set; }
}

/// <summary>Borcun zaman içindeki değişimi için günlük anlık görüntü.</summary>
public class Snapshot
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public decimal TotalDebt { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal MonthlyDue { get; set; }
}
