const express = require('express');
const router = express.Router();

/* GET home page — API info */
router.get('/', function(req, res, next) {
  res.json({
    success: true,
    message: 'Welcome to SnapOn API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      tasks: {
        list: 'GET /api/tasks',
        create: 'POST /api/tasks',
        detail: 'GET /api/tasks/:id',
        myTasks: 'GET /api/tasks/my-tasks',
        updateStatus: 'PATCH /api/tasks/:id/status',
      },
      applications: {
        create: 'POST /api/tasks/:taskId/applications',
        list: 'GET /api/tasks/:taskId/applications',
        withdraw: 'PATCH /api/applications/:id/withdraw',
      },
      matching: {
        autoMatch: 'POST /api/tasks/:taskId/auto-match',
        manualMatch: 'POST /api/tasks/:taskId/manual-match',
        rankedApplications: 'GET /api/tasks/:taskId/ranked-applications',
      },
      wallet: {
        me: 'GET /api/wallet/me',
        transactions: 'GET /api/wallet/transactions',
        topupMock: 'POST /api/wallet/topup/mock',
        topupPayOS: 'POST /api/wallet/topup/payos/create',
        payOSWebhook: 'POST /api/wallet/topup/payos/webhook',
        payOSStatus: 'GET /api/wallet/topup/payos/status/:orderCode',
        withdraw: 'POST /api/wallet/withdraw',
        listWithdrawals: 'GET /api/wallet/withdraw',
        withdrawalDetail: 'GET /api/wallet/withdraw/:id',
        approveWithdrawal: 'POST /api/wallet/withdraw/:id/approve',
        rejectWithdrawal: 'POST /api/wallet/withdraw/:id/reject',
        payoutWebhook: 'POST /api/wallet/payout/webhook',
      },
    },
  });
});

module.exports = router;
