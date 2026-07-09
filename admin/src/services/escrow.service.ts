import { prisma } from '../lib/prisma';
import {
  EscrowStatus,
  AssignedTaskStatus,
  TaskStatus,
  TransactionStatus,
  WalletTransactionType,
  Prisma,
} from '@prisma/client';
import { NotFoundError, BadRequestError } from '../lib/errors';

export type DisputeAction = 'RELEASE' | 'REFUND';

/** Escrow rows contain BigInt (orderCode) — normalize before JSON serialization. */
function serializeEscrow<T extends { orderCode: bigint | null }>(escrow: T) {
  return { ...escrow, orderCode: escrow.orderCode == null ? null : Number(escrow.orderCode) };
}

export class EscrowService {
  /**
   * List escrows for the admin console.
   * - view=DISPUTED       → tranh chấp chờ phân xử
   * - view=REFUND_MANUAL  → đã REFUNDED nhưng thanh toán qua PayOS
   *                         (order_code != null) → cần hoàn tiền thủ công
   */
  async getEscrows(params: { page: number; limit: number; view: 'DISPUTED' | 'REFUND_MANUAL' }) {
    const { page, limit, view } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.EscrowWhereInput =
      view === 'REFUND_MANUAL'
        ? { status: EscrowStatus.REFUNDED, orderCode: { not: null } }
        : { status: EscrowStatus.DISPUTED };

    const [rows, total] = await Promise.all([
      prisma.escrow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          task: { select: { id: true, title: true } },
          poster: { select: { id: true, fullName: true, email: true } },
          tasker: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.escrow.count({ where }),
    ]);

    return { escrows: rows.map(serializeEscrow), total };
  }

