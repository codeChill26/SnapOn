/**
 * Swagger API Documentation — JSDoc annotations
 * Tất cả endpoint definitions cho swagger-jsdoc
 */

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Kiểm tra server
 *     description: Endpoint kiểm tra API có đang chạy không
 *     responses:
 *       200:
 *         description: Server đang chạy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: SnapOn API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

// ==========================================
// TASKS
// ==========================================

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Tạo task mới (Poster)
 *     description: |
 *       Poster tạo bài đăng công việc mới.
 *       Task sẽ có status = OPEN sau khi tạo.
 *       Có thể đính kèm skills và location.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Task tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task created successfully.
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Danh sách tasks
 *     description: |
 *       Lấy danh sách tất cả tasks với filter và phân trang.
 *       Hỗ trợ tìm kiếm theo title/description.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo category
 *       - in: query
 *         name: task_type
 *         schema:
 *           type: string
 *           enum: [ONLINE, OFFLINE]
 *         description: Lọc theo loại task
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo title hoặc description
 *     responses:
 *       200:
 *         description: Danh sách tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/tasks/my-tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Tasks của tôi (Poster)
 *     description: Lấy danh sách tasks do chính user hiện tại tạo
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách tasks của poster
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Chi tiết task
 *     description: Lấy thông tin chi tiết 1 task (bao gồm skills, locations, số lượng applications)
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của task
 *     responses:
 *       200:
 *         description: Chi tiết task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task không tồn tại
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Cập nhật trạng thái task
 *     description: |
 *       Poster cập nhật trạng thái task (chỉ owner mới được).
 *       
 *       Quy tắc chuyển trạng thái:
 *       - OPEN → CANCELLED
 *       - IN_PROGRESS → COMPLETED, CANCELLED
 *       - COMPLETED → (không thể chuyển)
 *       - CANCELLED → (không thể chuyển)
 *
 *       **Escrow side-effects** (tự động):
 *       - IN_PROGRESS → COMPLETED: release escrow (chuyển tiền cho tasker)
 *       - IN_PROGRESS → CANCELLED: refund escrow (trả lại tiền cho poster)
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusInput'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không thể chuyển trạng thái
 *       403:
 *         description: Không phải owner
 *       404:
 *         description: Task không tồn tại
 */

// ==========================================
// APPLICATIONS (BIDDING)
// ==========================================

/**
 * @swagger
 * /api/tasks/{taskId}/applications:
 *   post:
 *     tags: [Applications (Bidding)]
 *     summary: Đấu giá nhận việc (Tasker)
 *     description: |
 *       Tasker gửi bid (đấu giá) cho 1 task.
 *       
 *       Điều kiện:
 *       - Task phải có status = OPEN
 *       - Tasker không được bid task của chính mình
 *       - Chưa bid task này trước đó
 *       - bid_price phải nằm trong khoảng budget_min ~ budget_max
 *       - Tasker phải có tasker_profile
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của task cần bid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApplicationInput'
 *     responses:
 *       201:
 *         description: Bid thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Application submitted successfully.
 *                 data:
 *                   $ref: '#/components/schemas/Application'
 *       400:
 *         description: Vi phạm business rule (task không OPEN, bid vượt budget, v.v.)
 *       404:
 *         description: Task không tồn tại
 *       409:
 *         description: Đã bid task này rồi
 */

/**
 * @swagger
 * /api/tasks/{taskId}/applications:
 *   get:
 *     tags: [Applications (Bidding)]
 *     summary: Danh sách bids cho task (Poster)
 *     description: Poster xem tất cả applications/bids cho task của mình
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Danh sách bids
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *       403:
 *         description: Không phải owner của task
 *       404:
 *         description: Task không tồn tại
 */

/**
 * @swagger
 * /api/applications/{id}/withdraw:
 *   patch:
 *     tags: [Applications (Bidding)]
 *     summary: Rút bid (Tasker)
 *     description: |
 *       Tasker rút lại bid đã gửi.
 *       Chỉ rút được khi status = PENDING.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID của application
 *     responses:
 *       200:
 *         description: Rút bid thành công
 *       400:
 *         description: Application không ở trạng thái PENDING
 *       403:
 *         description: Không phải owner của application
 *       404:
 *         description: Application không tồn tại
 */

// ==========================================
// MATCHING
// ==========================================

/**
 * @swagger
 * /api/tasks/{taskId}/auto-match:
 *   post:
 *     tags: [Matching]
 *     summary: Auto-match (Hệ thống tự chọn)
 *     description: |
 *       Hệ thống tự động chọn tasker phù hợp nhất dựa trên thuật toán scoring:
 *       
 *       **Score = 30% Giá + 25% Rating + 20% Khoảng cách + 15% Tỷ lệ hoàn thành + 10% Thời gian phản hồi**
 *       
 *       Sau khi match:
 *       - Tạo record assigned_tasks
 *       - HOLD escrow (khóa tiền của poster vào pending)
 *       - Task status → IN_PROGRESS
 *       - Application được chọn → ACCEPTED
 *       - Các application còn lại → REJECTED
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Match thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Auto-match completed successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignedTask:
 *                       $ref: '#/components/schemas/AssignedTask'
 *                     matchedTasker:
 *                       $ref: '#/components/schemas/RankedApplication'
 *                     escrow:
 *                       $ref: '#/components/schemas/Escrow'
 *       400:
 *         description: Task không OPEN hoặc không có applications
 *       403:
 *         description: Không phải owner
 *       409:
 *         description: Task đã được assign
 */

