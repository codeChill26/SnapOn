const { PayOS } = require('@payos/node');

const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

const HAS_CREDENTIALS = !!(clientId && apiKey && checksumKey);

if (!HAS_CREDENTIALS) {
  console.warn('⚠️  PayOS credentials missing (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY).');
  console.warn('   PayOS will use MOCK MODE — payments are simulated, no real money moves.');
}

let payos;

if (HAS_CREDENTIALS) {
  payos = new PayOS({ clientId, apiKey, checksumKey });
  console.log('✅ PayOS initialized with real credentials');
} else {
  // Mock implementation for dev/demo — no real PayOS calls
  payos = {
    paymentRequests: {
      async create({ orderCode, amount, description, cancelUrl, returnUrl }) {
        console.log(`🔶 [MOCK PayOS] Creating payment: orderCode=${orderCode}, amount=${amount}`);
        return {
          checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?orderCode=${orderCode}&status=PAID&code=00`,
          paymentLinkId: `mock_${orderCode}`,
          orderCode,
        };
      },
      async get(orderCode) {
        console.log(`🔶 [MOCK PayOS] Checking status: orderCode=${orderCode}`);
        return { status: 'PAID' };
      },
    },
    payouts: {
      async create(payoutData, idempotencyKey) {
        console.log(`🔶 [MOCK PayOS] Creating payout:`, JSON.stringify(payoutData));
        return {
          id: `mock_payout_${Date.now()}`,
          referenceId: payoutData.referenceId,
          transactions: [{
            id: `mock_tx_${Date.now()}`,
            referenceId: payoutData.referenceId,
            amount: payoutData.amount,
            description: payoutData.description,
            toBin: payoutData.toBin,
            toAccountNumber: payoutData.toAccountNumber,
            toAccountName: 'MOCK ACCOUNT',
            reference: null,
            transactionDatetime: new Date().toISOString(),
            errorMessage: null,
            errorCode: null,
            state: 'SUCCEEDED',
          }],
          category: payoutData.category || null,
          approvalState: 'COMPLETED',
          createdAt: new Date().toISOString(),
        };
      },
      async get(payoutId) {
        console.log(`🔶 [MOCK PayOS] Getting payout: payoutId=${payoutId}`);
        return {
          id: payoutId,
          referenceId: 'mock_ref',
          transactions: [{
            id: `mock_tx_${payoutId}`,
            referenceId: 'mock_ref',
            amount: 0,
            description: 'Mock payout',
            toBin: '970436',
            toAccountNumber: '1234567890',
            toAccountName: 'MOCK ACCOUNT',
            reference: null,
            transactionDatetime: new Date().toISOString(),
            errorMessage: null,
            errorCode: null,
            state: 'SUCCEEDED',
          }],
          category: null,
          approvalState: 'COMPLETED',
          createdAt: new Date().toISOString(),
        };
      },
    },
    payoutsAccount: {
      async balance() {
        console.log(`🔶 [MOCK PayOS] Getting payout account balance`);
        return {
          accountNumber: '1234567890',
          accountName: 'MOCK MERCHANT',
          currency: 'VND',
          balance: '999999999',
        };
      },
    },
    webhooks: {
      verify(body) {
        console.log(`🔶 [MOCK PayOS] Verifying webhook:`, JSON.stringify(body));
        return body.data || body;
      },
    },
  };
}

module.exports = payos;
