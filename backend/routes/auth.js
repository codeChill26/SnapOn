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

    // First check if user exists by email to prevent duplicate key violations
    const checkEmailResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    if (checkEmailResult.rows.length > 0) {
      const updateUserQuery = `
        UPDATE users 
        SET firebase_uid = $1,
            full_name = COALESCE($2, full_name),
            avatar_url = COALESCE($3, avatar_url)
        WHERE email = $4
        RETURNING *;
      `;
      const updateResult = await client.query(updateUserQuery, [
        uid,
        name || null,
        picture || null,
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
        picture || null,
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

module.exports = router;