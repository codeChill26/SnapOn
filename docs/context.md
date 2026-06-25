# Bối Cảnh Dự Án SnapOn

Tài liệu này là nguồn bối cảnh kỹ thuật và nghiệp vụ cho dự án SnapOn. Nội dung được cập nhật dựa trên code hiện có trong repository, không chỉ dựa trên ý tưởng sản phẩm hay roadmap. Mục tiêu là giúp thành viên mới và AI coding assistant hiểu nhanh kiến trúc, luồng dữ liệu, API, client web/mobile và các cảnh báo quan trọng trước khi sửa code.

Cập nhật gần nhất: 2026-06-20.

## 1. Tóm Tắt Dự Án

SnapOn là nền tảng marketplace kết nối người đăng việc/dịch vụ với người làm việc tự do. Sản phẩm có các luồng chính:

- Người dùng đăng ký/đăng nhập, cập nhật hồ sơ, xác minh tài khoản.
- Người đăng việc tạo bài đăng tuyển dụng hoặc service offer.
- Người làm ứng tuyển/bid vào task.
- Chủ bài đăng chọn ứng viên thủ công hoặc auto-match.
- Hệ thống tạo assignment và escrow khi match.
- Ví điện tử hỗ trợ nạp tiền, lịch sử giao dịch, rút tiền.
- Chat realtime giữa người dùng, có ảnh đính kèm, read receipt và push token.
- Mobile app là client đầy đủ nhất; web app vẫn còn một số state optimistic và UI demo.

Lưu ý quan trọng: Context cũ mô tả nhiều tính năng như escrow trừ tiền đầy đủ, OCR thật, dispute admin, CI/CD, KPI kinh doanh. Code hiện tại mới thực hiện một phần. Tài liệu này phân biệt rõ "đã có trong code" và "khoảng trống cần lưu ý".

## 2. Cấu Trúc Repository

```text
SnapOn/
  backend/              Express API, Socket.IO, Prisma/pg, Swagger, scripts DB
  frontend/             React + Vite web client
  mobile/               Expo React Native mobile client
  docs/                 Tài liệu dự án hiện tại
  doc/                  Hướng dẫn kỹ thuật cũ/phụ trợ
  docker-compose.yml    Postgres local, mount backend/createdb.txt
  README.md             Hướng dẫn tổng quan, một số tên folder đã cũ
```

Thư mục cần đọc trước khi sửa:

- `backend/app.js`: entrypoint Express, routes, middleware, Socket.IO.
- `backend/routes/*`: API surface thật sự.
- `backend/controllers/*`: validation nghiệp vụ và điều phối response.
- `backend/services/*`: logic domain như matching, escrow, wallet, socket.
- `backend/models/*`: raw SQL query bằng `pg`.
- `backend/prisma/schema.prisma`: Prisma schema hiện tại.
- `frontend/src/app/context/AppContext.tsx`: state trung tâm web.
- `frontend/src/services/api.ts`: axios client web.
- `mobile/src/services/*`: service layer mobile gọi API.
- `mobile/src/navigation/*`: route tree mobile.

## 3. Tech Stack

### Backend

- Node.js + Express 4.
- PostgreSQL, kết nối bằng `pg` Pool trong `backend/config/db.js`.
- Prisma Client v7 + `@prisma/adapter-pg`, chủ yếu đang dùng cho chat và push token.
- Socket.IO cho realtime events.
- Firebase Admin SDK cho auth production, có dev fallback.
- PayOS cho topup, có mock mode khi thiếu credentials.
- Cloudinary upload ảnh task/chat nếu có env Cloudinary.
- Swagger UI tại `/api-docs`.

### Frontend Web

- React + Vite + TypeScript.
- React Router 7.
- Tailwind CSS v4, Radix/shadcn style components, MUI packages, lucide-react.
- Axios client ở `frontend/src/services/api.ts`.
- Firebase Client SDK, có fallback khi thiếu config.
- Leaflet/OpenStreetMap/Nominatim cho map/address search.
- State chính nằm trong React Context.

