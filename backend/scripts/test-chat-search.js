'use strict';

// Ensure dev auth mode for testing
process.env.AUTH_MODE = 'dev';
process.env.PORT = '0'; // Random free port

const http = require('http');
const app = require('../app');
const pool = require('../config/db');

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
  console.log('🧪 Starting Chat Phone Number Search Integration Tests...');
  let server;
  let currentUser;
  let targetUser;

  try {
    // 1. Start Express App
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🌐 Test server running at ${baseUrl}`);

    // 2. Prepare test data in DB (idempotent setup)
    console.log('💾 Setting up test users...');
    
    // Create current user
    const currRes = await pool.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, phone, role, status) 
       VALUES (gen_random_uuid(), 'test-current-user-uid', 'current-test@snapon.vn', 'Current User', '0911223344', 'hirer', 'ACTIVE') 
       ON CONFLICT (email) DO UPDATE SET phone = '0911223344'
       RETURNING id`
    );
    currentUser = currRes.rows[0];

    // Create target user
    const targetRes = await pool.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, phone, role, status) 
       VALUES (gen_random_uuid(), 'test-target-user-uid', 'target-test@snapon.vn', 'Target User', '0988776655', 'tasker', 'ACTIVE') 
       ON CONFLICT (email) DO UPDATE SET phone = '0988776655'
       RETURNING id`
    );
    targetUser = targetRes.rows[0];

    console.log('✅ Setup completed. Running tests...');

    // ==========================================
    // TEST 1: Search for target user by phone -> Expect success & user details
    // ==========================================
    console.log('\n--- Test 1: Search for target user by phone ---');
    const res1 = await httpRequest('GET', `${baseUrl}/api/users/search?phone=0988776655`, {
      'x-user-id': currentUser.id,
    });

    console.log(`Response Status: ${res1.statusCode}`);
    console.log(`Response Body:`, res1.body);

    if (res1.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res1.statusCode}`);
    }
    if (!res1.body.success || !res1.body.user) {
      throw new Error(`Expected success = true and user not null`);
    }
    if (res1.body.user.phone !== '0988776655' || res1.body.user.fullName !== 'Target User') {
      throw new Error(`User data returned incorrect!`);
    }
    console.log('✓ Successfully retrieved correct user by phone number.');

    // ==========================================
    // TEST 2: Search for own phone number -> Expect user = null (cannot find self)
    // ==========================================
    console.log('\n--- Test 2: Search for own phone number (self) ---');
    const res2 = await httpRequest('GET', `${baseUrl}/api/users/search?phone=0911223344`, {
      'x-user-id': currentUser.id,
    });

    console.log(`Response Status: ${res2.statusCode}`);
    console.log(`Response Body:`, res2.body);

    if (res2.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res2.statusCode}`);
    }
    if (res2.body.user !== null) {
      throw new Error(`Expected search result to exclude current user, but got: ${JSON.stringify(res2.body.user)}`);
    }
    console.log('✓ Successfully returned null when searching own phone number.');

    // ==========================================
    // TEST 3: Search for non-existent phone number -> Expect user = null
    // ==========================================
    console.log('\n--- Test 3: Search for non-existent phone number ---');
    const res3 = await httpRequest('GET', `${baseUrl}/api/users/search?phone=0999999999`, {
      'x-user-id': currentUser.id,
    });

    console.log(`Response Status: ${res3.statusCode}`);
    console.log(`Response Body:`, res3.body);

    if (res3.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res3.statusCode}`);
    }
    if (res3.body.user !== null) {
      throw new Error(`Expected search result to be null, but got: ${JSON.stringify(res3.body.user)}`);
    }
    console.log('✓ Successfully returned null for non-existent phone number.');

    // ==========================================
    // TEST 4: Search without phone query -> Expect 400 Bad Request
    // ==========================================
    console.log('\n--- Test 4: Search without phone parameter ---');
    const res4 = await httpRequest('GET', `${baseUrl}/api/users/search`, {
      'x-user-id': currentUser.id,
    });

    console.log(`Response Status: ${res4.statusCode}`);
    console.log(`Response Body:`, res4.body);

    if (res4.statusCode !== 400) {
      throw new Error(`Expected status 400, got ${res4.statusCode}`);
    }
    console.log('✓ Successfully returned 400 when phone number is missing.');

    console.log('\n🎉 ALL CHAT PHONE SEARCH TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    // 6. Clean up
    console.log('\n🧹 Cleaning up test database data...');
    try {
      if (currentUser || targetUser) {
        await pool.query('DELETE FROM wallets WHERE user_id IN ($1, $2)', [currentUser.id, targetUser.id]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [currentUser.id, targetUser.id]);
      }
      console.log('✓ Database cleaned.');
    } catch (e) {
      console.error('⚠️ Cleanup database error:', e.message);
    }

    if (server) {
      server.close();
      console.log('✓ Test server stopped.');
    }
    
    // Explicit pool end to allow process exit
    await pool.end();
  }
})();
