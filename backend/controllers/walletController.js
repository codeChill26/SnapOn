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
   * POST /api/wallet/topup/payos/create (Web Flow)
   * Body: { amount }
   */
  async createPayOSPaymentSession(req, res) {
    try {
      const userId = req.user.id;
      const { amount } = req.body;
      const session = await walletService.createPayOSPaymentSession(userId, amount);
      return success(res, session, 'PayOS payment link created successfully.');
    } catch (err) {
      console.error('Create PayOS payment session error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to create payment link.', status);
    }
  },

  /**
   * POST /api/wallet/topup/payos (Mobile Flow)
   * Body: { amount }
   */
  async createPayOSPayment(req, res) {
    try {
      const userId = req.user.id;
      const { amount } = req.body;
      const result = await walletService.createPayOSPayment(userId, amount);
      return success(res, result, 'PayOS payment link created successfully.');
    } catch (err) {
      console.error('Create PayOS payment error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to create payment link.', status);
    }
  },

  /**
   * POST /api/wallet/topup/payos/webhook (Web Flow)
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
   * POST /api/wallet/topup/payos/confirm (Mobile Flow)
   * Body: { orderCode }
   */
  async confirmPayOSPayment(req, res) {
    try {
      const userId = req.user.id;
      const { orderCode } = req.body;
      const result = await walletService.confirmPayOSPayment(userId, Number(orderCode));
      return success(res, result, 'PayOS payment confirmed successfully.');
    } catch (err) {
      console.error('Confirm PayOS payment error:', err);
      const status = err.statusCode || 500;
      return error(res, err.message || 'Failed to confirm payment.', status);
    }
  },

  /**
   * GET /api/wallet/topup/payos/status/:orderCode (Web Flow)
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
   * GET /api/wallet/topup/payos/success (Mobile Webview redirect page)
   */
  async payosSuccess(req, res) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thanh toán thành công</title>
        <style>
          body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
          .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
          h1 { color: #10B981; margin-top: 0; }
          p { color: #6B7280; font-size: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✓ Giao dịch thành công</h1>
          <p>Cảm ơn bạn! Giao dịch của bạn đã được thực hiện. Xin hãy quay lại ứng dụng SnapOn để kiểm tra số dư ví.</p>
        </div>
      </body>
      </html>
    `);
  },

  /**
   * GET /api/wallet/topup/payos/cancel (Mobile Webview cancel page)
   */
  async payosCancel(req, res) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Giao dịch đã hủy</title>
        <style>
          body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
          .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
          h1 { color: #EF4444; margin-top: 0; }
          p { color: #6B7280; font-size: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✕ Đã hủy giao dịch</h1>
          <p>Giao dịch nạp tiền của bạn đã bị hủy. Bạn có thể đóng trình duyệt này và thử lại trong ứng dụng.</p>
        </div>
      </body>
      </html>
    `);
  },
};

module.exports = walletController;