### Mobile

- Expo + React Native + TypeScript.
- React Navigation native stack + bottom tabs.
- AsyncStorage/SecureStore style storage qua helper riêng.
- Axios service layer riêng.
- Socket.IO client.
- Expo Notifications, Image Picker, Location, react-native-maps.
- Firebase client config đang nằm trong `mobile/src/constants/config.ts`.

## 4. Cách Chạy Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Mặc định backend chạy ở `http://localhost:3000`.

- Health: `GET http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api-docs`
- DB ping: `npm run db:ping`
- List tables: `npm run db:tables`
- Prisma generate: `npm run prisma:generate`
- Prisma pull: `npm run prisma:pull`

`DATABASE_URL` gần như bắt buộc vì `backend/db/prisma.js` được import khi load chat/user routes. `config/db.js` có fallback sang biến DB riêng, nhưng Prisma sẽ throw nếu không có `DATABASE_URL`.

### Frontend Web

```bash
cd frontend
npm install
npm run dev
```

Mặc định Vite thường chạy ở `http://localhost:5173`. API base lấy từ `VITE_API_BASE_URL`, fallback là `http://localhost:3000/api`.

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Mobile dev API hiện được hardcode trong `mobile/src/constants/config.ts`:

- `LOCAL_API_URL = http://192.168.1.89:3000/api`
- `DEPLOYED_API_URL = https://snapon.onrender.com/api`

Khi đổi máy/mạng, cần sửa IP local cho đúng địa chỉ backend có thể truy cập từ thiết bị.

### Docker

`docker-compose.yml` chỉ dùng để chạy Postgres local và mount `backend/createdb.txt` làm init SQL. Cần cảnh giác vì `createdb.txt` đang khai báo enum lowercase, trong khi code và `schema.prisma` hiện chủ yếu dùng UPPERCASE. Nếu dùng Docker init bằng file này, backend có nguy cơ lỗi enum/status.

## 5. Backend Architecture

`backend/app.js` cấu hình:

- `helmet`, `cors`, `morgan`, `express.json`, `cookie-parser`.
- Static uploads tại `/uploads`.
- Swagger UI tại `/api-docs`.
- Socket.IO server dùng chung HTTP server.
- Routes:
  - `/api/tasks`
  - `/api/activities`
  - `/api` cho applications, matching, banners, categories
  - `/api/wallet`
  - `/api/escrows`
  - `/api/chat`
  - `/api/users`
  - `/api/auth`
  - `/api/assignments`

Pattern chính:

- Route khai báo endpoint + middleware auth/validate.
- Controller check ownership, validate nghiệp vụ, gọi model/service.
- Model chứa raw SQL bằng `pg`.
- Service chứa transaction/domain orchestration.
- Response chuẩn qua `utils/responseHandler.js`:
  - success: `{ success: true, message, data }`
  - error: `{ success: false, message, errors? }`
  - paginated: `{ success: true, message, data, pagination }`

Không phải tất cả code đều theo cùng một pattern: `routes/users.js` còn query SQL trực tiếp trong route handler; chat dùng Prisma thay vì raw `pg`.

## 6. Authentication

Middleware chính: `backend/middleware/auth.js`.

### Firebase mode

- Mặc định `AUTH_MODE=firebase`.
- Backend verify `Authorization: Bearer <Firebase ID token>` bằng Firebase Admin.
- `/api/auth/sync-user` nhận Firebase token, upsert user theo email/firebase_uid và tạo wallet nếu chưa có.
- Request thường tìm user bằng `firebase_uid`.

### Dev mode

Backend tự fallback sang dev mode nếu thiếu Firebase config, hoặc set `AUTH_MODE=dev`.

Trong dev mode:

- Request thường dùng `x-user-id: <user_uuid>` hoặc `Authorization: Bearer <user_uuid>`.
- `/api/auth/dev/login` login bằng email, trả về `token = user.id`.
- `/api/auth/dev/register` tạo user + wallet, trả về `token = user.id`.
- `/api/auth/sync-user` có thể decode Firebase JWT payload không verify hoặc dùng `x-user-id`.

