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
  console.log('🧪 Starting Home Banner Integration Tests...');
  let server;
  let adminUserId;
  let regularUserId;
  let testCategoryId;
  const testBanners = [];

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
       VALUES (gen_random_uuid(), 'Test Banner Category', 'test-banner-cat') 
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    testCategoryId = catRes.rows[0].id;

    // Create an Admin user
    const adminRes = await pool.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, role, status) 
       VALUES (gen_random_uuid(), 'test-admin-uid-123', 'admin-test@snapon.vn', 'Admin Test User', 'admin', 'ACTIVE') 
       ON CONFLICT (email) DO UPDATE SET role = 'admin'
       RETURNING id`
    );
    adminUserId = adminRes.rows[0].id;

    // Create a Regular user
    const regularRes = await pool.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, role, status) 
       VALUES (gen_random_uuid(), 'test-user-uid-456', 'user-test@snapon.vn', 'Regular Test User', 'hirer', 'ACTIVE') 
       ON CONFLICT (email) DO UPDATE SET role = 'hirer'
       RETURNING id`
    );
    regularUserId = regularRes.rows[0].id;

    // Clean up any old test banners just in case
    await pool.query("DELETE FROM banners WHERE code LIKE 'TEST_BANNER_%'");

    console.log('✅ Setup completed. Running tests...');

    // ==========================================
    // TEST 1: Public API - Get active banners
    // ==========================================
    console.log('\n--- Test 1: Public endpoint GET /api/banners/home ---');
    const res1 = await httpRequest('GET', `${baseUrl}/api/banners/home`);
    
    if (res1.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res1.statusCode}`);
    }
    if (!res1.body.success) {
      throw new Error(`Expected success = true, got ${JSON.stringify(res1.body)}`);
    }
    console.log(`✓ Status code is 200`);
    console.log(`✓ Cache-Control header: ${res1.headers['cache-control']}`);
    if (!res1.headers['cache-control'] || !res1.headers['cache-control'].includes('max-age=300')) {
      throw new Error(`Expected Cache-Control header, got ${res1.headers['cache-control']}`);
    }
    console.log(`✓ Active banners returned: ${res1.body.data.length}`);
    if (res1.body.data.length > 0) {
      // Validate structure of first banner
      const banner = res1.body.data[0];
      console.log(`✓ Code: ${banner.code}, Title: "${banner.title}"`);
      if (!banner.id || !banner.imageUrl || !banner.category || !banner.action) {
        throw new Error('Banner response DTO structure is missing required fields.');
      }
      if (!banner.category.id || !banner.category.name) {
        throw new Error('Category nesting structure is incorrect.');
      }
      
      // Validate display order sorting
      let lastOrder = 0;
      for (const b of res1.body.data) {
        if (b.displayOrder < lastOrder) {
          throw new Error('Banners are not sorted by displayOrder ASC');
        }
        lastOrder = b.displayOrder;
      }
      console.log('✓ Banners are sorted correctly by displayOrder');
    }

    // ==========================================
    // TEST 2: Admin Auth - Access control guards
    // ==========================================
    console.log('\n--- Test 2: Admin Access Control ---');
    
    // Regular user attempt
    const res2a = await httpRequest('GET', `${baseUrl}/api/admin/banners`, {
      'x-user-id': regularUserId,
    });
    if (res2a.statusCode !== 403) {
      throw new Error(`Expected regular user to be blocked with 403, got ${res2a.statusCode}`);
    }
    console.log('✓ Blocked regular user with 403 Forbidden');

    // Admin user attempt
    const res2b = await httpRequest('GET', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    });
    if (res2b.statusCode !== 200) {
      throw new Error(`Expected admin user to succeed with 200, got ${res2b.statusCode}`);
    }
    console.log('✓ Allowed admin user with 200 OK');

    // ==========================================
    // TEST 3: Admin - Create Banner with validation
    // ==========================================
    console.log('\n--- Test 3: Create Banner Validations ---');
    
    // Test 3.1: Invalid date range (startAt > endAt)
    const badBannerData1 = {
      code: 'TEST_BANNER_BAD_DATE',
      title: 'Bad Date Banner',
      imageUrl: 'https://example.com/image.png',
      categoryId: testCategoryId,
      placement: 'HOME_FEATURED',
      actionType: 'CATEGORY',
      displayOrder: 10,
      startAt: '2026-06-20T00:00:00Z',
      endAt: '2026-06-15T00:00:00Z',
    };
    
    const res3a = await httpRequest('POST', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    }, badBannerData1);

    if (res3a.statusCode !== 400) {
      throw new Error(`Expected validation error 400, got ${res3a.statusCode}`);
    }
    console.log('✓ Correctly failed validation on startAt > endAt (400)');

    // Test 3.2: Create valid banner
    const validBannerData1 = {
      code: 'TEST_BANNER_1',
      title: 'Test Banner Title 1',
      subtitle: 'Test Subtitle',
      imageUrl: 'https://example.com/banner1.png',
      categoryId: testCategoryId,
      placement: 'HOME_FEATURED',
      actionType: 'CATEGORY',
      displayOrder: 10,
      isActive: true,
      startAt: '2026-06-01T00:00:00Z',
      endAt: '2026-12-31T23:59:59Z',
    };

    const res3b = await httpRequest('POST', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    }, validBannerData1);

    if (res3b.statusCode !== 201) {
      throw new Error(`Expected 201 Created, got ${res3b.statusCode} -> ${JSON.stringify(res3b.body)}`);
    }
    const createdBanner1 = res3b.body.data;
    testBanners.push(createdBanner1.id);
    console.log(`✓ Successfully created banner (201): "${createdBanner1.title}"`);

    // Test 3.3: Duplicate code check
    const res3c = await httpRequest('POST', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    }, validBannerData1);

    if (res3c.statusCode !== 409) {
      throw new Error(`Expected conflict error 409 for duplicate code, got ${res3c.statusCode}`);
    }
    console.log('✓ Correctly failed duplicate code constraint check (409)');

    // ==========================================
    // TEST 4: Scheduling & Active Checks
    // ==========================================
    console.log('\n--- Test 4: Scheduling & Active Time Constraints ---');
    
    // Create inactive banner
    const inactiveBannerData = {
      code: 'TEST_BANNER_INACTIVE',
      title: 'Inactive Banner',
      imageUrl: 'https://example.com/inactive.png',
      categoryId: testCategoryId,
      placement: 'HOME_FEATURED',
      actionType: 'CATEGORY',
      displayOrder: 20,
      isActive: false,
    };
    const res4a = await httpRequest('POST', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    }, inactiveBannerData);
    testBanners.push(res4a.body.data.id);

    // Create banner that has NOT started yet
    const futureBannerData = {
      code: 'TEST_BANNER_FUTURE',
      title: 'Future Banner',
      imageUrl: 'https://example.com/future.png',
      categoryId: testCategoryId,
      placement: 'HOME_FEATURED',
      actionType: 'CATEGORY',
      displayOrder: 30,
      isActive: true,
      startAt: '2026-07-01T00:00:00Z', // In the future compared to June 15
    };
    const res4b = await httpRequest('POST', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    }, futureBannerData);
    testBanners.push(res4b.body.data.id);

    // Create banner that has already ended
    const expiredBannerData = {
      code: 'TEST_BANNER_EXPIRED',
      title: 'Expired Banner',
      imageUrl: 'https://example.com/expired.png',
      categoryId: testCategoryId,
      placement: 'HOME_FEATURED',
      actionType: 'CATEGORY',
      displayOrder: 40,
      isActive: true,
      endAt: '2026-06-10T00:00:00Z', // In the past compared to June 15
    };
    const res4c = await httpRequest('POST', `${baseUrl}/api/admin/banners`, {
      'x-user-id': adminUserId,
    }, expiredBannerData);
    testBanners.push(res4c.body.data.id);

    // Fetch active banners and verify constraints
    const res4d = await httpRequest('GET', `${baseUrl}/api/banners/home`);
    const activeList = res4d.body.data;
    
    const hasInactive = activeList.some(b => b.code === 'TEST_BANNER_INACTIVE');
    const hasFuture = activeList.some(b => b.code === 'TEST_BANNER_FUTURE');
    const hasExpired = activeList.some(b => b.code === 'TEST_BANNER_EXPIRED');
    const hasValid = activeList.some(b => b.code === 'TEST_BANNER_1');

    if (hasInactive || hasFuture || hasExpired) {
      throw new Error(`Scheduling filters failed! Inactive: ${hasInactive}, Future: ${hasFuture}, Expired: ${hasExpired}`);
    }
    if (!hasValid) {
      throw new Error('Valid active banner was incorrectly filtered out.');
    }
    console.log('✓ Successfully filtered out inactive, future, and expired banners from public API');

    // ==========================================
    // TEST 5: Admin Update, Status Toggle, and Delete
    // ==========================================
    console.log('\n--- Test 5: Admin CRUD (Update, Status, Delete) ---');

    // 5.1 Update banner
    const updateData = {
      title: 'Updated Test Banner Title 1',
      displayOrder: 2,
    };
    const res5a = await httpRequest('PUT', `${baseUrl}/api/admin/banners/${createdBanner1.id}`, {
      'x-user-id': adminUserId,
    }, updateData);

    if (res5a.statusCode !== 200) {
      throw new Error(`Expected 200 OK on update, got ${res5a.statusCode}`);
    }
    if (res5a.body.data.title !== 'Updated Test Banner Title 1' || res5a.body.data.displayOrder !== 2) {
      throw new Error('Fields were not updated correctly.');
    }
    console.log('✓ Successfully updated banner fields');

    // 5.2 Status patch
    const res5b = await httpRequest('PATCH', `${baseUrl}/api/admin/banners/${createdBanner1.id}/status`, {
      'x-user-id': adminUserId,
    }, { isActive: false });

    if (res5b.statusCode !== 200) {
      throw new Error(`Expected 200 OK on status patch, got ${res5b.statusCode}`);
    }
    if (res5b.body.data.isActive !== false) {
      throw new Error('Banner status was not toggled.');
    }
    console.log('✓ Successfully patched banner active status');

    // 5.3 Delete banner
    const res5c = await httpRequest('DELETE', `${baseUrl}/api/admin/banners/${createdBanner1.id}`, {
      'x-user-id': adminUserId,
    });
    if (res5c.statusCode !== 200) {
      throw new Error(`Expected 200 OK on delete, got ${res5c.statusCode}`);
    }
    console.log('✓ Successfully deleted banner');

    // Confirm it is deleted
    const res5d = await pool.query('SELECT * FROM banners WHERE id = $1', [createdBanner1.id]);
    if (res5d.rows.length !== 0) {
      throw new Error('Banner still exists in database after delete.');
    }
    console.log('✓ Verified deletion from database');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    // 6. Clean up
    console.log('\n🧹 Cleaning up test database data...');
    try {
      if (testBanners.length > 0) {
        await pool.query('DELETE FROM banners WHERE id = ANY($1)', [testBanners]);
      }
      if (testCategoryId) {
        await pool.query('DELETE FROM categories WHERE id = $1', [testCategoryId]);
      }
      if (adminUserId || regularUserId) {
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [adminUserId, regularUserId]);
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
