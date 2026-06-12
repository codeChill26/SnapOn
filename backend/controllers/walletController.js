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
};

module.exports = walletController;