### OTP flow

- `POST /api/auth/send-otp`: mô phỏng gửi OTP, OTP cố định `123456`.
- `POST /api/auth/verify-otp`: tạo/tìm user bằng phone, tạo wallet và tasker profile nếu user mới, trả về token là user id.

### Role

DB hiện có field `users.role` đang là string trong Prisma, default `USER`. Web/mobile vẫn có concept `hirer`, `worker`, `admin` ở UI. Endpoint `PUT /api/users/role` đang deprecated và luôn set role về `USER`.

Admin routes như `/api/admin/banners` dùng `authorize('admin')`, nên muốn vào admin thật cần có user role `admin` trong DB bằng cách set trực tiếp hoặc seed riêng.

## 7. Database And Data Model

### Source of truth cảnh báo

Repo đang có nhiều mô tả schema:

- `backend/prisma/schema.prisma`: schema đang gần với DB hiện tại và Prisma Client.
- `backend/createdb.txt`: SQL init local cũ, enum lowercase.
- `doc/WALLET_ESCROW_GUIDE.md`: hướng dẫn/khuyến nghị, một phần chưa khớp code hiện tại.

Khi sửa DB, không được mặc định tất cả các file trên đồng bộ. Hãy kiểm tra DB thực tế bằng `npm run db:tables`, Prisma pull, hoặc query enum trong Postgres.

### Bảng chính

- `users`: tài khoản người dùng, Firebase UID, profile cơ bản, role string, status, verification flag.
- `user_verifications`, `verification_documents`: log xác minh giấy tờ và ảnh.
- `tasker_profiles`: thông tin năng lực/địa điểm/rating của tasker.
- `categories`, `skills`: level 1 category và level 2 skill/subcategory.
- `tasks`: bài đăng việc/service offer, budget, deadline, location mode, recruitment fields.
- `task_required_skills`: many-to-many task-skill.
- `task_locations`: địa điểm task.
- `saved_tasks`: task user đã lưu.
- `task_applications`: đơn ứng tuyển/bid.
- `assigned_tasks`: assignment sau khi tasker được chọn.
- `wallets`: `balance`, `available_balance`, `locked_balance`.
- `wallet_transactions`: ledger cho deposit/withdraw/escrow/refund/fee.
- `escrows`: escrow theo task, poster, tasker, amount, fee, status.
- `payments`, `withdraw_requests`: thanh toán và yêu cầu rút tiền.
- `reviews`, `review_criteria`, `review_selected_criteria`: đánh giá.
- `reports`: báo cáo vi phạm.
- `conversations`, `messages`, `push_tokens`: chat và push notification.
- `banners`: banner home/admin.

### Enum/status hiện code đang dùng

Code backend dùng UPPERCASE:

- Task: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, thêm `CLOSED`, `EXPIRED` trong Prisma.
- Application: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`; app-level có `WITHDRAWN` map sang `CANCELLED`.
- Assigned task: `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Escrow: `HOLDING`, `RELEASED`, `REFUNDED`, `DISPUTED`.
- Wallet transaction: `DEPOSIT`, `WITHDRAW`, `ESCROW_HOLD`, `ESCROW_RELEASE`, `REFUND`, `PLATFORM_FEE`.

Cảnh báo: `backend/createdb.txt` dùng lowercase enum như `open`, `holding`, `topup`. Nếu DB local tạo từ file này, raw SQL trong code có thể lỗi vì insert/update bằng UPPERCASE.

## 8. Core Business Flows

### 8.1 Sync user và profile

1. Client đăng nhập bằng Firebase, dev login hoặc OTP.
2. Backend tạo/tìm user trong `users`.
3. Backend tạo wallet nếu chưa có.
4. Profile APIs:
   - `GET /api/users/profile`
   - `PUT /api/users/profile`
   - upload avatar/cover lưu vào `backend/public/uploads`
   - verification upload 3 ảnh và auto approve user trong code hiện tại.