  async getEscrowById(id: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id },
      include: {
        task: { select: { id: true, title: true, status: true } },
        poster: { select: { id: true, fullName: true, email: true } },
        tasker: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!escrow) throw new NotFoundError('Escrow not found');
    return serializeEscrow(escrow);
  }

  /**
   * Resolve a DISPUTED escrow.
   *  - RELEASE: trả tiền công cho worker (amount − platform fee)
   *  - REFUND : hoàn cho poster
   * Dual-path giống backend:
   *  - orderCode == null → legacy ví (poster locked_balance)
   *  - orderCode != null → per-job PayOS (poster không có ví;
   *    REFUND chỉ đánh dấu — admin chuyển khoản/hoàn PayOS thủ công)
   */
  async resolveDispute(id: string, action: DisputeAction) {
    if (action !== 'RELEASE' && action !== 'REFUND') {
      throw new BadRequestError(`Unsupported dispute action: ${action}`);
    }

    return prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.findUnique({ where: { id } });
      if (!escrow) throw new NotFoundError('Escrow not found');
      if (escrow.status !== EscrowStatus.DISPUTED) {
        throw new BadRequestError(`Chỉ có thể phân xử escrow đang DISPUTED (hiện tại: ${escrow.status}).`);
      }

      const amount = Number(escrow.amount);
      const platformFee = Number(escrow.platformFeeAmount);
      const taskerEarning = Math.round((amount - platformFee) * 100) / 100;
      const isLegacyWalletFunded = escrow.orderCode == null;

      if (action === 'RELEASE') {
        // Legacy: settle poster wallet (locked → out)
        if (isLegacyWalletFunded) {
          const posterWallet = await tx.wallet.findUnique({ where: { userId: escrow.posterId } });
          if (!posterWallet) throw new NotFoundError('Poster wallet not found');
          const locked = Number(posterWallet.lockedBalance);
          if (locked < amount) {
            throw new BadRequestError('Số dư đang khóa của poster không đủ để giải ngân.');
          }
          await tx.wallet.update({
            where: { id: posterWallet.id },
            data: {
              lockedBalance: locked - amount,
              balance: Number(posterWallet.balance) - amount,
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: posterWallet.id,
              type: WalletTransactionType.ESCROW_RELEASE,
              amount: escrow.amount,
              status: TransactionStatus.SUCCESS,
              referenceId: escrow.id,
            },
          });
        }

        // Credit tasker earnings (create wallet if missing)
        if (taskerEarning > 0) {
          const taskerWallet = await tx.wallet.upsert({
            where: { userId: escrow.taskerId },
            create: { userId: escrow.taskerId, balance: 0, availableBalance: 0, lockedBalance: 0 },
            update: {},
          });
          await tx.wallet.update({
            where: { id: taskerWallet.id },
            data: {
              availableBalance: Number(taskerWallet.availableBalance) + taskerEarning,
              balance: Number(taskerWallet.balance) + taskerEarning,
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: taskerWallet.id,
              type: WalletTransactionType.ESCROW_RELEASE,
              amount: taskerEarning,
              status: TransactionStatus.SUCCESS,
              referenceId: escrow.id,
            },
          });
        }

        // Assignment → COMPLETED, task → COMPLETED nếu không còn assignment hoạt động
        await tx.assignedTask.updateMany({
          where: {
            taskId: escrow.taskId,
            taskerId: escrow.taskerId,
            status: { in: [AssignedTaskStatus.SUBMITTED, AssignedTaskStatus.IN_PROGRESS, AssignedTaskStatus.ACTIVE, AssignedTaskStatus.ASSIGNED] },
          },
          data: { status: AssignedTaskStatus.COMPLETED },
        });
        const remainActive = await tx.assignedTask.count({
          where: {
            taskId: escrow.taskId,
            status: { in: [AssignedTaskStatus.SUBMITTED, AssignedTaskStatus.IN_PROGRESS, AssignedTaskStatus.ACTIVE, AssignedTaskStatus.ASSIGNED] },
          },
        });
        if (remainActive === 0) {
          await tx.task.update({
            where: { id: escrow.taskId },
            data: { status: TaskStatus.COMPLETED },
          });
        }

        const updated = await tx.escrow.update({
          where: { id },
          data: { status: EscrowStatus.RELEASED, autoReleaseAt: null },
        });
        return serializeEscrow(updated);
      }

      // action === 'REFUND'
      if (isLegacyWalletFunded) {
        const posterWallet = await tx.wallet.findUnique({ where: { userId: escrow.posterId } });
        if (!posterWallet) throw new NotFoundError('Poster wallet not found');
        const locked = Number(posterWallet.lockedBalance);
        if (locked < amount) {
          throw new BadRequestError('Số dư đang khóa của poster không đủ để hoàn tiền.');
        }
        await tx.wallet.update({
          where: { id: posterWallet.id },
          data: {
            lockedBalance: locked - amount,
            availableBalance: Number(posterWallet.availableBalance) + amount,
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: posterWallet.id,
            type: WalletTransactionType.REFUND,
            amount: escrow.amount,
            status: TransactionStatus.SUCCESS,
            referenceId: escrow.id,
          },
        });
      }
      // per-job PayOS: chỉ đánh dấu REFUNDED — escrow sẽ hiện trong tab
      // "Cần hoàn tiền thủ công" để admin chuyển khoản/hoàn PayOS bằng tay.

      await tx.assignedTask.updateMany({
        where: {
          taskId: escrow.taskId,
          taskerId: escrow.taskerId,
          status: { in: [AssignedTaskStatus.SUBMITTED, AssignedTaskStatus.IN_PROGRESS, AssignedTaskStatus.ACTIVE, AssignedTaskStatus.ASSIGNED] },
        },
        data: { status: AssignedTaskStatus.CANCELLED },
      });
      await tx.task.update({
        where: { id: escrow.taskId },
        data: { status: TaskStatus.CANCELLED },
      });

      const updated = await tx.escrow.update({
        where: { id },
        data: { status: EscrowStatus.REFUNDED, autoReleaseAt: null },
      });
      return serializeEscrow(updated);
    });
  }

  /** Đánh dấu đã hoàn tiền thủ công xong (per-job REFUNDED → ghi chú đã xử lý). */
  async markManualRefundDone(id: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id } });
    if (!escrow) throw new NotFoundError('Escrow not found');
    if (escrow.status !== EscrowStatus.REFUNDED || escrow.orderCode == null) {
      throw new BadRequestError('Escrow này không nằm trong danh sách hoàn tiền thủ công.');
    }
    // Ghi nhận đã xử lý bằng cách xóa order_code marker (giữ nguyên số liệu tiền)
    const updated = await prisma.escrow.update({
      where: { id },
      data: { checkoutUrl: null, disputeReason: escrow.disputeReason ?? null, orderCode: null },
    });
    return serializeEscrow(updated);
  }
}
