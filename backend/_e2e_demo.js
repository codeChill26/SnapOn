/**
 * E2E DEMO — escrow-per-job full flow (TEMP script, tự dọn dữ liệu khi xong)
 *
 * Flow: tasker apply → poster accept (PENDING_PAYMENT + PayOS mock)
 *       → confirm PAID → escrow HOLDING + assignment ASSIGNED
 *       → worker accept → IN_PROGRESS → worker submit → SUBMITTED (auto-release 72h)
 *       → poster nghiệm thu → escrow RELEASED → ví tasker +90%
 *       → tasker rút tiền → withdraw_request PENDING (giữ available→locked)
 *
 * Server chạy PORT 3979, AUTH_MODE=dev (x-user-id), PayOS MOCK (creds rỗng).
 */
const { spawn } = require('child_process');
const pool = require('./config/db');

const PORT = 3979;
const BASE = `http://localhost:${PORT}/api`;
const TAG = 'E2E_ESCROW_DEMO';

const log = (step, msg) => console.log(`\n[${step}] ${msg}`);
const money = (v) => Number(v).toLocaleString('vi-VN') + 'đ';

async function api(method, path, { userId, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function escrowState(taskId) {
  const r = await pool.query(
    'SELECT status, amount, platform_fee_amount, order_code, auto_release_at FROM escrows WHERE task_id = $1',
    [taskId]
  );
  return r.rows[0] || null;
}

async function main() {
  let server;
  let posterId, taskerId, taskId;
  let failed = false;

  try {
    // ── 0. Spawn backend (dev auth + PayOS mock) ─────────────────────
    log('0', 'Khởi động backend (PORT 3979, AUTH_MODE=dev, PayOS MOCK)...');
    server = spawn(process.execPath, ['app.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: String(PORT),
        AUTH_MODE: 'dev',
        NODE_ENV: 'development',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`,
        PAYOS_CLIENT_ID: '',
        PAYOS_API_KEY: '',
        PAYOS_CHECKSUM_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', () => {});
    server.stderr.on('data', (d) => {
      const s = d.toString();
      if (/error/i.test(s)) console.error('  [server-err]', s.slice(0, 300));
    });

    // Wait for server to answer HTTP
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        await fetch(`http://localhost:${PORT}/`);
        ready = true;
        break;
      } catch {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!ready) throw new Error('Server không khởi động được trong 60s');
    console.log('    ✅ Server sẵn sàng');

    // ── 1. Seed test users + task ────────────────────────────────────
    log('1', 'Tạo dữ liệu test (poster + tasker + task, có nhãn E2E để dọn)...');
    const poster = await pool.query(
      `INSERT INTO users (id, firebase_uid, full_name, email, status, is_verified, role)
       VALUES (gen_random_uuid(), gen_random_uuid(), '${TAG} Poster', 'e2e_poster_${Date.now()}@test.local', 'ACTIVE', true, 'USER')
       RETURNING id`
    );
    posterId = poster.rows[0].id;

    const tasker = await pool.query(
      `INSERT INTO users (id, firebase_uid, full_name, email, status, is_verified, role)
       VALUES (gen_random_uuid(), gen_random_uuid(), '${TAG} Tasker', 'e2e_tasker_${Date.now()}@test.local', 'ACTIVE', true, 'USER')
       RETURNING id`
    );
    taskerId = tasker.rows[0].id;

    const task = await pool.query(
      `INSERT INTO tasks (id, poster_id, title, description, task_type, status, budget_min, budget_max, post_type, people_needed)
       VALUES (gen_random_uuid(), $1, '${TAG} — job test 200k', 'Job demo escrow-per-job', 'ONLINE', 'OPEN', 50000, 500000, 'RECRUITMENT', 1)
       RETURNING id`,
      [posterId]
    );
    taskId = task.rows[0].id;
    console.log(`    ✅ poster=${posterId.slice(0, 8)}…  tasker=${taskerId.slice(0, 8)}…  task=${taskId.slice(0, 8)}…`);

    // ── 2. Tasker apply (bid 200k) ───────────────────────────────────
    log('2', 'Tasker ứng tuyển với giá 200.000đ...');
    const apply = await api('POST', `/tasks/${taskId}/applications`, {
      userId: taskerId,
      body: { bid_price: 200000, estimated_time: '2 gio', message: 'E2E test bid' },
    });
    if (apply.status !== 201) throw new Error(`Apply thất bại (${apply.status}): ${apply.json.message}`);
    const applicationId = apply.json.data.id;
    console.log(`    ✅ Application ${applicationId.slice(0, 8)}… status=${apply.json.data.status}`);

    // ── 3. Poster duyệt → PENDING_PAYMENT + PayOS link ───────────────
    log('3', 'Poster duyệt ứng viên → tạo escrow chờ thanh toán...');
    const accept = await api('PATCH', `/applications/${applicationId}/status`, {
      userId: posterId,
      body: { status: 'ACCEPTED' },
    });
    if (accept.status !== 200 || !accept.json.data?.paymentRequired) {
      throw new Error(`Accept thất bại (${accept.status}): ${accept.json.message}`);
    }
    const { orderCode, checkoutUrl, payAmount } = accept.json.data;
    let esc = await escrowState(taskId);
    console.log(`    ✅ paymentRequired=true, orderCode=${orderCode}, phải trả=${money(payAmount)}`);
    console.log(`    ✅ checkoutUrl=${String(checkoutUrl).slice(0, 60)}…`);
    console.log(`    📊 Escrow DB: status=${esc.status} (chưa có tiền, task vẫn OPEN)`);
    if (esc.status !== 'PENDING_PAYMENT') throw new Error('Escrow phải là PENDING_PAYMENT');

    // ── 4. Poster "thanh toán" (PayOS mock trả PAID) → FUND + chốt match ─
    log('4', 'Poster xác nhận thanh toán (mock PAID) → fund escrow + chốt match...');
    const confirm = await api('POST', '/escrows/payos/confirm', {
      userId: posterId,
      body: { orderCode },
    });
    if (confirm.status !== 200 || confirm.json.data?.success !== true) {
      throw new Error(`Confirm thất bại (${confirm.status}): ${confirm.json.message}`);
    }
    const assignmentId = confirm.json.data.assignedTask?.id;
    esc = await escrowState(taskId);
    console.log(`    ✅ Escrow: status=${esc.status}, giữ=${money(esc.amount)}, phí sàn=${money(esc.platform_fee_amount)}`);
    console.log(`    ✅ Assignment tạo: ${assignmentId?.slice(0, 8)}… (ASSIGNED — chờ worker nhận)`);
    if (esc.status !== 'HOLDING') throw new Error('Escrow phải là HOLDING sau thanh toán');
    if (!assignmentId) throw new Error('Assignment chưa được tạo');

    // ── 5. Worker nhận việc → IN_PROGRESS ────────────────────────────
    log('5', 'Worker bấm nhận việc...');
    const acc = await api('PATCH', `/assignments/${assignmentId}/accept`, { userId: taskerId });
    if (acc.status !== 200) throw new Error(`Worker accept thất bại (${acc.status}): ${acc.json.message}`);
    console.log('    ✅ Assignment → IN_PROGRESS, task → IN_PROGRESS');

    // ── 6. Worker báo "Đã hoàn thành" → SUBMITTED + auto-release 72h ──
    log('6', 'Worker báo đã hoàn thành...');
    const submit = await api('PATCH', `/assignments/${assignmentId}/submit`, { userId: taskerId });
    if (submit.status !== 200) throw new Error(`Submit thất bại (${submit.status}): ${submit.json.message}`);
    esc = await escrowState(taskId);
    console.log(`    ✅ SUBMITTED. Đồng hồ tự giải ngân: ${esc.auto_release_at}`);
    if (!esc.auto_release_at) throw new Error('auto_release_at phải được set');

    // ── 7. Poster nghiệm thu → RELEASED → tiền vào sổ thu nhập tasker ─
    log('7', 'Poster nghiệm thu → nhả tiền...');
    const complete = await api('PATCH', `/assignments/${assignmentId}/complete`, { userId: posterId });
    if (complete.status !== 200) throw new Error(`Nghiệm thu thất bại (${complete.status}): ${complete.json.message}`);
    esc = await escrowState(taskId);
    const wallet1 = await api('GET', '/wallet/me', { userId: taskerId });
    console.log(`    ✅ Escrow: status=${esc.status}`);
    console.log(`    💰 Ví tasker: khả dụng=${money(wallet1.json.data.available_balance)} (200k − 10% phí = 180k)`);
    if (esc.status !== 'RELEASED') throw new Error('Escrow phải là RELEASED');
    if (Number(wallet1.json.data.available_balance) !== 180000) {
      throw new Error(`Ví tasker sai: ${wallet1.json.data.available_balance} (kỳ vọng 180000)`);
    }

    // ── 8. Tasker rút 100k → giữ tiền + withdraw_request PENDING ─────
    log('8', 'Tasker gửi yêu cầu rút 100.000đ...');
    const wd = await api('POST', '/wallet/withdraw', {
      userId: taskerId,
      body: { amount: 100000, bankName: 'VCB (E2E)', bankAccountNumber: '0001112223' },
    });
    if (wd.status !== 200) throw new Error(`Withdraw thất bại (${wd.status}): ${wd.json.message}`);
    const w = wd.json.data.wallet;
    console.log(`    ✅ Request ${wd.json.data.request.id.slice(0, 8)}… status=${wd.json.data.request.status}`);
    console.log(`    💰 Ví tasker: khả dụng=${money(w.available_balance)}, đang giữ=${money(w.pending_balance)}`);
    if (Number(w.available_balance) !== 80000 || Number(w.pending_balance) !== 100000) {
      throw new Error('Số dư sau khi rút không khớp (kỳ vọng 80k khả dụng / 100k giữ)');
    }

    console.log('\n════════════════════════════════════════════════════');
    console.log('🎉 E2E PASS — toàn bộ luồng escrow-per-job chạy đúng:');
    console.log('   apply → accept → PENDING_PAYMENT → PAID(mock) → HOLDING');
    console.log('   → worker accept → submit(72h) → nghiệm thu → RELEASED');
    console.log('   → ví tasker +180k → rút 100k (giữ chờ admin duyệt)');
    console.log('════════════════════════════════════════════════════');
  } catch (err) {
    failed = true;
    console.error('\n❌ E2E FAILED:', err.message);
  } finally {
    // ── Cleanup: xóa toàn bộ dữ liệu test (cascade) ──────────────────
    log('9', 'Dọn dẹp dữ liệu test...');
    try {
      if (taskId) await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      if (posterId) await pool.query('DELETE FROM users WHERE id = $1', [posterId]);
      if (taskerId) await pool.query('DELETE FROM users WHERE id = $1', [taskerId]);
      console.log('    ✅ Đã xóa task + 2 user test (cascade: escrow, application, assignment, wallet, withdraw)');
    } catch (e) {
      console.error('    ⚠️ Cleanup lỗi (xóa tay nếu cần):', e.message);
    }
    if (server) server.kill();
    await pool.end();
    process.exit(failed ? 1 : 0);
  }
}

main();
