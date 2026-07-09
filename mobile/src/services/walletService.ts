import api from './api';
import { Wallet, WalletTransaction, ApiResponse } from '../types';

const mapWallet = (raw: any): Wallet => {
  return {
    id: raw.id,
    userId: raw.user_id || raw.userId,
    balance: Number(raw.balance),
    availableBalance: Number(raw.available_balance || raw.availableBalance),
    lockedBalance: Number(raw.pending_balance || raw.locked_balance || raw.lockedBalance),
  };
};

const mapTransaction = (raw: any): WalletTransaction => {
  const rawType = raw.type ? raw.type.toLowerCase() : '';
  let mappedType: WalletTransaction['type'] = 'DEPOSIT';
  
  if (rawType === 'withdraw') {
    mappedType = 'WITHDRAW';
  } else if (rawType === 'escrow_hold') {
    mappedType = 'ESCROW_HOLD';
  } else if (rawType === 'escrow_release') {
    mappedType = 'ESCROW_RELEASE';
  } else if (rawType === 'refund') {
    mappedType = 'REFUND';
  } else if (rawType === 'fee' || rawType === 'platform_fee') {
    mappedType = 'PLATFORM_FEE';
  } else {
    mappedType = 'DEPOSIT'; // Maps 'topup' to 'DEPOSIT'
  }

  return {
    id: raw.id,
    walletId: raw.wallet_id || raw.walletId,
    type: mappedType,
    amount: Number(raw.amount),
    status: raw.status ? raw.status.toUpperCase() as any : 'PENDING',
    referenceId: raw.reference_id || raw.referenceId,
    createdAt: raw.created_at || raw.createdAt,
  };
};

export const walletService = {
  async getMyWallet(): Promise<Wallet> {
    const response = await api.get<ApiResponse<Wallet>>('/wallet/me');
    return mapWallet(response.data.data);
  },

  async getTransactions(cursor?: string): Promise<{
    transactions: WalletTransaction[];
    nextCursor?: string;
  }> {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    const response = await api.get<ApiResponse<{
      transactions: any[];
      nextCursor?: string;
    }>>('/wallet/transactions', { params });
    
    return {
      transactions: (response.data.data.transactions || []).map(mapTransaction),
      nextCursor: response.data.data.nextCursor,
    };
  },

  // Escrow-per-job: nạp tiền vào ví đã bị gỡ bỏ.
  // Poster thanh toán trực tiếp từng job qua PayOS (applicationService/matchingService).
  // Ví giờ là sổ thu nhập của người làm: nhận tiền công → rút về ngân hàng.

  async withdraw(
    amount: number,
    bankName: string,
    bankAccountNumber: string
  ): Promise<{ wallet: Wallet; request: any }> {
    const response = await api.post<ApiResponse<{ wallet: any; request: any }>>('/wallet/withdraw', {
      amount,
      bankName,
      bankAccountNumber,
    });
    return {
      wallet: mapWallet(response.data.data.wallet),
      request: response.data.data.request,
    };
  },
};
