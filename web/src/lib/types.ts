// .NET API'nin döndürdüğü veri şekilleri.

export type TargetType = "loan" | "card" | "other";

export type Loan = {
  id: number;
  name: string;
  bank: string | null;
  type: string;
  principal: number;
  interestRate: number;
  monthlyInstallment: number;
  termMonths: number;
  /** Kredinin kullandırıldığı tarih; eski kayıtlarda boş olabilir. */
  openedDate: string | null;
  firstInstallmentDate: string;
  /** Son taksit tarihi (backend hesaplar). */
  endDate: string | null;
  paidInstallments: number;
  notes: string | null;
};

export type LoanView = {
  loan: Loan;
  remainingInstallments: number;
  remainingTotal: number;
  remainingPrincipal: number;
  remainingInterest: number;
  nextDueDate: string | null;
  overdueCount: number;
  progressPct: number;
  impliedMonthlyRatePct: number;
};

export type CardInstallment = {
  id: number;
  creditCardId: number;
  description: string;
  monthlyAmount: number;
  totalCount: number;
  firstDueDate: string;
};

export type CreditCard = {
  id: number;
  name: string;
  bank: string | null;
  limit: number;
  /** Ekstre tutarı (dönem borcu); ödeme yapıldıkça değişmez. */
  statementBalance: number;
  /** Bu ekstreye ödenen toplam. */
  paidAmount: number;
  /** Ekstreden sonraki harcamalar; girilen güncel borçtan türetilir. */
  unbilledAmount: number;
  /** Kullanıcı girer; ödeme kaydında yeniden hesaplanır. */
  currentBalance: number;
  minimumPayment: number;
  remainingStatement: number;
  remainingMinimum: number;
  statementDay: number;
  dueDay: number;
  notes: string | null;
  installments: CardInstallment[];
};

export type InstallmentView = {
  installment: CardInstallment;
  remainingCount: number;
  remainingTotal: number;
  lastDueDate: string | null;
};

export type CardView = {
  card: CreditCard;
  availableLimit: number;
  utilizationPct: number;
  unbilledAmount: number;
  lastStatementDate: string;
  dueDate: string;
  isOverdue: boolean;
  nextStatementDate: string;
  nextDueDate: string;
  futureInstallmentsTotal: number;
  totalDebt: number;
  installments: InstallmentView[];
};

export type OtherDebt = {
  id: number;
  name: string;
  creditor: string | null;
  kind: "Borç" | "Düzenli";
  remainingAmount: number;
  monthlyAmount: number;
  dueDay: number | null;
  dueDate: string | null;
  notes: string | null;
};

export type OtherView = {
  debt: OtherDebt;
  paidThisMonth: boolean;
  nextDueDate: string | null;
  remainingMonths: number | null;
};

export type Account = {
  id: number;
  name: string;
  bank: string | null;
  /** Bankanın ürün adı ("Artı Para"...) ya da genel tür ("Nakit"); grubu lib/account-types.ts bulur. */
  type: string;
  /** Güncel bakiye; KMH'de eksi değer kullanılan tutar. */
  balance: number;
  /** KMH limiti. */
  limit: number;
  /** % — KMH'de aylık, vadeli/günlük hesapta yıllık. */
  interestRate: number;
  maturityDate: string | null;
  /** Altın/maden miktarı (gram). */
  quantity: number;
  notes: string | null;
};

export type CalendarItem = {
  date: string;
  title: string;
  kind: string;
  amount: number;
  estimated: boolean;
  overdue: boolean;
  countsAsDebt: boolean;
  targetType: TargetType;
  targetId: number;
  note: string | null;
};

export type CalendarMonth = {
  year: number;
  month: number;
  total: number;
  debtTotal: number;
  items: CalendarItem[];
};

export type Overview = {
  today: string;
  totalDebt: number;
  totalDebtPrincipalBased: number;
  loansRemainingTotal: number;
  loansRemainingPrincipal: number;
  cardsTotal: number;
  cardsStatementTotal: number;
  othersTotal: number;
  totalAssets: number;
  thisMonthDue: number;
  paidThisMonth: number;
  afterPayments: number;
  monthlyRecurring: number;
  overdue: CalendarItem[];
  upcoming: CalendarItem[];
  loans: LoanView[];
  cards: CardView[];
  others: OtherView[];
  accounts: Account[];
};

export type Reports = {
  totalDebt: number;
  totalAssets: number;
  netWorth: number;
  breakdown: { label: string; amount: number }[];
  loanInterestRemaining: number;
  monthly: CalendarMonth[];
  projection: { year: number; month: number; paid: number; remaining: number }[];
  snapshots: { id: number; date: string; totalDebt: number; totalAssets: number; monthlyDue: number }[];
};

export type Payment = {
  id: number;
  date: string;
  amount: number;
  targetType: TargetType;
  targetId: number;
  targetName: string;
  accountId: number | null;
  installmentCount: number;
  note: string | null;
};

/** Ekstreden okunan değer ve ekstrede bulunduğu satır. */
export type Found<T> = { value: T; line: string };

/** /statements/parse yanıtı: ekstre dosyasından çıkarılan özet (kaydedilmez). */
export type ParsedStatement = {
  fileName: string;
  text: string;
  statementBalance: Found<number> | null;
  minimumPayment: Found<number> | null;
  statementDate: Found<string> | null;
  dueDate: Found<string> | null;
  limit: Found<number> | null;
  cardLast4: string | null;
  /** Ekstre dönemi içindeki ödemeler; dönem borcundan zaten düşülmüş, yalnızca bilgi. */
  periodPayments: Found<number> | null;
};