/**
 * @swagger
 * /api/tasks/{taskId}/manual-match:
 *   post:
 *     tags: [Matching]
 *     summary: Manual-match (Poster tự chọn)
 *     description: |
 *       Poster chọn thủ công 1 application cụ thể.
 *       
 *       Sau khi match:
 *       - Tạo record assigned_tasks
 *       - HOLD escrow (khóa tiền của poster vào pending)
 *       - Task status → IN_PROGRESS
 *       - Application được chọn → ACCEPTED
 *       - Các application còn lại → REJECTED
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManualMatchInput'
 *     responses:
 *       200:
 *         description: Match thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignedTask:
 *                       $ref: '#/components/schemas/AssignedTask'
 *                     selectedApplication:
 *                       $ref: '#/components/schemas/Application'
 *                     escrow:
 *                       $ref: '#/components/schemas/Escrow'
 *       400:
 *         description: Task không OPEN hoặc application không hợp lệ
 *       403:
 *         description: Không phải owner
 *       409:
 *         description: Task đã được assign
 */

/**
 * @swagger
 * /api/tasks/{taskId}/ranked-applications:
 *   get:
 *     tags: [Matching]
 *     summary: Xếp hạng bids theo score
 *     description: |
 *       Poster xem danh sách applications được xếp hạng theo thuật toán matching.
 *       Hiển thị điểm chi tiết từng tiêu chí.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Danh sách ranked applications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RankedApplication'
 *       403:
 *         description: Không phải owner
 *       404:
 *         description: Task không tồn tại
 */

// ==========================================
// WALLET
// ==========================================

/**
 * @swagger
 * /api/wallet/me:
 *   get:
 *     tags: [Wallet]
 *     summary: Ví của tôi
 *     description: Lấy số dư ví của user hiện tại.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy ví thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Wallet retrieved successfully.
 *                 data:
 *                   $ref: '#/components/schemas/WalletSummary'
 *       401:
 *         description: Chưa xác thực
 */

// ==========================================
// ESCROW
// ==========================================

/**
 * @swagger
 * /api/escrows/me:
 *   get:
 *     tags: [Escrow]
 *     summary: Danh sách escrow của tôi
 *     description: |
 *       Lấy danh sách escrows mà user hiện tại là poster hoặc tasker.
 *       Hỗ trợ filter theo role/status và phân trang đơn giản.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [all, poster, tasker]
 *           default: all
 *         description: Lọc theo vai trò của user trong escrow
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [holding, released, refunded, disputed]
 *         description: Lọc theo trạng thái escrow
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Số lượng bản ghi
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Escrow id để lấy trang tiếp theo
 *     responses:
 *       200:
 *         description: Danh sách escrow
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Escrows retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Escrow'
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/escrows/{taskId}:
 *   get:
 *     tags: [Escrow]
 *     summary: Lấy escrow theo taskId
 *     description: |
 *       Lấy thông tin escrow gắn với 1 task.
 *       Chỉ poster hoặc tasker của escrow mới xem được.
 *
 *       Lưu ý: `taskId` là id của task (không phải escrow id).
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lấy escrow thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Escrow retrieved successfully.
 *                 data:
 *                   $ref: '#/components/schemas/Escrow'
 *       403:
 *         description: Không có quyền xem escrow này
 *       404:
 *         description: Không tìm thấy escrow cho task
 *       401:
 *         description: Chưa xác thực
 */

// ==========================================
// USERS
// ==========================================

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Profile user hiện tại
 *     description: Trả về thông tin user sau khi authenticate.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User authenticated successfully
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Chưa xác thực
 */

// ==========================================
// AUTH
// ==========================================

/**
 * @swagger
 * /api/auth/sync-user:
 *   post:
 *     tags: [Auth]
 *     summary: Sync user từ Firebase vào DB
 *     description: |
 *       Dùng Firebase ID token để đồng bộ user vào database (upsert theo firebase_uid)
 *       và tự tạo wallet (nếu chưa có).
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sync thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncUserResponse'
 *       400:
 *         description: Firebase user thiếu uid/email
 *       401:
 *         description: Chưa xác thực
 *       500:
 *         description: Sync user failed
 */

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     tags: [Wallet]
 *     summary: Lịch sử giao dịch ví
 *     description: |
 *       Danh sách giao dịch của ví hiện tại (order theo created_at DESC).
 *       Cursor là `id` của transaction để phân trang.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Số lượng bản ghi
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Transaction id để lấy trang tiếp theo
 *     responses:
 *       200:
 *         description: Danh sách giao dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Wallet transactions retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WalletTransaction'
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/wallet/topup/mock:
 *   post:
 *     tags: [Wallet]
 *     summary: (DEV) Nạp tiền giả lập
 *     description: |
 *       DEV-only endpoint để cộng tiền vào ví (available_balance).
 *       Không dùng cho production.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletTopupMockInput'
 *     responses:
 *       200:
 *         description: Topup thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Topup successful.
 *                 data:
 *                   $ref: '#/components/schemas/WalletSummary'
 *       400:
 *         description: Amount không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
