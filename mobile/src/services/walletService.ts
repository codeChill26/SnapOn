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
    bankName: raw.bank_name || raw.bankName,
    bankAccountNumber: raw.bank_account_number || raw.bankAccountNumber,
    createdAt: raw.created_at || raw.createdAt,
  };
};

let walletCache: { data: Wallet; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds

export const walletService = {
  invalidateCache(): void {
    walletCache = null;
  },

  async getMyWallet(forceRefresh = false): Promise<Wallet> {
    if (!forceRefresh && walletCache && Date.now() - walletCache.timestamp < CACHE_TTL) {
      return walletCache.data;
    }
    const response = await api.get<ApiResponse<Wallet>>('/wallet/me');
    const wallet = mapWallet(response.data.data);
    walletCache = { data: wallet, timestamp: Date.now() };
    return wallet;
  },

  async getTransactions(cursor?: string): Promise<{
    transactions: WalletTransaction[];
    nextCursor?: string;
  }> {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    const response = await api.get<ApiResponse<any>>('/wallet/transactions', { params });
    
    const rawData = response.data.data;
    const rawList = Array.isArray(rawData) ? rawData : (rawData?.transactions || []);

    return {
      transactions: rawList.map(mapTransaction),
      nextCursor: (response.data as any).pagination?.cursor || rawData?.nextCursor,
    };
  },

  async topupMock(amount: number): Promise<Wallet> {
    const response = await api.post<ApiResponse<Wallet>>('/wallet/topup/mock', { amount });
    this.invalidateCache();
    return mapWallet(response.data.data);
  },

  async createPayOSPayment(amount: number): Promise<{ checkoutUrl: string; orderCode: number }> {
    const response = await api.post<ApiResponse<{ checkoutUrl: string; orderCode: number }>>('/wallet/topup/payos', { amount });
    return response.data.data;
  },

  async confirmPayOSPayment(orderCode: number): Promise<{ wallet: Wallet; alreadyProcessed: boolean; success?: boolean; message?: string }> {
    const response = await api.post<ApiResponse<{ wallet: any; alreadyProcessed: boolean; success?: boolean; message?: string }>>('/wallet/topup/payos/confirm', { orderCode });
    this.invalidateCache();
    return {
      wallet: mapWallet(response.data.data.wallet),
      alreadyProcessed: response.data.data.alreadyProcessed,
      success: response.data.data.success,
      message: response.data.data.message,
    };
  },

  async withdraw(payload: { amount: number; bankName: string; bankAccountNumber: string }): Promise<void> {
    await api.post('/wallet/withdraw', payload);
    this.invalidateCache();
  },

  async updateWithdrawal(id: string, payload: { amount: number; bankName: string; bankAccountNumber: string }): Promise<void> {
    await api.put(`/wallet/withdraw/${id}`, payload);
    this.invalidateCache();
  },

  async cancelWithdrawal(id: string): Promise<void> {
    await api.delete(`/wallet/withdraw/${id}`);
    this.invalidateCache();
  },
};
