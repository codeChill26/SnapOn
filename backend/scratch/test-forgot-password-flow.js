require('dotenv').config();
const prisma = require('../db/prisma');
const crypto = require('crypto');

// Standard Node-fetch since we are on newer node or we can just make HTTP requests.
// Since it is Node.js, we can write a simple helper using http/https or fetch (fetch is native in Node 18+).
async function makeRequest(path, method, body) {
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTest() {
  console.log('🚀 Starting Forgot Password Flow Test...');
  const testEmail = 'test-forgot-password@example.com';

  try {
    // 1. Setup: Upsert a test user in DB
    console.log('\n--- Step 0: Setup Test User ---');
    const user = await prisma.user.upsert({
      where: { email: testEmail },
      update: { password: null, status: 'ACTIVE' },
      create: {
        email: testEmail,
        fullName: 'Test Forgot Password User',
        status: 'ACTIVE',
        isVerified: true
      }
    });
    console.log(`Created/Reset test user: ${user.email}`);

    // 2. Test Step 1: Request OTP
    console.log('\n--- Step 1: Request OTP ---');
    const step1 = await makeRequest('/api/auth/forgot-password', 'POST', { email: testEmail });
    console.log('Status Code:', step1.status);
    console.log('Response:', step1.data);
    
    if (step1.status !== 200) {
      throw new Error(`Step 1 failed with status ${step1.status}`);
    }

    // 3. Query the database to retrieve the OTP
    console.log('\n--- Database Verification: Retrieve OTP ---');
    // We wait 1 sec to let async operations finish if any, but prisma should be synchronous inside request handler
    const otpRecord = await prisma.forgotPasswordOTP.findFirst({
      where: { email: testEmail, verified: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      throw new Error('No OTP record found in database for test email!');
    }
    console.log('Found OTP record in DB. Expires at:', otpRecord.expiresAt);

    // In a real email flow, the user gets the OTP. Here, since we have the hash, we can check if a debugOtp was returned.
    // If debugOtp was returned, we use it, otherwise we simulate having it.
    // Wait, since we hashed the OTP in the database, we can't easily reverse the hash.
    // BUT! Since EMAIL_DEBUG_OTP is enabled or we can read the debugOtp from the response, let's look at step1.data.debugOtp!
    let otpCode = step1.data.debugOtp;
    if (!otpCode) {
      // If debugOtp is not in response, we will look in the console log or try a known otp if we override it,
      // but in our app code we returned debugOtp if isEmailDebugOtpEnabled() is true.
      // Let's verify if we can find it. If not, we will throw.
      throw new Error('isEmailDebugOtpEnabled() is false or EMAIL_DEBUG_OTP is not set to true in .env. We need the plaintext OTP from response to proceed with test!');
    }
    console.log(`Retrieved OTP Code from response: ${otpCode}`);

    // 4. Test Step 2: Verify OTP
    console.log('\n--- Step 2: Verify OTP ---');
    const step2 = await makeRequest('/api/auth/verify-forgot-password-otp', 'POST', {
      email: testEmail,
      otp: otpCode
    });
    console.log('Status Code:', step2.status);
    console.log('Response:', step2.data);

    if (step2.status !== 200 || !step2.data.resetToken) {
      throw new Error(`Step 2 failed with status ${step2.status}`);
    }
    const resetToken = step2.data.resetToken;
    console.log('Received resetToken:', resetToken);

    // 5. Test Step 3: Reset Password
    console.log('\n--- Step 3: Reset Password ---');
    const newPassword = 'newsecurepassword123';
    const step3 = await makeRequest('/api/auth/reset-password', 'POST', {
      resetToken,
      newPassword
    });
    console.log('Status Code:', step3.status);
    console.log('Response:', step3.data);

    if (step3.status !== 200) {
      throw new Error(`Step 3 failed with status ${step3.status}`);
    }

    // 6. Database Verification: Check updated password
    console.log('\n--- Database Verification: Password Hash ---');
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    const expectedHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    console.log('Hashed Password in DB:', updatedUser.password);
    console.log('Expected Hash:', expectedHash);

    if (updatedUser.password !== expectedHash) {
      throw new Error('Password hash in database does not match the expected value!');
    }
    console.log('✅ Password hash matches expected value!');

    // 7. Cleanup
    console.log('\n--- Step 4: Cleanup ---');
    await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } });
    await prisma.forgotPasswordOTP.deleteMany({ where: { email: testEmail } });
    await prisma.user.delete({ where: { email: testEmail } });
    console.log('Cleaned up test data.');
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Forgot Password Flow works perfectly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    // Attempt cleanup
    await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } }).catch(() => {});
    await prisma.forgotPasswordOTP.deleteMany({ where: { email: testEmail } }).catch(() => {});
    await prisma.user.delete({ where: { email: testEmail } }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
