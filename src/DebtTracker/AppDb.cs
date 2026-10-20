using Microsoft.EntityFrameworkCore;

namespace DebtTracker;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<CreditCard> Cards => Set<CreditCard>();
    public DbSet<CardInstallment> CardInstallments => Set<CardInstallment>();
    public DbSet<OtherDebt> Others => Set<OtherDebt>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Snapshot> Snapshots => Set<Snapshot>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<CreditCard>()
            .HasMany(c => c.Installments)
            .WithOne()
            .HasForeignKey(i => i.CreditCardId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Snapshot>().HasIndex(s => s.Date).IsUnique();
    }
}
