/**
 * InterestCalculationService
 *
 * Calculates interest (juros), fines (multa), and discounts for overdue
 * or early-paid financial entries. Supports daily compound interest,
 * grace periods, and Brazilian-standard penalty structures.
 */

export interface InterestConfig {
  /** Daily interest rate as a decimal (e.g., 0.00033 = 0.033%/day ≈ 1%/month) */
  dailyRate: number;
  /** Fixed fine percentage applied once after grace period (e.g., 0.02 = 2%) */
  fineRate: number;
  /** Grace period in days before interest/fines start accruing */
  gracePeriodDays: number;
  /** Maximum interest rate cap as percentage of principal (e.g., 1.0 = 100%) */
  maxInterestCap?: number;
}

export interface InterestResult {
  /** Number of calendar days past due */
  daysOverdue: number;
  /** Number of days interest is actually charged (after grace period) */
  chargeableDays: number;
  /** Calculated interest amount (juros) */
  interestAmount: number;
  /** Fine amount (multa) - applied once */
  fineAmount: number;
  /** Total additional charges (interest + fine) */
  totalCharges: number;
  /** Updated total (principal + charges) */
  totalWithCharges: number;
  /** Whether the entry is within grace period */
  inGracePeriod: boolean;
}

/** Default interest config: 1%/month compound, 2% fine, no grace */
export const DEFAULT_INTEREST_CONFIG: InterestConfig = {
  dailyRate: 0.00033, // ~1% per month (0.033%/day)
  fineRate: 0.02, // 2% fine after grace period
  gracePeriodDays: 0,
  maxInterestCap: 1.0, // 100% of principal max
};

/**
 * Calculate days overdue using UTC-normalized dates.
 * Returns 0 if the entry is not yet overdue.
 */
export function calculateDaysOverdue(
  dueDate: Date | string,
  referenceDate?: Date,
): number {
  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);

  const ref = referenceDate ? new Date(referenceDate) : new Date();
  ref.setUTCHours(0, 0, 0, 0);

  const diffMs = ref.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculate interest and fine for an overdue entry.
 *
 * Uses daily compound interest:
 *   interest = principal × ((1 + dailyRate)^days - 1)
 *
 * Fine is applied as a one-time percentage after the grace period.
 *
 * All monetary calculations use integer centavos internally to
 * avoid floating-point precision issues.
 */
export function calculateInterest(
  principalAmount: number,
  dueDate: Date | string,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG,
  referenceDate?: Date,
): InterestResult {
  const daysOverdue = calculateDaysOverdue(dueDate, referenceDate);

  // Not overdue
  if (daysOverdue <= 0) {
    return {
      daysOverdue: 0,
      chargeableDays: 0,
      interestAmount: 0,
      fineAmount: 0,
      totalCharges: 0,
      totalWithCharges: principalAmount,
      inGracePeriod: false,
    };
  }

  // Within grace period
  if (daysOverdue <= config.gracePeriodDays) {
    return {
      daysOverdue,
      chargeableDays: 0,
      interestAmount: 0,
      fineAmount: 0,
      totalCharges: 0,
      totalWithCharges: principalAmount,
      inGracePeriod: true,
    };
  }

  // Calculate chargeable days (after grace period)
  const chargeableDays = daysOverdue - config.gracePeriodDays;

  // Daily compound interest: P × ((1 + r)^n - 1)
  // Use integer centavos to avoid float issues
  const principalCentavos = Math.round(principalAmount * 100);
  const compoundFactor = Math.pow(1 + config.dailyRate, chargeableDays) - 1;
  let interestCentavos = Math.round(principalCentavos * compoundFactor);

  // Apply cap if configured
  if (config.maxInterestCap !== undefined) {
    const maxCentavos = Math.round(principalCentavos * config.maxInterestCap);
    interestCentavos = Math.min(interestCentavos, maxCentavos);
  }

  // Fine (multa) - one-time flat percentage
  const fineCentavos = Math.round(principalCentavos * config.fineRate);

  const totalChargesCentavos = interestCentavos + fineCentavos;

  return {
    daysOverdue,
    chargeableDays,
    interestAmount: interestCentavos / 100,
    fineAmount: fineCentavos / 100,
    totalCharges: totalChargesCentavos / 100,
    totalWithCharges: (principalCentavos + totalChargesCentavos) / 100,
    inGracePeriod: false,
  };
}

/**
 * Calculate early payment discount.
 *
 * @param principalAmount - Original amount
 * @param dueDate - Due date
 * @param paymentDate - Date of payment
 * @param discountRate - Discount per day early (e.g., 0.0005 = 0.05%/day)
 * @param maxDiscountRate - Maximum discount as percentage of principal
 * @returns Discount amount (0 if payment is not early)
 */
export function calculateEarlyPaymentDiscount(
  principalAmount: number,
  dueDate: Date | string,
  paymentDate: Date,
  discountRate: number = 0.0005,
  maxDiscountRate: number = 0.05,
): number {
  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);
  const payment = new Date(paymentDate);
  payment.setUTCHours(0, 0, 0, 0);

  const diffMs = due.getTime() - payment.getTime();
  const daysEarly = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysEarly <= 0) return 0;

  const principalCentavos = Math.round(principalAmount * 100);
  const discountCentavos = Math.round(principalCentavos * discountRate * daysEarly);
  const maxDiscountCentavos = Math.round(principalCentavos * maxDiscountRate);

  return Math.min(discountCentavos, maxDiscountCentavos) / 100;
}

/**
 * Batch-calculate interest for multiple entries.
 * Useful for reports and dashboard summaries.
 */
export function calculateBatchInterest(
  entries: Array<{
    id: string;
    amount: number;
    dueDate: Date | string | null;
    paidAmount?: number;
  }>,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG,
  referenceDate?: Date,
): Array<{ id: string; remaining: number; result: InterestResult }> {
  return entries
    .filter((e) => e.dueDate !== null)
    .map((entry) => {
      const remaining = entry.amount - (entry.paidAmount ?? 0);
      const result = calculateInterest(
        remaining,
        entry.dueDate!,
        config,
        referenceDate,
      );
      return { id: entry.id, remaining, result };
    });
}
