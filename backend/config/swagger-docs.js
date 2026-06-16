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

/**
 * @swagger
 * /api/wallet/topup/payos/create:
 *   post:
 *     tags: [Wallet]
 *     summary: Tạo link thanh toán PayOS
 *     description: |
 *       Tạo yêu cầu nạp tiền qua cổng thanh toán PayOS.
 *       Trả về checkoutUrl để redirect user đến trang thanh toán.
 *       Minimum amount: 1,000 VND.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1000
 *                 example: 100000
 *     responses:
 *       200:
 *         description: Tạo link thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkoutUrl:
 *                       type: string
 *                       example: https://payos.vn/checkout/...
 *                     orderCode:
 *                       type: integer
 *                       example: 123456
 *       400:
 *         description: Amount không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/wallet/topup/payos/webhook:
 *   post:
 *     tags: [Wallet]
 *     summary: (Webhook) PayOS xác nhận thanh toán
 *     description: |
 *       PayOS gọi webhook này khi có thay đổi trạng thái thanh toán.
 *       Không yêu cầu auth — PayOS ký request bằng checksum key.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderCode:
 *                 type: integer
 *                 example: 123456
 *               status:
 *                 type: string
 *                 example: PAID
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */

/**
 * @swagger
 * /api/wallet/topup/payos/status/{orderCode}:
 *   get:
 *     tags: [Wallet]
 *     summary: Kiểm tra trạng thái thanh toán PayOS
 *     description: Kiểm tra trạng thái của một giao dịch PayOS theo orderCode.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng từ PayOS
 *     responses:
 *       200:
 *         description: Trạng thái giao dịch
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
 *                     status:
 *                       type: string
 *                       enum: [PENDING, SUCCESS, FAILED]
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy giao dịch
 */

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     tags: [Wallet]
 *     summary: Rút tiền từ ví về tài khoản ngân hàng
 *     description: |
 *       Tạo yêu cầu rút tiền. Số tiền sẽ bị trừ khỏi available_balance
 *       và chuyển sang pending. Admin sẽ xử lý yêu cầu sau.
 *       Minimum amount: 10,000 VND.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, bankName, bankAccountNumber]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10000
 *                 example: 50000
 *               bankName:
 *                 type: string
 *                 example: Vietcombank
 *               bankAccountNumber:
 *                 type: string
 *                 example: 0123456789
 *     responses:
 *       200:
 *         description: Tạo yêu cầu rút tiền thành công
 *       400:
 *         description: Số dư không đủ hoặc dữ liệu không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/wallet/withdraw:
 *   get:
 *     tags: [Wallet]
 *     summary: 'Danh sách yêu cầu rút tiền (Admin)'
 *     description: |
 *       Admin xem tất cả yêu cầu rút tiền. Có thể lọc theo status.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, PAID, PROCESSING, FAILED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu rút tiền
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/wallet/withdraw/{id}:
 *   get:
 *     tags: [Wallet]
 *     summary: Chi tiết yêu cầu rút tiền
 *     description: Xem chi tiết một yêu cầu rút tiền
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
 *         description: ID của yêu cầu rút tiền
 *     responses:
 *       200:
 *         description: Chi tiết yêu cầu rút tiền
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/wallet/withdraw/{id}/approve:
 *   post:
 *     tags: [Wallet]
 *     summary: 'Duyệt yêu cầu rút tiền và gọi PayOS payout (Admin)'
 *     description: |
 *       Admin duyệt yêu cầu rút tiền. Hệ thống sẽ gọi PayOS Payout API
 *       để chuyển tiền vào tài khoản ngân hàng của user.
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
 *         description: ID của yêu cầu rút tiền
 *     responses:
 *       200:
 *         description: Duyệt thành công, đã gọi PayOS payout
 *       400:
 *         description: Không thể duyệt (sai trạng thái hoặc không tìm thấy bank BIN)
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền admin
 *       502:
 *         description: Lỗi PayOS payout
 */

