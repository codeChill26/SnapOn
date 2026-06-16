const walletService = require('../services/walletService');
const { success, error } = require('../utils/responseHandler');

const walletController = {
  /**
   * GET /api/wallet/me
   */
  async getMyWallet(req, res) {
    try {
      const userId = req.user.id;
      const wallet = await walletService.getWalletSummary(userId);
      return success(res, wallet, 'Wallet retrieved successfully.');
    } catch (err) {
      console.error('Get wallet error:', err);
      return error(res, 'Failed to retrieve wallet.', 500);
    }
  },

  /**
   * GET /api/wallet/transactions
   */
  async getMyTransactions(req, res) {
    try {
      const userId = req.user.id;
      const { limit, cursor } = req.query;
      const txs = await walletService.listTransactions(userId, { limit, cursor });
      return success(res, txs, 'Wallet transactions retrieved successfully.');
    } catch (err) {
      console.error('List wallet transactions error:', err);
      return error(res, 'Failed to retrieve wallet transactions.', 500);
    }
  },

  /**
   * POST /api/wallet/topup/mock
   * Body: { amount }
   */
  async topupMock(req, res) {
    try {
      const userId = req.user.id;
      const { amount } = req.body;
      const wallet = await walletService.topupMock(userId, amount);
      return success(res, wallet, 'Topup successful.');
    } catch (err) {
      console.error('Topup mock error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to top up.', status);
    }
  },

  /**
   * POST /api/wallet/topup/payos/create
   * Body: { amount }
   */
  async createPayOSPayment(req, res) {
    try {
      const userId = req.user.id;
      const { amount } = req.body;
      const session = await walletService.createPayOSPaymentSession(userId, amount);
      return success(res, session, 'PayOS payment link created successfully.');
    } catch (err) {
      console.error('Create PayOS payment error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to create payment link.', status);
    }
  },

  /**
   * POST /api/wallet/topup/payos/webhook
   * Body: PayOS webhook payload
   */
  async handlePayOSWebhook(req, res) {
    try {
      const result = await walletService.processPayOSWebhook(req.body);
      return success(res, result, 'Webhook processed successfully.');
    } catch (err) {
      console.error('PayOS Webhook processing error:', err);
      return error(res, err.message || 'Failed to process webhook.', 500);
    }
  },

  /**
   * GET /api/wallet/topup/payos/status/:orderCode
   */
  async checkPayOSPaymentStatus(req, res) {
    try {
      const { orderCode } = req.params;
      const result = await walletService.checkPayOSPaymentStatus(orderCode);
      return success(res, result, 'Payment status checked/updated successfully.');
    } catch (err) {
      console.error('Check PayOS payment status error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to check payment status.', status);
    }
  },

  /**
   * POST /api/wallet/withdraw
   */
  async withdraw(req, res) {
    try {
      const userId = req.user.id;
      const { amount, bankName, bankAccountNumber } = req.body;
      const result = await walletService.withdraw(userId, amount, bankName, bankAccountNumber);
      return success(res, result, 'Withdrawal request submitted successfully.');
    } catch (err) {
      console.error('Withdraw error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to process withdrawal.', status);
    }
  },

  /**
   * GET /api/wallet/withdraw
   * Admin: list all withdrawal requests
   */
  async listWithdrawals(req, res) {
    try {
      const { limit, offset, status } = req.query;
      const result = await walletService.listWithdrawals({ limit, offset, status });
      return success(res, result, 'Withdrawal requests retrieved successfully.');
    } catch (err) {
      console.error('List withdrawals error:', err);
      return error(res, 'Failed to retrieve withdrawal requests.', 500);
    }
  },

  /**
   * GET /api/wallet/withdraw/:id
   * Get single withdrawal request details
   */
  async getWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const result = await walletService.getWithdrawal(id);
      if (!result) {
        return error(res, 'Withdrawal request not found.', 404);
      }
      return success(res, result, 'Withdrawal request retrieved successfully.');
    } catch (err) {
      console.error('Get withdrawal error:', err);
      return error(res, 'Failed to retrieve withdrawal request.', 500);
    }
  },

  /**
   * POST /api/wallet/withdraw/:id/approve
   * Admin: approve withdrawal and trigger PayOS payout
   */
  async approveWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const result = await walletService.approveWithdrawal(id, adminId);
      return success(res, result, 'Withdrawal approved and payout processed.');
    } catch (err) {
      console.error('Approve withdrawal error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to approve withdrawal.', status);
    }
  },

  /**
   * POST /api/wallet/withdraw/:id/reject
   * Admin: reject withdrawal and refund wallet
   */
  async rejectWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const result = await walletService.rejectWithdrawal(id, adminId);
      return success(res, result, 'Withdrawal rejected and wallet refunded.');
    } catch (err) {
      console.error('Reject withdrawal error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to reject withdrawal.', status);
    }
  },

  /**
   * POST /api/wallet/payout/webhook
   * PayOS payout webhook
   */
  async handlePayoutWebhook(req, res) {
    try {
      const result = await walletService.processPayoutWebhook(req.body);
      return success(res, result, 'Payout webhook processed successfully.');
    } catch (err) {
      console.error('Payout webhook error:', err);
      return error(res, err.message || 'Failed to process payout webhook.', 500);
    }
  },
};

module.exports = walletController;
