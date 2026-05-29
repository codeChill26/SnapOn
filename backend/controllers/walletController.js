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
};

module.exports = walletController;
