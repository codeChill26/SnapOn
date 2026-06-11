const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyFirebaseToken = require('../middleware/auth');
const authController = require('../controllers/auth');

// Dev-only: login/register without Firebase
router.post('/dev/login', authController.devLogin);
router.post('/dev/register', authController.devRegister);

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
        firebase_uid,
        email,
        full_name,
        avatar_url,
        role,
        status,
        is_verified
      )
      VALUES ($1, $2, $3, $4, 'hirer', 'active', false)
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = CURRENT_TIMESTAMP
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
        user_id,
        balance,
        available_balance,
        pending_balance
      )
      VALUES ($1, 0, 0, 0)
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