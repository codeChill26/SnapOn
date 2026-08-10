'use strict';
require('dotenv').config();

const http = require('http');
const app = require('../app');
const redis = require('../config/redis');

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

async function testOtpSecurity() {
  console.log('🧪 Starting OTP Security & Redis Failure Fallback Tests...');

  let server;
  try {
    // Start Express App on random port
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🌐 Test server running at ${baseUrl}`);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    console.log('⏳ Waiting for Redis to connect...');
    for (let i = 0; i < 15; i++) {
      if (redis.isActive()) break;
      await sleep(500);
    }

    if (!redis.isActive()) {
      throw new Error('Redis is not active. Cannot run tests.');
    }
    console.log('✅ Redis is ready. Running tests...');

    // ==========================================
    // TEST 1: OTP is NOT returned in response body
    // ==========================================
    console.log('\n--- Test 1: Requesting OTP via send-otp ---');
    const res1 = await httpRequest('POST', `${baseUrl}/api/auth/send-otp`, {}, { phone: '0901234567' });
    console.log(`Response Status: ${res1.statusCode}`);
    console.log(`Response Body:`, res1.body);

    if (res1.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res1.statusCode}`);
    }
    if (res1.body.success !== true) {
      throw new Error('Expected success true');
    }
    if (res1.body.data && res1.body.data.otp) {
      throw new Error('SECURITY BREACH: OTP was leaked in the response payload!');
    }
    console.log('✅ Success: OTP was not leaked in response body.');

    // ==========================================
    // TEST 2: Redis failure fallback -> returns 503 Service Unavailable
    // ==========================================
    console.log('\n--- Test 2: Simulating Redis offline status ---');
    // Save original isActive function
    const originalIsActive = redis.isActive;
    // Mock Redis as inactive
    redis.isActive = () => false;

    console.log('Requesting OTP when Redis is offline...');
    const res2 = await httpRequest('POST', `${baseUrl}/api/auth/send-otp`, {}, { phone: '0901234568' });
    console.log(`Response Status (Offline): ${res2.statusCode}`);
    console.log(`Response Body (Offline):`, res2.body);

    // Restore original isActive function
    redis.isActive = originalIsActive;

    if (res2.statusCode !== 503) {
      throw new Error(`Expected status 503 Service Unavailable, got ${res2.statusCode}`);
    }
    if (res2.body.success !== false) {
      throw new Error('Expected success false on error');
    }
    console.log('✅ Success: OTP flow successfully blocked with 503 when Redis is offline.');

  } catch (error) {
    console.error('\n❌ OTP security test failed:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      console.log('\n🧹 Test server stopped.');
    }
    
    // Explicitly close redis connection to let process exit
    try {
      await redis.disconnect();
    } catch (e) {}
  }
}

testOtpSecurity();
