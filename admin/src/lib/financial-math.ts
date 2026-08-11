/**
 * Reusable Financial Calculation Utility for SnapOn Admin Console
 * Enforces strict financial reconciliation rules across all components:
 * 
 * Gross Transaction Value (GMV) = 100% Contract Amount
 * Platform Fee (SnapOn Revenue) = 8% Fee Amount
 * Tasker Net Earning = 92% Payout (Gross - Platform Fee)
 * Released Amount = Total Net Tasker Earnings actually paid out (status === 'RELEASED')
 */

export interface RawEscrowItem {
  id: string;
  taskId: string;
  posterName: string;
  posterEmail: string;
  taskerName: string;
  taskerEmail: string;
  taskTitle: string;
  amount: number;
  platformFeeAmount: number;
  insuranceFeeAmount?: number;
  status: 'HOLDING' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SingleFinancialBreakdown {
  id: string;
  taskId: string;
  posterName: string;
  posterEmail: string;
  taskerName: string;
  taskerEmail: string;
  taskTitle: string;
  grossAmount: number;        // 100% GMV
  platformFee: number;         // 8% SnapOn Fee
  taskerNet: number;           // 92% Tasker Net
  status: 'HOLDING' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FinancialAggregations {
  totalGMV: number;
  totalPlatformFee: number;
  totalTaskerNet: number;
  totalHeldEscrow: number;
  totalReleasedPayouts: number;
  totalRefunded: number;
  holdingCount: number;
  releasedCount: number;
  refundedCount: number;
  disputedCount: number;
}

/**
 * Calculates financial metrics for a single escrow record.
 */
export function calculateEscrowFinancials(escrow: RawEscrowItem): SingleFinancialBreakdown {
  const grossAmount = Number(escrow.amount || 0);
  const platformFee = Number(escrow.platformFeeAmount || 0);
  const taskerNet = grossAmount - platformFee;

  return {
    id: escrow.id,
    taskId: escrow.taskId,
    posterName: escrow.posterName,
    posterEmail: escrow.posterEmail,
    taskerName: escrow.taskerName,
    taskerEmail: escrow.taskerEmail,
    taskTitle: escrow.taskTitle,
    grossAmount,
    platformFee,
    taskerNet,
    status: escrow.status,
    createdAt: escrow.createdAt ? new Date(escrow.createdAt) : undefined,
    updatedAt: escrow.updatedAt ? new Date(escrow.updatedAt) : undefined,
  };
}

/**
 * Calculates aggregate financial metrics for an array of escrows.
 */
export function calculateAggregateFinancials(escrows: RawEscrowItem[]): FinancialAggregations {
  let totalGMV = 0;
  let totalPlatformFee = 0;
  let totalTaskerNet = 0;
  let totalHeldEscrow = 0;
  let totalReleasedPayouts = 0;
  let totalRefunded = 0;

  let holdingCount = 0;
  let releasedCount = 0;
  let refundedCount = 0;
  let disputedCount = 0;

  for (const raw of escrows) {
    const calc = calculateEscrowFinancials(raw);

    totalGMV += calc.grossAmount;
    totalPlatformFee += calc.platformFee;
    totalTaskerNet += calc.taskerNet;

    if (calc.status === 'HOLDING') {
      totalHeldEscrow += calc.grossAmount;
      holdingCount++;
    } else if (calc.status === 'RELEASED') {
      // Released Payout = Net amount paid out to Tasker
      totalReleasedPayouts += calc.taskerNet;
      releasedCount++;
    } else if (calc.status === 'REFUNDED') {
      totalRefunded += calc.grossAmount;
      refundedCount++;
    } else if (calc.status === 'DISPUTED') {
      disputedCount++;
    }
  }

  return {
    totalGMV,
    totalPlatformFee,
    totalTaskerNet,
    totalHeldEscrow,
    totalReleasedPayouts,
    totalRefunded,
    holdingCount,
    releasedCount,
    refundedCount,
    disputedCount,
  };
}

/**
 * Standard Currency Formatter
 */
export function formatCurrencyVND(amount: number): string {
  if (amount == null || isNaN(amount)) return '0 ₫';
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}
