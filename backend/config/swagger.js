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
    ],
    components: {
      securitySchemes: {
        DevAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'DEV MODE: Truyền UUID của user để xác thực (không cần Firebase token)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'PRODUCTION: Firebase ID Token',
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
      },
    },
    security: [
      { DevAuth: [] },
    ],
  },
  apis: ['./config/swagger-docs.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
