import api from './api';
import { Wallet, WalletTransaction, ApiResponse, Escrow } from '../types';

export const mapWallet = (raw: any): Wallet => {
  if (!raw) return { id: '', userId: '', balance: 0, availableBalance: 0, lockedBalance: 0 };
  return {
    id: raw.id,
    userId: raw.user_id || raw.userId,
    balance: Number(raw.balance || 0),
    availableBalance: Number(raw.available_balance !== undefined ? raw.available_balance : (raw.availableBalance || raw.balance || 0)),
    lockedBalance: Number(raw.locked_balance !== undefined ? raw.locked_balance : (raw.lockedBalance || raw.pending_balance || 0)),
  };
};

export const mapTransaction = (raw: any): WalletTransaction => {
  const rawType = (raw.type ? String(raw.type).toLowerCase() : '');
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
    mappedType = 'DEPOSIT';
  }

  const rawStatus = (raw.status ? String(raw.status).toUpperCase() : 'PENDING');
  const mappedStatus = (rawStatus === 'SUCCESS' || rawStatus === 'APPROVED' ? 'SUCCESS' : rawStatus === 'FAILED' || rawStatus === 'REJECTED' ? 'FAILED' : rawStatus === 'CANCELLED' ? 'CANCELLED' : 'PENDING');

  return {
    id: raw.id,
    walletId: raw.wallet_id || raw.walletId,
    type: mappedType,
    amount: Number(raw.amount || 0),
    status: mappedStatus,
    referenceId: raw.reference_id || raw.referenceId,
    description: raw.description,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    userName: raw.full_name || raw.userName,
    userEmail: raw.email || raw.userEmail,
    userPhone: raw.phone || raw.userPhone,
    userAvatar: raw.avatar_url || raw.userAvatar,
  };
};

export const walletService = {
  async getMyWallet(): Promise<Wallet> {
    const response = await api.get<ApiResponse<Wallet>>('/wallet/me');
    return mapWallet(response.data.data);
  },

  async getTransactions(cursor?: string, limit = 50): Promise<{
    transactions: WalletTransaction[];
    nextCursor?: string;
  }> {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    const response = await api.get<ApiResponse<any>>('/wallet/transactions', { params });
    const raw = response.data?.data || response.data || {};
    const items = Array.isArray(raw.transactions) ? raw.transactions : (Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : []));

    return {
      transactions: items.map(mapTransaction),
      nextCursor: raw.nextCursor,
    };
  },

  async topupMock(amount: number): Promise<Wallet> {
    const response = await api.post<ApiResponse<Wallet>>('/wallet/topup/mock', { amount });
    return mapWallet(response.data.data);
  },

  async createPayOSPayment(amount: number): Promise<{ checkoutUrl: string; orderCode: number }> {
    const response = await api.post<ApiResponse<{ checkoutUrl: string; orderCode: number }>>('/wallet/topup/payos', { amount });
    return response.data.data;
  },

  async confirmPayOSPayment(orderCode: number): Promise<{ wallet: Wallet; alreadyProcessed: boolean; success?: boolean; message?: string }> {
    const response = await api.post<ApiResponse<{ wallet: any; alreadyProcessed: boolean; success?: boolean; message?: string }>>('/wallet/topup/payos/confirm', { orderCode });
    return {
      wallet: mapWallet(response.data.data?.wallet),
      alreadyProcessed: Boolean(response.data.data?.alreadyProcessed),
      success: response.data.data?.success,
      message: response.data.data?.message,
    };
  },

  async checkPayOSStatus(orderCode: number): Promise<any> {
    const response = await api.get(`/wallet/topup/payos/status/${orderCode}`);
    return response.data;
  },

  async withdraw(payload: { amount: number; bankName: string; bankAccountNumber: string }): Promise<void> {
    await api.post('/wallet/withdraw', payload);
  },

  async getMyEscrows(): Promise<Escrow[]> {
    const response = await api.get('/escrows/me');
    return response.data?.data?.escrows || response.data?.data || [];
  },

  async getEscrowByTaskId(taskId: string): Promise<Escrow | null> {
    try {
      const response = await api.get(`/escrows/${taskId}`);
      return response.data?.data || null;
    } catch {
      return null;
    }
  },
};
