const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SnapOn API',
      version: '1.0.0',
      description: 'SnapOn — Nền tảng kết nối người thuê và người nhận việc. Flow A: Posting → Bidding → Matching',
      contact: {
        name: 'SnapOn Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: "https://snapon.onrender.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token or Custom JWT',
        },
      },
      schemas: {
        // ===== RESPONSE SCHEMAS =====
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: {},
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 50 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },

        // ===== DATA SCHEMAS =====
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            poster_id: { type: 'string', format: 'uuid' },
            category_id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Cần người mua thuốc giúp' },
            description: { type: 'string', example: 'Cần mua thuốc ở nhà thuốc Long Châu, giao đến địa chỉ...' },
            task_type: { type: 'string', enum: ['ONLINE', 'OFFLINE'], example: 'OFFLINE' },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'OPEN' },
            budget_min: { type: 'number', example: 50000 },
            budget_max: { type: 'number', example: 200000 },
            final_price: { type: 'number', nullable: true, example: null },
            deadline_start: { type: 'string', format: 'date-time', nullable: true },
            deadline_end: { type: 'string', format: 'date-time', nullable: true },
            allow_insurance: { type: 'boolean', example: false },
            category_name: { type: 'string', example: 'Việc vặt' },
            poster_name: { type: 'string', example: 'Nguyễn Văn A' },
            required_skills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
            },
            locations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  location_type: { type: 'string' },
                  address: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
            application_count: { type: 'integer', example: 3 },
          },
        },

        CreateTaskInput: {
          type: 'object',
          required: ['title', 'description', 'category_id', 'task_type', 'budget_min', 'budget_max'],
          properties: {
            title: { type: 'string', minLength: 5, maxLength: 255, example: 'Cần người dọn phòng trọ 20m²' },
            description: { type: 'string', minLength: 10, maxLength: 2000, example: 'Dọn dẹp phòng trọ bao gồm lau sàn, dọn bếp, sắp xếp đồ đạc. Phòng tại quận 7.' },
            category_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            task_type: { type: 'string', enum: ['ONLINE', 'OFFLINE'], example: 'OFFLINE' },
            budget_min: { type: 'number', minimum: 0, example: 100000 },
            budget_max: { type: 'number', minimum: 0, example: 300000 },
            deadline_start: { type: 'string', format: 'date-time', example: '2026-06-01T08:00:00Z' },
            deadline_end: { type: 'string', format: 'date-time', example: '2026-06-01T12:00:00Z' },
            allow_insurance: { type: 'boolean', example: false },
            skill_ids: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              example: [],
            },
            location: {
              type: 'object',
              properties: {
                location_type: { type: 'string', enum: ['TASK_LOCATION', 'MEETING_POINT'], example: 'TASK_LOCATION' },
                address: { type: 'string', example: '123 Nguyễn Văn Linh, Quận 7, TP.HCM' },
                latitude: { type: 'number', example: 10.7326 },
                longitude: { type: 'number', example: 106.7218 },
              },
            },
          },
        },

        Application: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            task_id: { type: 'string', format: 'uuid' },
            tasker_id: { type: 'string', format: 'uuid' },
            bid_price: { type: 'number', example: 150000 },
            estimated_time: { type: 'string', example: '2 giờ' },
            message: { type: 'string', example: 'Tôi có kinh nghiệm dọn phòng, có thể hoàn thành nhanh.' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'], example: 'PENDING' },
            tasker_name: { type: 'string', example: 'Trần Văn B' },
            tasker_avatar: { type: 'string', nullable: true },
            average_rating: { type: 'number', nullable: true, example: 4.5 },
          },
        },

        CreateApplicationInput: {
          type: 'object',
          required: ['bid_price'],
          properties: {
            bid_price: { type: 'number', minimum: 0.01, example: 150000 },
            estimated_time: { type: 'string', maxLength: 255, example: '2 giờ' },
            message: { type: 'string', maxLength: 1000, example: 'Tôi có kinh nghiệm 3 năm, sẵn sàng nhận việc ngay.' },
          },
        },

        RankedApplication: {
          type: 'object',
          properties: {
            applicationId: { type: 'string', format: 'uuid' },
            taskerId: { type: 'string', format: 'uuid' },
            taskerName: { type: 'string' },
            bidPrice: { type: 'number' },
            estimatedTime: { type: 'string' },
            message: { type: 'string' },
            scores: {
              type: 'object',
              properties: {
                price: { type: 'number', example: 0.50 },
                rating: { type: 'number', example: 0.90 },
                distance: { type: 'number', example: 0.75 },
                completionRate: { type: 'number', example: 0.80 },
                responseTime: { type: 'number', example: 0.65 },
                total: { type: 'number', example: 0.72 },
              },
            },
          },
        },

        AssignedTask: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            task_id: { type: 'string', format: 'uuid' },
            tasker_id: { type: 'string', format: 'uuid' },
            application_id: { type: 'string', format: 'uuid' },
            assigned_by: { type: 'string', enum: ['MANUAL', 'AUTO_MATCH'] },
            status: { type: 'string', example: 'ASSIGNED' },
          },
        },

        ManualMatchInput: {
          type: 'object',
          required: ['application_id'],
          properties: {
            application_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          },
        },

        WalletSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', example: 250000 },
            available_balance: { type: 'number', example: 200000 },
            pending_balance: { type: 'number', example: 50000 },
          },
        },

        WalletTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            wallet_id: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['topup', 'payment', 'refund', 'withdraw', 'earning', 'fee'],
              example: 'topup',
            },
            amount: { type: 'number', example: 100000 },
            status: {
              type: 'string',
              enum: ['pending', 'success', 'failed', 'cancelled'],
              example: 'success',
            },
            reference_id: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },

        WalletTopupMockInput: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', minimum: 0.01, example: 100000 },
          },
        },

        Escrow: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            task_id: { type: 'string', format: 'uuid' },
            poster_id: { type: 'string', format: 'uuid' },
            tasker_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 150000 },
            platform_fee_amount: { type: 'number', example: 15000 },
            insurance_fee_amount: { type: 'number', example: 0 },
            status: {
              type: 'string',
              enum: ['holding', 'released', 'refunded', 'disputed'],
              example: 'holding',
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },

        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firebaseUid: { type: 'string', nullable: true, example: 'firebase_uid_123' },
            fullName: { type: 'string', nullable: true, example: 'Nguyễn Văn A' },
            email: { type: 'string', nullable: true, example: 'a@example.com' },
            phone: { type: 'string', nullable: true, example: '0900000000' },
            avatarUrl: { type: 'string', nullable: true },
            status: { type: 'string', example: 'active' },
            isVerified: { type: 'boolean', example: false },
          },
        },

        UserDb: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firebase_uid: { type: 'string', example: 'firebase_uid_123' },
            email: { type: 'string', example: 'a@example.com' },
            full_name: { type: 'string', nullable: true, example: 'Nguyễn Văn A' },
            phone: { type: 'string', nullable: true },
            avatar_url: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['hirer', 'tasker', 'admin'], example: 'hirer' },
            status: { type: 'string', enum: ['active', 'inactive', 'banned'], example: 'active' },
            is_verified: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },

        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', example: 250000 },
            available_balance: { type: 'number', example: 200000 },
            pending_balance: { type: 'number', example: 50000 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },

        SyncUserResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'User synced successfully' },
            user: { $ref: '#/components/schemas/UserDb' },
            wallet: { $ref: '#/components/schemas/Wallet' },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },

        SyncUserInput: {
          type: 'object',
          properties: {
            firebaseToken: {
              type: 'string',
              description: 'Firebase ID token.',
              example: 'firebase-id-token-xyz123',
            },
          },
        },

        RefreshTokenInput: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },

        TokenPairResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Tokens refreshed successfully' },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },

        AuthSessionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            user: { $ref: '#/components/schemas/UserProfile' },
            wallet: { $ref: '#/components/schemas/Wallet' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },

        VerifyEmailInput: {
          type: 'object',
          required: ['email', 'token'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            token: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
          },
        },

        ResendVerificationInput: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          },
        },

        SendOtpInput: {
          type: 'object',
          required: ['phone'],
          properties: {
            phone: { type: 'string', example: '0900000000' },
          },
        },

        VerifyOtpInput: {
          type: 'object',
          required: ['phone', 'otp'],
          properties: {
            phone: { type: 'string', example: '0900000000' },
            otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
          },
        },

        AccountVerificationInput: {
          type: 'object',
          required: ['frontImage', 'backImage', 'selfieImage'],
          properties: {
            frontImage: {
              type: 'string',
              description: 'Base64 CCCD/ID front image. Accepts raw base64 or data:image/...;base64,...',
              example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            },
            backImage: {
              type: 'string',
              description: 'Base64 CCCD/ID back image. Accepts raw base64 or data:image/...;base64,...',
              example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            },
            selfieImage: {
              type: 'string',
              description: 'Base64 selfie image. Accepts raw base64 or data:image/...;base64,...',
              example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            },
          },
        },

        UserVerifyResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account verified successfully' },
            user: { $ref: '#/components/schemas/UserProfile' },
          },
        },

        UpdateStatusInput: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
              example: 'CANCELLED',
            },
          },
        },
        Banner: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'HOME_CONTENT' },
            title: { type: 'string', example: 'Biến ý tưởng thành nội dung thu hút' },
            subtitle: { type: 'string', example: 'Tìm người viết bài, sáng tạo nội dung và hỗ trợ truyền thông.' },
            imageUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800' },
            category: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                code: { type: 'string', example: 'CONTENT' },
                name: { type: 'string', example: 'Content' }
              }
            },
            action: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['CATEGORY', 'EXTERNAL_URL', 'NONE'], example: 'CATEGORY' },
                value: { type: 'string', example: 'category-uuid' }
              }
            },
            displayOrder: { type: 'integer', example: 1 },
            isActive: { type: 'boolean', example: true },
            placement: { type: 'string', enum: ['HOME_FEATURED', 'HOME_TOP'], example: 'HOME_FEATURED' },
            startAt: { type: 'string', format: 'date-time', nullable: true },
            endAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateBannerInput: {
          type: 'object',
          required: ['code', 'title', 'imageUrl', 'categoryId', 'placement', 'actionType', 'displayOrder'],
          properties: {
            code: { type: 'string', example: 'HOME_CONTENT' },
            title: { type: 'string', example: 'Biến ý tưởng thành nội dung thu hút' },
            subtitle: { type: 'string', example: 'Tìm người viết bài...' },
            imageUrl: { type: 'string', format: 'url', example: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800' },
            categoryId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            placement: { type: 'string', enum: ['HOME_FEATURED', 'HOME_TOP'], example: 'HOME_FEATURED' },
            actionType: { type: 'string', enum: ['CATEGORY', 'EXTERNAL_URL', 'NONE'], example: 'CATEGORY' },
            actionValue: { type: 'string', example: 'category-uuid' },
            displayOrder: { type: 'integer', minimum: 1, example: 1 },
            isActive: { type: 'boolean', default: true, example: true },
            startAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-06-15T00:00:00Z' },
            endAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-06-20T00:00:00Z' }
          }
        },
        UpdateBannerInput: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'HOME_CONTENT' },
            title: { type: 'string', example: 'Biến ý tưởng thành nội dung thu hút' },
            subtitle: { type: 'string', example: 'Tìm người viết bài...' },
            imageUrl: { type: 'string', format: 'url', example: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800' },
            categoryId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            placement: { type: 'string', enum: ['HOME_FEATURED', 'HOME_TOP'], example: 'HOME_FEATURED' },
            actionType: { type: 'string', enum: ['CATEGORY', 'EXTERNAL_URL', 'NONE'], example: 'CATEGORY' },
            actionValue: { type: 'string', example: 'category-uuid' },
            displayOrder: { type: 'integer', minimum: 1, example: 1 },
            isActive: { type: 'boolean', example: true },
            startAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-06-15T00:00:00Z' },
            endAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-06-20T00:00:00Z' }
          }
        }
      },
    },
    security: [
      { BearerAuth: [] },
    ],
  },
  apis: ['./config/swagger-docs.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
