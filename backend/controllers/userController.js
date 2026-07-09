const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const cacheService = require('../services/cacheService');

function parseSkillsArray(raw) {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed : [];
}

function ensureUploadDir() {
  const uploadDir = path.join(__dirname, '../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

function saveBase64Image(uploadDir, base64Str, filename) {
  const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
}

/**
 * User Controller — profile, search, uploads, verification, account deletion
 */
const userController = {
  /** GET /api/users/profile */
  async getProfile(req, res) {
    res.json({
      success: true,
      message: 'User authenticated successfully',
      user: req.user,
    });
  },

  /** GET /api/users/search?phone= */
  async searchByPhone(req, res) {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    try {
      const foundUser = await userModel.searchByPhone(phone.trim(), req.user.id);
      if (!foundUser) {
        return res.json({ success: true, user: null, message: 'No user found with this phone number.' });
      }

      res.json({
        success: true,
        user: {
          id: foundUser.id,
          fullName: foundUser.full_name,
          email: foundUser.email,
          phone: foundUser.phone,
          avatarUrl: foundUser.avatar_url,
          role: foundUser.role,
        },
      });
    } catch (error) {
      console.error('Search user by phone error:', error);
      res.status(500).json({ success: false, message: 'Server error during phone search', error: error.message });
    }
  },

  /** PUT /api/users/profile */
  async updateProfile(req, res) {
    const { fullName, phone, avatarUrl, bio, headline, skills, coverUrl } = req.body;
    try {
      const skillsJson = skills !== undefined ? (Array.isArray(skills) ? JSON.stringify(skills) : skills) : null;
      const updatedUser = await userModel.updateProfileById(req.user.id, {
        fullName, phone, avatarUrl, bio, headline, skillsJson, coverUrl,
      });

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Xóa cache profile công khai của user để đảm bảo tính nhất quán dữ liệu
      const userKey = `users:profile:${req.user.id}`;
      await cacheService.del(userKey).catch(() => {});

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          firebaseUid: updatedUser.firebase_uid,
          fullName: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatar_url,
          coverUrl: updatedUser.cover_url || '',
          role: updatedUser.role,
          status: updatedUser.status,
          isVerified: updatedUser.is_verified,
          isIdVerified: updatedUser.is_id_verified,
          bio: updatedUser.bio || '',
          headline: updatedUser.headline || '',
          skills: parseSkillsArray(updatedUser.skills),
          createdAt: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  /** GET /api/users/:userId/profile — public profile with stats (cached 5') */
  async getPublicProfile(req, res) {
    const { userId } = req.params;
    try {
      const userKey = `users:profile:${userId}`;

      // Cache-Aside với TTL 5 phút
      const profileData = await cacheService.getOrFetch(userKey, 300, async () => {
        const bundle = await userModel.getPublicProfileBundle(userId);
        if (!bundle) {
          const err = new Error('User not found');
          err.statusCode = 404;
          throw err;
        }

        const { user: dbUser, avgRating, reviewCount, completedJobsCount, postedJobsCount, serviceOffersCount, activePostsCount } = bundle;

        return {
          id: dbUser.id,
          fullName: dbUser.full_name,
          avatarUrl: dbUser.avatar_url,
          coverUrl: dbUser.cover_url || '',
          bio: dbUser.bio || '',
          headline: dbUser.headline || '',
          skills: parseSkillsArray(dbUser.skills),
          isVerified: dbUser.is_verified,
          isIdVerified: dbUser.is_id_verified,
          joinedAt: dbUser.created_at,
          ratingAverage: parseFloat(avgRating.toFixed(1)),
          reviewCount,
          completedJobsCount,
          postedJobsCount,
          serviceOffersCount,
          activePostsCount,
          publicStats: {
            posted: postedJobsCount,
            services: serviceOffersCount,
            completed: completedJobsCount,
            rating: parseFloat(avgRating.toFixed(1)),
          },
        };
      });

      res.json({ success: true, data: profileData });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      console.error('Get public profile error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  /** GET /api/users/:userId/profile/posts */
  async getPublicPosts(req, res) {
    const { userId } = req.params;
    const { type = 'RECRUITMENT', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const { rows, total } = await userModel.getPostsByUser(userId, {
        type, limit: parseInt(limit), offset,
      });

      const data = rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status.toUpperCase(),
        budgetMin: parseFloat(row.budget_min || 0),
        budgetMax: parseFloat(row.budget_max || 0),
        finalPrice: row.final_price ? parseFloat(row.final_price) : null,
        createdAt: row.created_at,
        postType: row.post_type,
        salaryUnit: row.salary_unit,
        categoryName: row.category_name,
        applicantCount: parseInt(row.applicant_count || 0),
        images: row.images,
      }));

      res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error('Get profile posts error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  /** GET /api/users/:userId/profile/reviews */
  async getPublicReviews(req, res) {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
      const { rows, total } = await userModel.getReviewsByUser(userId, {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      const data = rows.map(row => ({
        id: row.id,
        rating: parseFloat(row.rating),
        comment: row.comment,
        createdAt: row.created_at,
        reviewerName: row.reviewer_name,
        reviewerAvatar: row.reviewer_avatar,
        taskName: row.task_name,
      }));

      res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.warn('Get profile reviews unavailable:', error.message);
      res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
        },
      });
    }
  },

  /** PUT /api/users/role — deprecated, always resets to USER */
  async updateRole(req, res) {
    console.log('PUT /api/users/role is deprecated. Bypassing and returning USER.');
    try {
      const updatedUser = await userModel.resetRoleToUser(req.user.id);
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Role updated successfully (deprecated - always set to USER)',
        user: {
          id: updatedUser.id,
          firebaseUid: updatedUser.firebase_uid,
          fullName: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatar_url,
          role: updatedUser.role,
          status: updatedUser.status,
          isVerified: updatedUser.is_verified,
          createdAt: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  /** POST /api/users/upload-avatar */
  async uploadAvatar(req, res) {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    try {
      const uploadDir = ensureUploadDir();
      const filename = `${crypto.randomUUID()}.jpg`;
      saveBase64Image(uploadDir, base64Image, filename);

      const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      res.json({ success: true, message: 'Avatar uploaded successfully', avatarUrl });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ success: false, message: 'Server error during upload', error: error.message });
    }
  },

  /** POST /api/users/upload-cover */
  async uploadCover(req, res) {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    try {
      const uploadDir = ensureUploadDir();
      const filename = `cover_${crypto.randomUUID()}.jpg`;
      saveBase64Image(uploadDir, base64Image, filename);

      const coverUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      res.json({ success: true, message: 'Cover uploaded successfully', coverUrl });
    } catch (error) {
      console.error('Upload cover error:', error);
      res.status(500).json({ success: false, message: 'Server error during upload', error: error.message });
    }
  },

  /** POST /api/users/verify — CCCD verification (3 images) */
  async verifyIdentity(req, res) {
    const { frontImage, backImage, selfieImage } = req.body;

    if (!frontImage || !backImage || !selfieImage) {
      return res.status(400).json({
        success: false,
        message: 'All 3 verification images (front, back, selfie) are required.',
      });
    }

    try {
      const uploadDir = ensureUploadDir();
      const host = req.get('host');
      const protocol = req.protocol;

      const saveImage = (base64Str, typeName) => {
        const filename = `${crypto.randomUUID()}_${typeName}.jpg`;
        saveBase64Image(uploadDir, base64Str, filename);
        return `${protocol}://${host}/uploads/${filename}`;
      };

      const frontImageUrl = saveImage(frontImage, 'front');
      const backImageUrl = saveImage(backImage, 'back');
      const selfieImageUrl = saveImage(selfieImage, 'selfie');

      const updatedUser = await userModel.createVerification(req.user.id, {
        frontImageUrl, backImageUrl, selfieImageUrl,
      });

      res.json({
        success: true,
        message: 'Account verified successfully',
        user: {
          id: updatedUser.id,
          firebaseUid: updatedUser.firebase_uid,
          fullName: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatar_url,
          role: updatedUser.role,
          status: updatedUser.status,
          isVerified: updatedUser.is_verified,
          isIdVerified: updatedUser.is_id_verified,
          createdAt: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during account verification',
        error: error.message,
      });
    }
  },

  /** DELETE /api/users/profile — soft delete (BAN) */
  async deleteAccount(req, res) {
    try {
      const deleted = await userModel.softDeleteById(req.user.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'User not found or already deleted.' });
      }

      return res.json({
        success: true,
        message: 'Account deleted successfully.',
        user: deleted,
      });
    } catch (error) {
      console.error('Delete account error:', error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },
};

module.exports = userController;
