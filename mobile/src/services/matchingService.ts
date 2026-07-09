import api from './api';
import { TaskApplication, ApiResponse } from '../types';
import { mapApplicationFromApi } from './applicationService';

export const matchingService = {
  async getRankedApplications(taskId: string): Promise<TaskApplication[]> {
    const response = await api.get<ApiResponse<any[]>>(
      `/tasks/${taskId}/ranked-applications`
    );
    return (response.data.data || []).map(mapApplicationFromApi);
  },

  /**
   * Escrow-per-job: match trả về yêu cầu thanh toán PayOS
   * (paymentRequired + checkoutUrl + orderCode). Match chỉ được chốt
   * sau khi poster thanh toán — xác nhận qua POST /escrows/payos/confirm.
   */
  async autoMatch(taskId: string, voucherCode?: string): Promise<{
    paymentRequired?: boolean;
    checkoutUrl?: string;
    orderCode?: number;
    payAmount?: number;
    discount?: number;
    expiresAt?: string;
    [key: string]: any;
  }> {
    const response = await api.post<ApiResponse<any>>(
      `/tasks/${taskId}/auto-match`,
      voucherCode ? { voucher_code: voucherCode } : {}
    );
    return response.data.data;
  },

  async manualMatch(
    taskId: string,
    applicationId: string,
    voucherCode?: string
  ): Promise<{
    paymentRequired?: boolean;
    checkoutUrl?: string;
    orderCode?: number;
    payAmount?: number;
    discount?: number;
    expiresAt?: string;
    [key: string]: any;
  }> {
    const response = await api.post<ApiResponse<any>>(
      `/tasks/${taskId}/manual-match`,
      voucherCode ? { application_id: applicationId, voucher_code: voucherCode } : { application_id: applicationId }
    );
    return response.data.data;
  },
};
