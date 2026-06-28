'use strict';

// Ensure dev auth mode for testing
process.env.AUTH_MODE = 'dev';
process.env.PORT = '0'; // Random free port

const http = require('http');
const app = require('../app');
const pool = require('../config/db');
const prisma = require('../db/prisma');

// Helper to make HTTP requests
function httpRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

(async () => {
  console.log('🧪 Starting Custom JWT Access & Refresh Token Integration Tests...');
  let server;
  let testUserId;
  let testEmail = `test-jwt-auth-${Date.now()}@snapon.vn`;

  try {
    // 1. Start Express App
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🌐 Test server running at ${baseUrl}`);

    // ==========================================
    // TEST 1: Register/Sync User -> Expect custom JWT Access and Refresh tokens
    // ==========================================
    console.log('\n--- Test 1: Exchange credentials at /sync-user ---');
    const mockPayload = {
      // In dev mode, sync-user decodes token from body. We send a mock JWT structure
      firebaseToken: `header.${Buffer.from(JSON.stringify({
        sub: `mock-uid-${testEmail.replace(/[@.]/g, '-')}`,
        email: testEmail,
        name: 'JWT Test User'
      })).toString('base64url')}.signature`
    };

    const syncRes = await httpRequest('POST', `${baseUrl}/api/auth/sync-user`, {}, mockPayload);
    
    console.log(`Response Status: ${syncRes.statusCode}`);
    console.log(`Response Body Keys:`, Object.keys(syncRes.body || {}));

    if (syncRes.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${syncRes.statusCode} -> ${JSON.stringify(syncRes.body)}`);
    }

    const { user, accessToken, refreshToken } = syncRes.body;
    testUserId = user.id;

    if (!accessToken || !refreshToken) {
      throw new Error('Access Token or Refresh Token missing in sync-user response!');
    }
    console.log('✓ Successfully received accessToken and refreshToken');
    console.log(`✓ Access Token (short): ${accessToken.slice(0, 30)}...`);
    console.log(`✓ Refresh Token (long): ${refreshToken.slice(0, 30)}...`);

    // Verify Refresh Token is saved in Database
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    if (!dbToken) {
      throw new Error('Refresh Token was not saved in the database!');
    }
    console.log('✓ Verified Refresh Token exists in database table.');

    // ==========================================
    // TEST 2: Access Protected Route with Custom JWT Access Token
    // ==========================================
    console.log('\n--- Test 2: Access /api/users/profile using Access Token ---');
    const profileRes = await httpRequest('GET', `${baseUrl}/api/users/profile`, {
      'Authorization': `Bearer ${accessToken}`
    });

    console.log(`Response Status: ${profileRes.statusCode}`);
    if (profileRes.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${profileRes.statusCode}`);
    }
    if (profileRes.body.user.id !== testUserId) {
      throw new Error('User ID in profile response does not match synced user!');
    }
    console.log('✓ Successfully authenticated and accessed protected route statelessly.');

    // ==========================================
    // TEST 3: Restore Session via /auth/token-login
    // ==========================================
    console.log('\n--- Test 3: Session restoration via /auth/token-login ---');
    const tokenLoginRes = await httpRequest('POST', `${baseUrl}/api/auth/token-login`, {
      'Authorization': `Bearer ${accessToken}`
    });

    console.log(`Response Status: ${tokenLoginRes.statusCode}`);
    if (tokenLoginRes.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${tokenLoginRes.statusCode}`);
    }
    if (!tokenLoginRes.body.wallet) {
      throw new Error('Wallet information missing in token-login response!');
    }
    console.log('✓ Successfully restored session and retrieved wallet details.');

    // ==========================================
    // TEST 4: Rotate Tokens via /auth/refresh
    // ==========================================
    console.log('\n--- Test 4: Token Rotation via /auth/refresh ---');
    
    // Wait 1 second to ensure timestamps change
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const refreshRes = await httpRequest('POST', `${baseUrl}/api/auth/refresh`, {}, {
      refreshToken
    });

    console.log(`Response Status: ${refreshRes.statusCode}`);
    if (refreshRes.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${refreshRes.statusCode} -> ${JSON.stringify(refreshRes.body)}`);
    }

    const newAccessToken = refreshRes.body.accessToken;
    const newRefreshToken = refreshRes.body.refreshToken;

    if (!newAccessToken || !newRefreshToken) {
      throw new Error('New access or refresh token is missing!');
    }
    if (newRefreshToken === refreshToken) {
      throw new Error('Refresh Token was not rotated! It is identical to the old one.');
    }
    console.log('✓ Successfully rotated both Access Token and Refresh Token!');

    // Check old token is deleted from DB and new token is saved
    const oldDbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    const newDbToken = await prisma.refreshToken.findUnique({
      where: { token: newRefreshToken }
    });

    if (oldDbToken) {
      throw new Error('Old Refresh Token was not deleted from database!');
    }
    if (!newDbToken) {
      throw new Error('New Refresh Token was not saved in database!');
    }
    console.log('✓ Verified old token is deleted (revoked) and new token is saved.');

    // ==========================================
    // TEST 5: Using rotated/deleted Refresh Token should fail (Replay Protection)
    // ==========================================
    console.log('\n--- Test 5: Replay Attack Protection (Using old Refresh Token) ---');
    const replayRes = await httpRequest('POST', `${baseUrl}/api/auth/refresh`, {}, {
      refreshToken // old token
    });

    console.log(`Response Status (should be 401): ${replayRes.statusCode}`);
    if (replayRes.statusCode !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${replayRes.statusCode}`);
    }
    console.log('✓ Successfully blocked expired/rotated refresh token (401).');

    // ==========================================
    // TEST 6: Session Cleanup on Logout
    // ==========================================
    console.log('\n--- Test 6: Revoke tokens on Logout ---');
    const logoutRes = await httpRequest('POST', `${baseUrl}/api/auth/logout`, {}, {
      refreshToken: newRefreshToken
    });

    console.log(`Response Status: ${logoutRes.statusCode}`);
    if (logoutRes.statusCode !== 200) {
      throw new Error(`Expected 200 OK, got ${logoutRes.statusCode}`);
    }

    // Verify token is deleted from DB
    const finalDbToken = await prisma.refreshToken.findUnique({
      where: { token: newRefreshToken }
    });
    if (finalDbToken) {
      throw new Error('Refresh Token still exists in database after logout!');
    }
    console.log('✓ Verified Refresh Token is completely revoked from database on logout.');

    console.log('\n🎉 ALL CUSTOM JWT AUTHENTICATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    // 6. Clean up
    console.log('\n🧹 Cleaning up test database data...');
    try {
      if (testUserId) {
        await pool.query('DELETE FROM wallets WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
      console.log('✓ Database cleaned.');
    } catch (e) {
      console.error('⚠️ Cleanup database error:', e.message);
    }

    if (server) {
      server.close();
      console.log('✓ Test server stopped.');
    }
    
    // Disconnect Redis client to prevent process hanging
    try {
      const redis = require('../config/redis');
      await redis.disconnect();
      console.log('✓ Redis connection closed.');
    } catch (e) {
      console.error('⚠️ Cleanup Redis error:', e.message);
    }
    
    // Explicit pool end to allow process exit
    await pool.end();
  }
})();
