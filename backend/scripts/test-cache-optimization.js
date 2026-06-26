'use strict';

const http = require('http');
const app = require('../app');
const pool = require('../config/db');
const prisma = require('../db/prisma');
const redis = require('../config/redis');
const bannerService = require('../services/bannerService');

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
  console.log('🧪 Starting Redis Cache Expansion Integration Tests...');
  let server;
  let createdBannerId = null;

  try {
    // 1. Start Express App
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🌐 Test server running at ${baseUrl}`);

    // Wait until Redis is connected
    console.log('⏳ Waiting for Redis client to connect...');
    for (let i = 0; i < 10; i++) {
      if (redis.isActive()) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!redis.isActive()) {
      throw new Error('Redis client failed to connect. Make sure your Redis server is online.');
    }
    console.log('✅ Redis connection confirmed active.');

    // ==========================================
    // TEST 1: Categories Caching
    // ==========================================
    console.log('\n--- Test 1: Categories Caching ---');
    // Clear cache first
    await redis.del('categories:structured');
    console.log('✓ Cleared cache key: "categories:structured"');

    // First request: Cache Miss
    const t0 = Date.now();
    const resCat1 = await httpRequest('GET', `${baseUrl}/api/categories`);
    const d1 = Date.now() - t0;
    console.log(`Response Status: ${resCat1.statusCode}`);
    console.log(`First request (Cache Miss) took: ${d1}ms`);
    if (resCat1.statusCode !== 200 || !resCat1.body.success) {
      throw new Error('Failed to get categories on first request');
    }

    // Verify cache is populated in Redis
    const cachedCat = await redis.get('categories:structured');
    if (!cachedCat) {
      throw new Error('Categories were not cached in Redis!');
    }
    console.log('✓ Confirmed categories data is cached in Redis.');

    // Second request: Cache Hit
    const t1 = Date.now();
    const resCat2 = await httpRequest('GET', `${baseUrl}/api/categories`);
    const d2 = Date.now() - t1;
    console.log(`Second request (Cache Hit) took: ${d2}ms`);
    if (resCat2.statusCode !== 200 || !resCat2.body.success) {
      throw new Error('Failed to get categories on second request');
    }
    console.log(`✓ Speedup factor: ${(d1 / Math.max(d2, 0.1)).toFixed(1)}x faster!`);

    // ==========================================
    // TEST 2: Banners Caching
    // ==========================================
    console.log('\n--- Test 2: Banners Caching ---');
    // Clear cache first
    await redis.del('banners:home_featured');
    console.log('✓ Cleared cache key: "banners:home_featured"');

    // First request: Cache Miss
    const t2 = Date.now();
    const resBanner1 = await httpRequest('GET', `${baseUrl}/api/banners/home`);
    const d3 = Date.now() - t2;
    console.log(`Response Status: ${resBanner1.statusCode}`);
    console.log(`First request (Cache Miss) took: ${d3}ms`);
    if (resBanner1.statusCode !== 200 || !resBanner1.body.success) {
      throw new Error('Failed to get banners on first request');
    }

    // Verify cache is populated in Redis
    const cachedBanners = await redis.get('banners:home_featured');
    if (!cachedBanners) {
      throw new Error('Banners were not cached in Redis!');
    }
    console.log('✓ Confirmed banners data is cached in Redis.');

    // Second request: Cache Hit
    const t3 = Date.now();
    const resBanner2 = await httpRequest('GET', `${baseUrl}/api/banners/home`);
    const d4 = Date.now() - t3;
    console.log(`Second request (Cache Hit) took: ${d4}ms`);
    if (resBanner2.statusCode !== 200 || !resBanner2.body.success) {
      throw new Error('Failed to get banners on second request');
    }
    console.log(`✓ Speedup factor: ${(d3 / Math.max(d4, 0.1)).toFixed(1)}x faster!`);

    // ==========================================
    // TEST 3: Banners Cache Invalidation on Admin Write
    // ==========================================
    console.log('\n--- Test 3: Cache Invalidation on Admin Write ---');
    
    // Ensure cache is populated
    await bannerService.getActiveHomeBanners();
    const checkCacheBefore = await redis.get('banners:home_featured');
    if (!checkCacheBefore) {
      throw new Error('Cache should be populated before invalidation test');
    }
    console.log('✓ Cache populated.');

    // Perform admin write: create a temporary banner
    console.log('Creating a temporary banner via bannerService...');
    const firstCategory = await prisma.category.findFirst();
    if (!firstCategory) {
      throw new Error('At least one category must exist in the database to run this test.');
    }

    const mockBannerData = {
      code: `TEST-BANNER-${Date.now()}`,
      title: 'Test Redis Invalidation',
      subtitle: 'Testing...',
      imageUrl: 'https://via.placeholder.com/600',
      categoryId: firstCategory.id,
      placement: 'HOME_FEATURED',
      actionType: 'CATEGORY',
      actionValue: firstCategory.slug,
      displayOrder: 99,
      isActive: true
    };

    const createdBanner = await bannerService.createBanner(mockBannerData);
    createdBannerId = createdBanner.id;
    console.log(`✓ Temporary banner created with ID: ${createdBannerId}`);

    // Verify cache is invalidated (deleted) from Redis
    const checkCacheAfter = await redis.get('banners:home_featured');
    if (checkCacheAfter !== null) {
      throw new Error('Redis cache key "banners:home_featured" was not invalidated after admin write!');
    }
    console.log('✓ Confirmed Redis cache key "banners:home_featured" was successfully invalidated.');

    console.log('\n🎉 ALL REDIS CACHING EXPANSION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    try {
      if (createdBannerId) {
        await bannerService.deleteBanner(createdBannerId);
        console.log('✓ Temporary banner deleted.');
      }
    } catch (e) {
      console.error('⚠️ Cleanup database error:', e.message);
    }

    if (server) {
      server.close();
      console.log('✓ Test server stopped.');
    }

    // Disconnect Redis client to prevent process hanging
    try {
      await redis.disconnect();
      console.log('✓ Redis connection closed.');
    } catch (e) {
      console.error('⚠️ Cleanup Redis error:', e.message);
    }
    
    // Explicit pool end to allow process exit
    await pool.end();
  }
})();