### 8.2 Đăng việc

Endpoint: `POST /api/tasks`.

Yêu cầu chính:

- `title`, `description`, `category_id`, `skill_ids` bắt buộc.
- `budget_min` bắt buộc; `budget_max` tùy payload.
- Nếu `work_mode = ONSITE`, cần `location.address`.
- Nếu `post_type = RECRUITMENT`, cần `people_needed >= 1`, `contact_phone`, `start_date` không nằm trong quá khứ.
- `SERVICE_OFFER` bỏ một số field recruitment như gender/age/height.
- `category_id` có thể là UUID hoặc slug; `skill_ids` phải thuộc category.

Task tạo xong sẽ thêm required skills, location, rồi trả về task đầy đủ.

### 8.3 Tìm và lưu task

Endpoints:

- `GET /api/tasks`: filter theo status, field/category/skill, task type, search, post type, work mode, salary unit, pagination.
- `GET /api/tasks/:id`: chi tiết task, required skills, locations, applicant count, assigned worker, is_saved.
- `GET /api/tasks/saved`
- `POST /api/tasks/:id/save`
- `DELETE /api/tasks/:id/save`

### 8.4 Ứng tuyển/bidding

Endpoint: `POST /api/tasks/:taskId/applications`.

Controller kiểm tra:

- Task tồn tại và status `OPEN`.
- Tasker không phải poster.
- Mỗi tasker chỉ có một application chưa cancelled cho một task.
- Tasker không có từ 3 assignment `IN_PROGRESS` trở lên.
- `bid_price` nằm trong `budget_min`/`budget_max` nếu có.
- Auto tạo tasker profile nếu chưa có.
- Emit Socket.IO event `application_joined` cho poster.

Endpoints liên quan:

- `GET /api/tasks/:taskId/applications`: chỉ poster xem danh sách applicant.
- `GET /api/applications/my-applications`: tasker xem đơn của mình, kèm `is_busy`.
- `GET /api/tasks/:taskId/my-application`.
- `PATCH /api/applications/:id`: sửa bid nếu còn pending.
- `PATCH /api/applications/:id/withdraw`: set về cancelled thông qua mapping `WITHDRAWN`.
- `DELETE /api/applications/:id`: hard delete pending application.

### 8.5 Matching

Có 3 cách thao tác liên quan match:

1. `GET /api/tasks/:taskId/ranked-applications`
   - Dùng `matchingService.rankApplications`.
   - Score backend = 30% price + 25% rating + 20% distance + 15% completion rate + 10% response time.

2. `POST /api/tasks/:taskId/auto-match`
   - Poster only.
   - Chọn application có score cao nhất.
   - Trong transaction: lock task, lock application, tạo escrow, tạo assigned task, set task `IN_PROGRESS`, set final price, accept selected application, reject các application khác, emit `task_assigned`.

3. `POST /api/tasks/:taskId/manual-match`
   - Poster truyền `application_id`.
   - Luồng gần giống auto-match: tạo escrow, assignment, set task `IN_PROGRESS`, accept selected và reject others.

Cảnh báo quan trọng: `PATCH /api/applications/:id/status` với status `ACCEPTED` là luồng accept application riêng. Luồng này tạo escrow và assigned task, accept application, nhưng hiện không set task sang `IN_PROGRESS` và không reject các applicant khác. Assignment tạo ra ở status `ASSIGNED`, worker cần gọi accept assignment để bắt đầu.

### 8.6 Assignment lifecycle

Base path: `/api/assignments`.

- `PATCH /:id/accept`: worker accept assignment. Status `ASSIGNED -> IN_PROGRESS`. Nếu số assignment in progress đạt `people_needed`, task được set `IN_PROGRESS`.
- `PATCH /:id/decline`: worker decline assignment. Status assignment `CANCELLED`, application `REJECTED`.
- `PATCH /:id/complete`: poster xác nhận worker hoàn thành. Status assignment `COMPLETED`. Nếu không còn assignment `ASSIGNED`/`IN_PROGRESS`, task set `COMPLETED` và gọi `escrowService.releaseForTask`.
- `PATCH /:id/cancel`: poster hủy assignment. Nếu không còn assignment active và task đang `IN_PROGRESS`, task về `OPEN` và gọi `escrowService.refundForTask`.

