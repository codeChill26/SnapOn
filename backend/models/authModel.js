const pool = require('../config/db');

/**
 * Auth Model — user provisioning queries for authentication flows
 */
const authModel = {
  /**
   * Upsert Firebase user + ensure wallet exists. Runs its own transaction.
   * Returns { user, wallet }.
   */
  async syncFirebaseUser({ uid, email, name, avatarUrl }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (
           id, firebase_uid, email, full_name, avatar_url, status, is_verified
         )
         VALUES (gen_random_uuid(), $1, $2, COALESCE($3, split_part($2, '@', 1)), $4, 'ACTIVE', false)
         ON CONFLICT (email) DO UPDATE
         SET firebase_uid = EXCLUDED.firebase_uid,
             full_name = COALESCE($3, users.full_name),
             avatar_url = COALESCE(users.avatar_url, $4)
         RETURNING *`,
        [uid, email, name, avatarUrl]
      );
      const user = userResult.rows[0];

      const walletResult = await client.query(
        `INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
         VALUES (gen_random_uuid(), $1, 0, 0, 0)
         ON CONFLICT (user_id) DO UPDATE
         SET user_id = EXCLUDED.user_id
         RETURNING *`,
        [user.id]
      );

      await client.query('COMMIT');
      return { user, wallet: walletResult.rows[0] };
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      throw err;
    } finally {
      client.release();
    }
  },

  /** Basic auth profile lookup by email (dev login). */
  async findAuthUserByEmail(email, db = pool) {
    const result = await db.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Dev registration: reject verified duplicates, replace unverified ones,
   * create user + wallet. Runs its own transaction for the insert.
   */
  async registerDevUser({ email, fullName, defaultAvatar }) {
    const client = await pool.connect();
    try {
      const existing = await client.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        const existingUser = existing.rows[0];
        if (existingUser.is_verified) {
          const err = new Error('Email already registered');
          err.statusCode = 409;
          throw err;
        }
        // Unverified leftover → remove to allow fresh registration
        await client.query('DELETE FROM users WHERE id = $1', [existingUser.id]);
      }

      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (id, firebase_uid, email, full_name, avatar_url, status, is_verified)
         VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, 'ACTIVE', false)
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
      return user;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Phone OTP flow: find user by phone, or create user + wallet + tasker
   * profile. Runs its own transaction.
   */
  async findOrCreatePhoneUser(phone, { defaultAvatar }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkUser = await client.query('SELECT * FROM users WHERE phone = $1', [phone]);
      let user;

      if (checkUser.rows.length > 0) {
        user = checkUser.rows[0];
      } else {
        const email = `${phone}@snapon.vn`;
        const fullName = `Thành viên ${phone.slice(-4)}`;

        const emailCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const finalEmail = emailCheck.rows.length > 0 ? `${phone}_${Date.now()}@snapon.vn` : email;

        const userResult = await client.query(
          `INSERT INTO users (
             id, firebase_uid, email, full_name, phone, avatar_url,
             status, is_verified, is_id_verified, role
           )
           VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', true, false, 'USER')
           RETURNING *`,
          [finalEmail, fullName, phone, defaultAvatar]
        );
        user = userResult.rows[0];

        await client.query(
          `INSERT INTO wallets (id, user_id, balance, available_balance, locked_balance)
           VALUES (gen_random_uuid(), $1, 0, 0, 0)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );

        await client.query(
          `INSERT INTO tasker_profiles (id, user_id, bio, experience, portfolio_url, location_text, latitude, longitude, average_rating)
           VALUES (gen_random_uuid(), $1, 'Thành viên mới', '', '', '', 10.7769, 106.7009, 5.0)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
      }

      await client.query('COMMIT');
      return user;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      throw err;
    } finally {
      client.release();
    }
  },

  /** Auth profile lookup by id (token login). */
  async getAuthProfileById(userId, db = pool) {
    const result = await db.query(
      'SELECT id, firebase_uid, full_name, email, phone, avatar_url, role, status, is_verified, is_id_verified, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },
};

module.exports = authModel;
