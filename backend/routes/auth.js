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

    const upsertUserQuery = `
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
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
      RETURNING *;
    `;

    const userResult = await client.query(upsertUserQuery, [
      uid,
      email,
      name || null,
      picture || null,
    ]);

    const user = userResult.rows[0];

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
      user,
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

    const userResult = await client.query(
      `INSERT INTO users (id, firebase_uid, email, full_name, status, is_verified)
       VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, 'ACTIVE', true)
       RETURNING *`,
      [email, fullName || email.split('@')[0]]
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

module.exports = router;