Model `assigned_tasks` có unique `(task_id, tasker_id)` và hỗ trợ multi assignment theo `people_needed`.

### 8.7 Wallet và PayOS

Base path: `/api/wallet`.

- `GET /me`: tạo wallet nếu chưa có, trả về balance/available/pending.
- `GET /transactions`: list ledger theo wallet.
- `POST /topup/mock`: dev topup, lock wallet, cộng balance và available, tạo transaction `DEPOSIT/SUCCESS`.
- `POST /topup/payos/create`: web flow, tạo pending transaction và PayOS checkout URL.
- `POST /topup/payos/webhook`: xử lý webhook PayOS, idempotent theo transaction status.
- `GET /topup/payos/status/:orderCode`: poll PayOS status, nếu paid thì cộng tiền và set transaction success.
- `POST /topup/payos`: mobile flow tạo PayOS link.
- `POST /topup/payos/confirm`: mobile flow confirm order code.
- `POST /withdraw`: trừ balance/available và tạo `wallet_transactions` + `withdraw_requests`.

Cảnh báo:

- `walletService.createPayOSPayment` đang hardcode backend redirect URL `http://192.168.100.206:3000/...`.
- `walletTransactionModel.listByWalletId` không order theo `created_at`, chỉ limit, vì comment nói created_at missing nhưng Prisma schema có `created_at`.

### 8.8 Escrow

Base path: `/api/escrows`.

- `GET /me`: list escrow theo poster/tasker/all và status.
- `GET /:taskId`: lấy escrow theo task id, chỉ poster/tasker xem.
- `DELETE /:taskId`: xóa escrow nếu poster/tasker và status holding.

Trạng thái code hiện tại:

- `escrowService.holdForMatch` tạo escrow với amount, platform fee, status `HOLDING`.
- `releaseForTask` chỉ set escrow `RELEASED`.
- `refundForTask` chỉ set escrow `REFUNDED`.
- Service hiện chưa trừ `available_balance`, chưa cộng `locked_balance`, chưa release tiền sang tasker, chưa ghi ledger escrow hold/release/refund.

Do đó không được viết tài liệu, UI hay logic mới với giả định "escrow đã khóa tiền thật" cho đến khi service này được hoàn thiện.

Cảnh báo bug tiềm ẩn:

- `escrowController.deleteEscrow` so sánh `escrow.status !== 'holding'` lowercase, trong khi schema/code hiện dùng `HOLDING` uppercase.
- `escrowModel.listByUserId` query `created_at`; cần kiểm tra bảng thực tế có column này không.

### 8.9 Chat realtime

Base path: `/api/chat`.

- Tất cả chat routes require auth.
- `GET /conversations`: list conversation của user, include unread count.
- `POST /conversations/start`: tạo/tìm conversation với user khác, sắp xếp `user1Id < user2Id` để đảm bảo unique.
- `GET /conversations/:id/messages`: list message.
- `POST /conversations/:id/messages`: gửi TEXT/IMAGE/MIXED, update conversation, emit `message_received`, push notification nếu receiver có token.
- `POST /attachments/image`: upload base64 image lên Cloudinary folder `snapon_chat`.
- `POST /conversations/:id/read`: update lastReadAt, set messages READ, emit `conversation_read`.

Socket:

- Auth qua token hoặc `xUserId`.
- Mỗi socket join room theo user id.
- Events đang được emit: `application_joined`, `task_assigned`, `assignment_accepted`, `assignment_declined`, `assignment_completed`, `assignment_cancelled`, `message_received`, `conversation_read`.

### 8.10 Banners và categories

