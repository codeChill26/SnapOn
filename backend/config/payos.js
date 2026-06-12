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
    webhooks: {
      verify(body) {
        console.log(`🔶 [MOCK PayOS] Verifying webhook:`, JSON.stringify(body));
        return body.data || body;
      },
    },
  };
}

module.exports = payos;