/**
 * @swagger
 * /api/wallet/withdraw/{id}/reject:
 *   post:
 *     tags: [Wallet]
 *     summary: 'Từ chối yêu cầu rút tiền và hoàn tiền vào ví (Admin)'
 *     description: |
 *       Admin từ chối yêu cầu rút tiền. Số tiền sẽ được hoàn lại
 *       vào available_balance của user.
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
 *         description: ID của yêu cầu rút tiền
 *     responses:
 *       200:
 *         description: Từ chối thành công, đã hoàn tiền
 *       400:
 *         description: Không thể từ chối (sai trạng thái)
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/wallet/payout/webhook:
 *   post:
 *     tags: [Wallet]
 *     summary: Webhook nhận kết quả payout từ PayOS
 *     description: |
 *       PayOS gọi webhook này khi có kết quả payout (thành công hoặc thất bại).
 *       Hệ thống sẽ cập nhật trạng thái yêu cầu rút tiền tương ứng.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: PayOS payout ID
 *               referenceId:
 *                 type: string
 *                 description: ID của yêu cầu rút tiền (withdrawal_id)
 *               approvalState:
 *                 type: string
 *                 enum: [COMPLETED, FAILED, PROCESSING]
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     state:
 *                       type: string
 *                       enum: [SUCCEEDED, FAILED]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Cập nhật profile user
 *     description: Cập nhật thông tin cá nhân (fullName, phone, avatarUrl).
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               phone:
 *                 type: string
 *                 example: 0900000000
 *               avatarUrl:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: User không tồn tại
 *
 *   delete:
 *     tags: [Users]
 *     summary: Xoá tài khoản (soft-delete)
 *     description: |
 *       Soft-delete user bằng cách set status = BANNED.
 *       User bị xoá không thể đăng nhập lại.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Xoá tài khoản thành công
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
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: BANNED
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: User không tìm thấy hoặc đã bị xoá
 */

/**
 * @swagger
 * /api/users/role:
 *   put:
 *     tags: [Users]
 *     summary: Đổi vai trò (hirer / tasker)
 *     description: Chuyển đổi role giữa hirer và tasker.
 *     security:
 *       - DevAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [hirer, tasker]
 *                 example: tasker
 *     responses:
 *       200:
 *         description: Đổi role thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Role không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/auth/dev/login:
 *   post:
 *     tags: [Auth]
 *     summary: (DEV) Đăng nhập không cần Firebase
 *     description: |
 *       DEV-only endpoint. Tìm user theo email và trả về token (user UUID).
 *       Dùng token này làm Bearer token hoặc x-user-id header.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dev@snapon.vn
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserDb'
 *       400:
 *         description: Email không hợp lệ
 *       404:
 *         description: User không tồn tại
 */

/**
 * @swagger
 * /api/auth/dev/register:
 *   post:
 *     tags: [Auth]
 *     summary: (DEV) Đăng ký không cần Firebase
 *     description: |
 *       DEV-only endpoint. Tạo user mới + wallet mà không cần Firebase.
 *       Trả về token (user UUID) để xác thực.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dev@snapon.vn
 *               fullName:
 *                 type: string
 *                 example: Dev User
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserDb'
 *       400:
 *         description: Email không hợp lệ
 *       409:
 *         description: Email đã tồn tại
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Cập nhật thông tin task
 *     description: |
 *       Chỉ owner mới được cập nhật task.
 *       Không thể cập nhật task đã COMPLETED hoặc CANCELLED.
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget_min:
 *                 type: number
 *               budget_max:
 *                 type: number
 *               deadline_end:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không phải owner
 *       404:
 *         description: Task không tồn tại
 *
 *   delete:
 *     tags: [Tasks]
 *     summary: Xoá task
 *     description: |
 *       Chỉ owner mới được xoá task.
 *       Chỉ xoá được task ở trạng thái OPEN.
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
 *     responses:
 *       200:
 *         description: Xoá task thành công
 *       403:
 *         description: Không phải owner
 *       404:
 *         description: Task không tồn tại
 */

/**
 * @swagger
 * /api/applications/{id}:
 *   patch:
 *     tags: [Applications (Bidding)]
 *     summary: Cập nhật application (bid)
 *     description: |
 *       Tasker cập nhật bid đã gửi (giá, tin nhắn, thời gian).
 *       Chỉ cập nhật được khi status = PENDING.
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
 *             type: object
 *             properties:
 *               bid_price:
 *                 type: number
 *                 example: 150000
 *               estimated_time:
 *                 type: string
 *                 example: 3 giờ
 *               message:
 *                 type: string
 *                 example: Tôi đã sẵn sàng nhận việc
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không phải owner
 *       404:
 *         description: Application không tồn tại
 *
 *   delete:
 *     tags: [Applications (Bidding)]
 *     summary: Xoá application (bid)
 *     description: |
 *       Tasker xoá bid đã gửi.
 *       Chỉ xoá được khi status = PENDING.
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
 *     responses:
 *       200:
 *         description: Xoá thành công
 *       403:
 *         description: Không phải owner
 *       404:
 *         description: Application không tồn tại
 */

/**
 * @swagger
 * /api/escrows/{taskId}:
 *   delete:
 *     tags: [Escrow]
 *     summary: Xoá escrow theo taskId
 *     description: |
 *       Xoá escrow gắn với task. Chỉ poster hoặc tasker mới xoá được.
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
 *         description: Xoá escrow thành công
 *       403:
 *         description: Không có quyền xoá
 *       404:
 *         description: Escrow không tồn tại
 *       401:
 *         description: Chưa xác thực
 */