- `GET /api/categories`: public, lấy categories/skills.
- `GET /api/banners/home`: public, active home banners, cache 5 phút.
- Admin banners:
  - `GET /api/admin/banners`
  - `GET /api/admin/banners/:id`
  - `POST /api/admin/banners`
  - `PUT /api/admin/banners/:id`
  - `PATCH /api/admin/banners/:id/status`
  - `DELETE /api/admin/banners/:id`

Admin banner routes cần role `admin`.

## 9. API Map Nhanh

Public:

- `GET /`
- `GET /api/health`
- `GET /api/categories`
- `GET /api/banners/home`
- `POST /api/auth/dev/login`
- `POST /api/auth/dev/register`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/wallet/topup/payos/webhook`
- `GET /api/wallet/topup/payos/success`
- `GET /api/wallet/topup/payos/cancel`

Authenticated:

- Users: `/api/users/profile`, `/api/users/search`, uploads, verify, public profile/posts/reviews, push token.
- Tasks: CRUD, saved tasks, image upload, close recruitment, status update.
- Applications: create/list/my/update/status/withdraw/delete.
- Matching: auto-match, manual-match, ranked-applications.
- Assignments: accept, decline, complete, cancel.
- Wallet: me, transactions, mock topup, PayOS create/status/confirm, withdraw.
- Escrows: list mine, detail by task, delete.
- Chat: conversations, messages, attachments, read.

Admin:

- `/api/admin/banners*`.

## 10. Frontend Web Context

Entry:

- `frontend/src/main.tsx`
- `frontend/src/app/App.tsx`
- `frontend/src/app/routes.tsx`

Routes:

- `/`: Home.
- `/login`: login/register UI.
- `/post`: post job form.
- `/job/:id`: detail, worker/hirer view tùy role local.
- `/activity`: activity/community screen.
- `/profile`: profile.
- `/worker`: worker dashboard.
- `/admin`, `/admin/jobs`, `/admin/users`: admin UI.

`AppContext.tsx`:

- Load tasks từ `/tasks`.
- Map backend task sang frontend `Job`.
- Có local AI scoring riêng: 45% distance, 35% price, 20% rating.
- Gọi API cho add job, apply, manual match, auto match, complete task, wallet mock topup.
- Auth state dùng Firebase hoặc dev mode.
- Lưu `firebaseToken`, `appUser`, `wallet` trong localStorage.
- Axios interceptor gắn cả `Authorization: Bearer <token>` và `x-user-id` nếu có appUser.

Cảnh báo web:

- Web còn nhiều state optimistic. Nếu API fail, UI có thể đã update tạm thời.
- Profile/review/user modal còn dữ liệu mẫu trong component.
- Categories web là static `CATEGORIES`, không hoàn toàn lấy từ `/categories`.
- Role web là UI role local `hirer | worker | admin`, không hoàn toàn đồng bộ với DB do endpoint role deprecated.
- Frontend comment nói backend escrow khấu trừ tiền, nhưng backend escrow hiện chưa update wallet balances.

## 11. Mobile App Context

Mobile nằm trong `mobile/`, có kiến trúc riêng rõ hơn web:

- `App.tsx`: SafeAreaProvider -> AuthProvider -> AppProvider -> AppNavigator.
- `AuthContext.tsx`: load token/user từ storage, sync user, logout, connect socket, đăng ký push token.
- `AppContext.tsx`: state nhẹ cho tasks/applications/wallet.
- `AppNavigator.tsx`: nếu chưa auth vào Auth stack; nếu role admin vào AdminStack; ngược lại vào MainTabs.
- `MainTabNavigator.tsx`: Home, PostJob, ChatList, Activity, Profile.

Service layer:

- `authService`: sync user, profile, avatar/cover upload, verify account, phone OTP.
- `taskService`: list, my tasks, saved tasks, detail, create/update/delete, status, close recruitment, upload images.
- `applicationService`: create/list/my, withdraw, accept/reject, assignment actions.
- `matchingService`: ranked, auto-match, manual-match.
- `walletService`: wallet, transactions, mock topup, PayOS mobile create/confirm.
- `chatService`: conversations, messages, image upload, read, push token.
- `activityService`: activity list/summary.
- `profileService`: public profile/posts/reviews.
- `categoryService`, `bannerService`, `escrowService`, `socketService`, `notificationService`.

Màn hình chính:

- Auth: Login, Register.
- Home: categories, banners, task feed, saved toggle.
- PostJob: tạo/sửa task, upload ảnh, category/skill.
- JobDetail, ApplicantList: apply, close recruitment, accept/reject/assignment actions.
- Activity: posted/participating activity.
- SavedJobs.
- Wallet.
- ChatList, ChatDetail.
- Profile, AccountSettings.
- Admin Dashboard/Jobs/Users.

Cảnh báo mobile:

- `LOCAL_API_URL` là IP hardcoded theo máy dev.
- Firebase config đang hardcode trong `constants/config.ts`; cần tránh commit secret thật nếu production.
- Socket connect dùng base URL bằng cách replace `/api`.
- Dev auth backend cần `x-user-id`, nhưng mobile axios chỉ gắn Bearer token từ storage; token trong dev OTP/login thường là user id nên backend vẫn chấp nhận Bearer user id.

## 12. Integrations

Firebase:

- Web dùng `VITE_FIREBASE_*`.
- Backend dùng `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Mobile có config trong `mobile/src/constants/config.ts`.

