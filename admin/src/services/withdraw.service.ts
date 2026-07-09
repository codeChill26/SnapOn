import { WithdrawRepository } from '../repositories/withdraw.repository';
import { prisma } from '../lib/prisma';
import { WithdrawStatus, TransactionStatus, WalletTransactionType } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../lib/errors';

export class WithdrawService {
  private withdrawRepository = new WithdrawRepository();

  async getWithdraws(params: {
    page: number;
    limit: number;
    status?: WithdrawStatus;
  }) {
    return this.withdrawRepository.findMany(params);
  }

  async getWithdrawById(id: string) {
    const withdraw = await this.withdrawRepository.findById(id);
    if (!withdraw) {
      throw new NotFoundError('Withdraw request not found');
    }
    return withdraw;
  }

  async processWithdraw(id: string, status: WithdrawStatus) {
    const withdraw = await this.withdrawRepository.findById(id);
    if (!withdraw) {
      throw new NotFoundError('Withdraw request not found');
    }

    if (withdraw.status !== WithdrawStatus.PENDING) {
      throw new BadRequestError(`Cannot process withdraw request with status ${withdraw.status}`);
    }

    // The requested amount was already held at request time
    // (available_balance -> locked_balance). Here we settle that hold.
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: withdraw.userId },
      });

      if (!wallet) {
        throw new NotFoundError('User wallet not found');
      }

      const withdrawNum = Number(withdraw.amount);
      const lockedNum = Number(wallet.lockedBalance);

      if (status === WithdrawStatus.APPROVED || status === WithdrawStatus.PAID) {
        // Pay out: release the hold AND remove it from the total balance.
        if (lockedNum < withdrawNum) {
          throw new BadRequestError('Số dư đang giữ không đủ để chi trả yêu cầu này.');
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            lockedBalance: lockedNum - withdrawNum,
            balance: Number(wallet.balance) - withdrawNum,
          },
        });

        // Settle the held WITHDRAW ledger entry created at request time.
        await tx.walletTransaction.updateMany({
          where: {
            walletId: wallet.id,
            referenceId: withdraw.id,
            type: WalletTransactionType.WITHDRAW,
          },
          data: { status: TransactionStatus.SUCCESS },
        });

        return tx.withdrawRequest.update({
          where: { id },
          data: { status },
        });
      }

      if (status === WithdrawStatus.REJECTED) {
        // Release the hold back to available balance (total balance unchanged).
        if (lockedNum >= withdrawNum) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              lockedBalance: lockedNum - withdrawNum,
              availableBalance: Number(wallet.availableBalance) + withdrawNum,
            },
          });
        }

        await tx.walletTransaction.updateMany({
          where: {
            walletId: wallet.id,
            referenceId: withdraw.id,
            type: WalletTransactionType.WITHDRAW,
          },
          data: { status: TransactionStatus.FAILED },
        });

        return tx.withdrawRequest.update({
          where: { id },
          data: { status: WithdrawStatus.REJECTED },
        });
      }

      throw new BadRequestError(`Unsupported withdrawal status: ${status}`);
    });
  }
}
