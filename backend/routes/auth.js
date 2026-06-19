const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyFirebaseToken = require('../middleware/auth');

router.post('/sync-user', verifyFirebaseToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { uid, email, name, picture } = req.firebaseUser;

    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        message: 'Firebase user thiếu uid hoặc email.',
      });
    }

    await client.query('BEGIN');

    const host = req.get('host');
    const protocol = req.protocol;
    const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;
    const finalAvatar = picture || defaultAvatar;

    // First check if user exists by email to prevent duplicate key violations
    const checkEmailResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    if (checkEmailResult.rows.length > 0) {
      const updateUserQuery = `
        UPDATE users 
        SET firebase_uid = $1,
            full_name = COALESCE($2, full_name),
            avatar_url = COALESCE(avatar_url, $3)
        WHERE email = $4
        RETURNING *;
      `;
      const updateResult = await client.query(updateUserQuery, [
        uid,
        name || null,
        finalAvatar,
        email
      ]);
      user = updateResult.rows[0];
    } else {
      const insertUserQuery = `
        INSERT INTO users (
          id,
          firebase_uid,
          email,
          full_name,
          avatar_url,
          status,
          is_verified
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', false)
        RETURNING *;
      `;
      const userResult = await client.query(insertUserQuery, [
        uid,
        email,
        name || null,
        finalAvatar,
      ]);
      user = userResult.rows[0];
    }

    const createWalletQuery = `
      INSERT INTO wallets (
        id,
        user_id,
        balance,
        available_balance,
        locked_balance
      )
      VALUES (gen_random_uuid(), $1, 0, 0, 0)
      ON CONFLICT (user_id)
      DO NOTHING;
    `;

    await client.query(createWalletQuery, [user.id]);

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [user.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: {
        id: user.id,
        firebaseUid: user.firebase_uid,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        role: user.role,
        status: user.status,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
      wallet: walletResult.rows[0],
    });
  } catch (error) {
    console.error('❌ Sync user error:', error);
    await client.query('ROLLBACK');

    return res.status(500).json({
      success: false,
      message: 'Sync user failed',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ============================================================
// DEV MODE LOGIN — bypasses Firebase entirely
// ============================================================

router.post('/dev/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const result = await pool.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful (dev mode)',
      user,
      token: user.id,
    });
  } catch (err) {
    console.error('❌ Dev login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
});

router.post('/dev/register', async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    await client.query('BEGIN');

    const host = req.get('host');
    const protocol = req.protocol;
    const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;

    const userResult = await client.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, avatar_url, status, is_verified)
       VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, 'ACTIVE', true)
       RETURNING *`,
      [email, fullName || email.split('@')[0], defaultAvatar]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
       VALUES (gen_random_uuid(), $1, 0, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Registration successful (dev mode)',
      user,
      token: user.id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Dev register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Simulate sending OTP. For testing, we use '123456' as standard OTP.
    console.log(`📱 [OTP SERVICE] Generating OTP for ${phone}: 123456`);
    
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully (Simulated)',
      otp: '123456'
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const client = await pool.connect();
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    await client.query('BEGIN');

    // Check if user already exists with this phone number
    const checkUser = await client.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user;

    if (checkUser.rows.length > 0) {
      user = checkUser.rows[0];
    } else {
      // Register new user with phone-based values
      const email = `${phone}@snapon.vn`;
      const fullName = `Thành viên ${phone.slice(-4)}`;
      
      const host = req.get('host');
      const protocol = req.protocol;
      const defaultAvatar = `${protocol}://${host}/uploads/default-avatar.png`;

      // Check if email already exists (edge case)
      const emailCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      let finalEmail = email;
      if (emailCheck.rows.length > 0) {
        finalEmail = `${phone}_${Date.now()}@snapon.vn`;
      }

      const insertUserQuery = `
        INSERT INTO users (
          id,
          firebase_uid,
          email,
          full_name,
          phone,
          avatar_url,
          status,
          is_verified,
          role
        )
        VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', true, 'USER')
        RETURNING *;
      `;
      const userResult = await client.query(insertUserQuery, [
        finalEmail,
        fullName,
        phone,
        defaultAvatar
      ]);
      user = userResult.rows[0];

      // Auto-create wallet for new user
      const createWalletQuery = `
        INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
        VALUES (gen_random_uuid(), $1, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await client.query(createWalletQuery, [user.id]);

      // Auto-create tasker profile
      const createProfileQuery = `
        INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
        VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await client.query(createProfileQuery, [user.id]);
    }

    await client.query('COMMIT');

    // Standardize user object keys to camelCase for mobile
    const userResponse = {
      id: user.id,
      firebaseUid: user.firebase_uid,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      role: user.role || 'USER',
      status: user.status,
      isVerified: user.is_verified,
      createdAt: user.created_at,
    };

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      user: userResponse,
      token: user.id
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;