PayOS:

- Env backend: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.
- Thiếu env thì mock mode, PayOS `get` trả `PAID`.
- Web return/cancel URL dùng `FRONTEND_URL` hoặc localhost.

Cloudinary:

- Env backend: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Task image upload và chat image upload sẽ lỗi nếu thiếu env.

Postgres/Supabase:

- Runtime raw pg và Prisma đều đọc `DATABASE_URL`.
- Prisma CLI đọc `DIRECT_URL`, `DIRECT_DATABASE_URL`, rồi `DATABASE_URL` trong `prisma.config.ts`.
- `PGSSLMODE=disable` để tắt SSL local; mặc định config hay bật SSL khi có URL.

OpenStreetMap/Nominatim:

- Web `MapPicker` và worker dashboard gọi Nominatim bằng `fetch`.

Expo Push:

- Mobile đăng ký token qua `/api/users/push-token`.
- Backend gửi qua Expo push API trong `utils/pushNotification.js`.

## 13. Scripts, Seeds, Testing

Backend package scripts:

- `npm run dev`
- `npm start`
- `npm run db:ping`
- `npm run db:tables`
- `npm run prisma:generate`
- `npm run prisma:pull`
- `npm run prisma:studio`
- `npm run migrate:chat-message-features`
- `npm run migrate:saved-tasks`

Không có `npm test` chính thức trong backend/frontend/mobile. Thư mục `backend/scripts` có nhiều script migration/seed/manual test:

- seed: categories, banners, chat messages.
- migration: banners, cover URL, chat message features, multiple assignments, post types, profile fields, recruitment deadline, saved tasks.
- manual tests: matching escrow, constraints, indexes, task mapping, task skills, banners, chat search, user avatars.

Khi review hoặc sửa logic rủi ro cao, nên chạy ít nhất:

- `npm run db:ping` trong `backend`.
- Build web: `npm run build` trong `frontend`.
- TypeScript mobile nếu cần: `npx tsc --noEmit` trong `mobile` nếu repo cấu hình hỗ trợ.

## 14. Known Gaps And Risks

Đây là các điểm phải đọc trước khi tiếp tục phát triển:

