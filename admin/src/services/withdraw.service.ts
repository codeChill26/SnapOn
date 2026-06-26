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

    if (status === WithdrawStatus.APPROVED || status === WithdrawStatus.PAID) {
      // Deduct wallet balance inside a transaction
      return prisma.$transaction(async (tx) => {
        // Fetch user wallet
        const wallet = await tx.wallet.findUnique({
          where: { userId: withdraw.userId },
        });

        if (!wallet) {
          throw new NotFoundError('User wallet not found');
        }

        // Decimal operations
        const balanceNum = Number(wallet.balance);
        const withdrawNum = Number(withdraw.amount);

        if (balanceNum < withdrawNum) {
          throw new BadRequestError('Insufficient wallet balance to approve withdrawal');
        }

        // Update Wallet balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceNum - withdrawNum,
            availableBalance: Number(wallet.availableBalance) - withdrawNum,
          },
        });

        // Create transaction history
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.WITHDRAW,
            amount: withdraw.amount,
            status: TransactionStatus.SUCCESS,
            referenceId: withdraw.id,
          },
        });

        // Update request status
        return tx.withdrawRequest.update({
          where: { id },
          data: { status },
        });
      });
    } else if (status === WithdrawStatus.REJECTED) {
      return this.withdrawRepository.updateStatus(id, WithdrawStatus.REJECTED);
    }

    throw new BadRequestError(`Unsupported withdrawal status: ${status}`);
  }
}
