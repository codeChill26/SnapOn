'use strict';

// Ensure dev auth mode for testing
process.env.AUTH_MODE = 'dev';
process.env.PORT = '0'; // Random free port

const http = require('http');
const app = require('../app');
const pool = require('../config/db');
const walletModel = require('../models/walletModel');

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
  console.log('🧪 Starting Wallet Matching & Escrow Integration Tests...');
  let server;
  let posterId;
  let taskerId;
  let testCategoryId;
  let taskId;
  let applicationId;

  try {
    // 1. Start Express App
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🌐 Test server running at ${baseUrl}`);

    // 2. Prepare test data in DB (idempotent setup)
    console.log('💾 Setting up test users and categories...');
    
    // Get/create a test category
    const catRes = await pool.query(
      `INSERT INTO categories (id, name, slug) 
       VALUES (gen_random_uuid(), 'Test Matching Category', 'test-matching-cat') 
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    testCategoryId = catRes.rows[0].id;

    // Create poster user
    const posterRes = await pool.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, role, status) 
       VALUES (gen_random_uuid(), 'test-poster-uid-789', 'poster-test@snapon.vn', 'Poster Test User', 'hirer', 'ACTIVE') 
       ON CONFLICT (email) DO UPDATE SET role = 'hirer'
       RETURNING id`
    );
    posterId = posterRes.rows[0].id;

    // Create tasker user
    const taskerRes = await pool.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, role, status) 
       VALUES (gen_random_uuid(), 'test-tasker-uid-789', 'tasker-test@snapon.vn', 'Tasker Test User', 'tasker', 'ACTIVE') 
       ON CONFLICT (email) DO UPDATE SET role = 'tasker'
       RETURNING id`
    );
    taskerId = taskerRes.rows[0].id;

    // Ensure wallets exist
    await walletModel.createIfNotExists(posterId);
    await walletModel.createIfNotExists(taskerId);

    // Clean up any old test tasks/applications
    await pool.query("DELETE FROM tasks WHERE title = 'Test Matching Task'");

    // 3. Create a test task posted by poster
    console.log('📝 Creating test task...');
    const taskRes = await httpRequest('POST', `${baseUrl}/api/tasks`, {
      'x-user-id': posterId,
    }, {
      category_id: testCategoryId,
      title: 'Test Matching Task',
      description: 'Need someone to test wallets',
      task_type: 'ONLINE',
      budget_min: 100000,
      budget_max: 500000,
      deadline_start: '2026-06-20T00:00:00Z',
      deadline_end: '2026-06-25T00:00:00Z',
    });

    if (taskRes.statusCode !== 201) {
      throw new Error(`Failed to create task, status ${taskRes.statusCode} -> ${JSON.stringify(taskRes.body)}`);
    }
    taskId = taskRes.body.data.id;
    console.log(`✓ Task created with ID: ${taskId}`);

    // 4. Tasker submits an application (bid)
    console.log('🙋 Tasker submitting bid...');
    const appRes = await httpRequest('POST', `${baseUrl}/api/tasks/${taskId}/applications`, {
      'x-user-id': taskerId,
    }, {
      bid_price: 300000,
      estimated_time: '2 days',
      message: 'I can do this job perfectly',
    });

    if (appRes.statusCode !== 201) {
      throw new Error(`Failed to submit bid, status ${appRes.statusCode} -> ${JSON.stringify(appRes.body)}`);
    }
    applicationId = appRes.body.data.id;
    console.log(`✓ Bid submitted with ID: ${applicationId}, price: 300000`);

    // ==========================================
    // TEST 1: Match with 0 wallet balance -> Expect 400 with "Vui lòng nạp thêm tiền vào tài khoản."
    // ==========================================
    console.log('\n--- Test 1: Match with insufficient balance ---');
    
    // Set poster's wallet balance to 0
    await pool.query(
      `UPDATE wallets SET balance = 0, available_balance = 0, locked_balance = 0 WHERE user_id = $1`,
      [posterId]
    );

    const matchRes1 = await httpRequest('POST', `${baseUrl}/api/tasks/${taskId}/manual-match`, {
      'x-user-id': posterId,
    }, {
      application_id: applicationId,
    });

    console.log(`Response Status: ${matchRes1.statusCode}`);
    console.log(`Response Body:`, matchRes1.body);

    if (matchRes1.statusCode !== 400) {
      throw new Error(`Expected status 400, got ${matchRes1.statusCode}`);
    }
    if (!matchRes1.body || matchRes1.body.message !== 'Vui lòng nạp thêm tiền vào tài khoản.') {
      throw new Error(`Expected error message "Vui lòng nạp thêm tiền vào tài khoản.", got "${matchRes1.body ? matchRes1.body.message : ''}"`);
    }
    console.log('✓ Successfully returned 400 and "Vui lòng nạp thêm tiền vào tài khoản."');

    // ==========================================
    // TEST 2: Match with sufficient balance -> Expect 200 success
    // ==========================================
    console.log('\n--- Test 2: Match with sufficient balance ---');

    // Set poster's wallet balance to 350000 (bid price is 300000)
    await pool.query(
      `UPDATE wallets SET balance = 350000, available_balance = 350000, locked_balance = 0 WHERE user_id = $1`,
      [posterId]
    );

    const matchRes2 = await httpRequest('POST', `${baseUrl}/api/tasks/${taskId}/manual-match`, {
      'x-user-id': posterId,
    }, {
      application_id: applicationId,
    });

    console.log(`Response Status: ${matchRes2.statusCode}`);
    console.log(`Response Body:`, matchRes2.body);

    if (matchRes2.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${matchRes2.statusCode}`);
    }
    if (!matchRes2.body.success) {
      throw new Error(`Expected success = true, got false`);
    }
    console.log('✓ Successfully completed matching and escrow hold!');

    // Check balances
    const posterWalletRes = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [posterId]);
    const wallet = posterWalletRes.rows[0];
    console.log(`Poster Wallet available_balance: ${wallet.available_balance}, locked_balance: ${wallet.locked_balance}, balance: ${wallet.balance}`);
    if (parseFloat(wallet.available_balance) !== 50000 || parseFloat(wallet.locked_balance) !== 300000) {
      throw new Error(`Wallet balance transfer incorrect!`);
    }
    console.log('✓ Verified available balance deducted and held in escrow (locked_balance)');

    console.log('\n🎉 ALL WALLET MATCHING TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    // 6. Clean up
    console.log('\n🧹 Cleaning up test database data...');
    try {
      if (taskId) {
        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      }
      if (posterId || taskerId) {
        await pool.query('DELETE FROM wallets WHERE user_id IN ($1, $2)', [posterId, taskerId]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [posterId, taskerId]);
      }
      if (testCategoryId) {
        await pool.query('DELETE FROM categories WHERE id = $1', [testCategoryId]);
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