- Tài liệu cũ trong `docs/` và `doc/` bị hiển thị mojibake trong PowerShell và có nội dung đã cũ. `context.md` này được viết lại sạch hơn, nhưng các file khác vẫn cần chỉnh nếu muốn dùng làm tài liệu chính thức.
- `README.md` vẫn nhắc `backend_SO`/`frontend_SO`, trong repo thật là `backend`/`frontend`.
- `backend/createdb.txt` dùng enum lowercase, trong khi code/schema Prisma hiện dùng UPPERCASE. Docker init có thể tạo DB không tương thích với code.
- Backend dùng cả raw `pg` và Prisma. Khi sửa schema phải cập nhật cả raw SQL, Prisma schema, service map và client mapping.
- Escrow hiện chưa update wallet balances/ledger khi hold/release/refund. Đây là khoảng trống nghiệp vụ tài chính lớn nhất.
- `escrowController.deleteEscrow` so sánh status lowercase `holding`; cần đổi hoặc normalize theo DB thực tế.
- `escrowModel.listByUserId` dùng `created_at`; cần xác minh column tồn tại.
- `PUT /api/users/role` deprecated và luôn set `USER`, nhưng UI và admin auth vẫn phụ thuộc role.
- Admin route banners cần role admin, nhưng không có UI/API tạo admin role an toàn.
- `users.js` query DB trực tiếp trong route, khác với pattern controller/model.
- Web frontend vẫn có mock/demo reviews/profile và local optimistic state.
- Mobile và backend có IP hardcoded cho local PayOS/API, cần đổi theo môi trường.
- Cloudinary upload không có fallback mock; thiếu env sẽ lỗi.
- Firebase/PayOS có dev fallback để demo, nhưng production cần credentials thật và chính sách bảo mật đầy đủ.
- Verification endpoint auto-approve, chưa OCR thật.
- Report/review tables có schema nhưng API review/report đầy đủ chưa rõ trong routes hiện tại.
- CI/CD, monitoring, production deployment chưa có file cấu hình trong repo.

## 15. Coding Rules For This Repo

Khi AI hoặc developer sửa code:

- Đọc route/controller/model liên quan trước khi sửa UI.
- Không tin tuyệt đối vào tài liệu cũ nếu trái với code.
- Không hardcode API URL mới trong component; dùng service/api config sẵn có.
- Với tiền/ví/escrow, bắt buộc dùng transaction và row lock. Nếu thêm escrow hold/release thật, phải cập nhật wallet balances và `wallet_transactions` cùng lúc.
- Giúp response giữ shape hiện có `{ success, message, data }` để mobile/web không vỡ mapping.
- Nếu thêm endpoint mới, thêm route, controller/service/model phù hợp và cập nhật Swagger nếu route đang có JSDoc.
- Nếu sửa status/enum, kiểm tra cả `utils/constants.js`, `utils/dbEnum.js`, Prisma schema, SQL init, mobile types và web mapping.
- Không commit `.env` hoặc secrets. Mobile config hiện có hardcode Firebase/API, cần xử lý riêng nếu đưa production.
- Không thêm mock data production mới vào frontend/mobile; dùng API hoặc fallback rỗng.
- Tránh sửa ảnh trong `backend/public/uploads` nếu không liên quan.
- Khi sửa mobile service, đối chiếu endpoint backend thật vì nhiều service map snake_case/camelCase thủ công.

## 16. Quick Mental Model

Nếu cần debug một task marketplace:

1. User đăng nhập -> `req.user.id`.
2. Poster tạo `tasks`.
3. Worker tạo `task_applications`.
4. Poster auto/manual match hoặc accept application.
5. Backend tạo `assigned_tasks` và `escrows`.
6. Worker accept assignment để vào `IN_PROGRESS` nếu dùng luồng assignment.
7. Poster complete assignment/task.
8. Escrow status được release/refund, nhưng hiện chưa chuyển tiền thật.
9. Web/mobile refresh task/activity/wallet qua API.

Nếu cần debug auth:

1. Kiểm tra `AUTH_MODE`.
2. Dev mode cần `x-user-id` hoặc Bearer user id.
3. Firebase mode cần token hợp lệ và user đã sync trong DB.
4. 401 trên client sẽ clear token/local storage.

Nếu cần debug chat:

1. Kiểm tra `DATABASE_URL` và Prisma Client.
2. Kiểm tra socket auth payload token/xUserId.
3. User phải join room user id.
4. REST send message sẽ emit Socket.IO và push notification.