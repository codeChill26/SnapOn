const { PayOS } = require('@payos/node');

const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

if (!clientId || !apiKey || !checksumKey) {
  console.warn('⚠️  PayOS credentials missing from environment variables (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY). PayOS integration will run in degraded/mock fallback mode.');
}

const payos = new PayOS({
  clientId: clientId || 'mock_client_id',
  apiKey: apiKey || 'mock_api_key',
  checksumKey: checksumKey || 'mock_checksum_key'
});

module.exports = payos;
