<?php
// admin.php — Admin dashboard
include 'db.php';
session_start();
if (empty($_SESSION['emp_id']) || $_SESSION['role'] !== 'ADMIN') {
    header('Location: login.php'); exit;
}

/* ── Employee actions ── */
$action_msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = trim($_POST['act'] ?? '');

    if ($act === 'create') {
        $name = trim($_POST['emp_name'] ?? '');
        $user = trim($_POST['username'] ?? '');
        $pass = trim($_POST['password'] ?? '');
        $role = in_array($_POST['role'] ?? '', ['ADMIN','STAFF']) ? $_POST['role'] : 'STAFF';
        if ($name && $user && strlen($pass) >= 6) {
            $hash = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO employees (emp_name,username,password_hash,role,is_active) VALUES (?,?,?,?,1)");
            $stmt->bind_param("ssss",$name,$user,$hash,$role);
            try { $stmt->execute(); $action_msg = 'ok:สร้างบัญชีสำเร็จ'; } catch(Throwable $e) { $action_msg = 'err:username ซ้ำ'; }
        } else { $action_msg = 'err:กรอกข้อมูลให้ครบ (password ≥ 6 ตัว)'; }
    }

    if ($act === 'toggle') {
        $eid  = (int)($_POST['emp_id'] ?? 0);
        $to   = (int)($_POST['to'] ?? 1);
        if ($eid === (int)$_SESSION['emp_id']) { $action_msg = 'err:ห้ามปิดบัญชีตัวเอง'; }
        else {
            $s = $conn->prepare("UPDATE employees SET is_active=? WHERE emp_id=?");
            $s->bind_param("ii",$to,$eid); $s->execute();
            $action_msg = 'ok:อัปเดตสำเร็จ';
        }
    }

    if ($act === 'reset_pw') {
        $eid  = (int)($_POST['emp_id'] ?? 0);
        $pass = trim($_POST['password'] ?? '');
        if (strlen($pass) < 6) { $action_msg = 'err:password ≥ 6 ตัว'; }
        else {
            $hash = password_hash($pass, PASSWORD_DEFAULT);
            $s = $conn->prepare("UPDATE employees SET password_hash=? WHERE emp_id=?");
            $s->bind_param("si",$hash,$eid); $s->execute();
            $action_msg = 'ok:Reset รหัสผ่านสำเร็จ';
        }
    }

    header('Location: admin.php?msg='.urlencode($action_msg)); exit;
}

/* ── Data ── */
$msg = $_GET['msg'] ?? '';

// Employees
$employees = $conn->query("SELECT emp_id,emp_name,username,role,is_active,created_at FROM employees ORDER BY created_at DESC")->fetch_all(MYSQLI_ASSOC);

// Today report
$today_date = date('Y-m-d');
$rev = $conn->query("SELECT IFNULL(SUM(total_amount),0) rev, COUNT(*) cnt, IFNULL(AVG(total_amount),0) avg_bill FROM payments WHERE DATE(payment_time)=CURDATE()")->fetch_assoc();
$by_status_raw = $conn->query("SELECT queue_status, COUNT(*) n FROM queues WHERE DATE(created_at)=CURDATE() GROUP BY queue_status")->fetch_all(MYSQLI_ASSOC);
$by_status = array_fill_keys(['WAITING','CONFIRMED','SEATED','FINISHED','CANCELLED'], 0);
foreach ($by_status_raw as $r) $by_status[$r['queue_status']] = (int)$r['n'];
$total_today = array_sum($by_status);

$times = $conn->query("SELECT IFNULL(AVG(TIMESTAMPDIFF(SECOND,confirmed_at,seated_at)),0) wait, IFNULL(AVG(TIMESTAMPDIFF(SECOND,seated_at,finished_at)),0) dine FROM queues WHERE DATE(created_at)=CURDATE() AND confirmed_at IS NOT NULL AND seated_at IS NOT NULL")->fetch_assoc();
$avg_wait = $times['wait'] ? round($times['wait']/60, 1) : null;
$avg_dine = $times['dine'] ? round($times['dine']/60, 1) : null;

$by_method = $conn->query("SELECT payment_method, SUM(total_amount) rev, COUNT(*) cnt FROM payments WHERE DATE(payment_time)=CURDATE() GROUP BY payment_method ORDER BY rev DESC")->fetch_all(MYSQLI_ASSOC);

// 7-day revenue chart data
$chart_labels = []; $chart_data = [];
for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-{$i} days"));
    $r = $conn->query("SELECT IFNULL(SUM(total_amount),0) rev FROM payments WHERE DATE(payment_time)='$d'")->fetch_assoc();
    $chart_labels[] = date('d/m', strtotime($d));
    $chart_data[]   = (float)$r['rev'];
}

function pay_label_short(string $m): string {
    return ['CASH'=>'เงินสด','QR'=>'QR','PROMPTPAY'=>'QR','CARD'=>'บัตร'][$m] ?? $m;
}
function pay_icon(string $m): string {
    return ['CASH'=>'💵','QR'=>'📱','PROMPTPAY'=>'📱','CARD'=>'💳'][$m] ?? '💰';
}
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin — BBQ GRILL</title>
<link rel="stylesheet" href="theme.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
body { overflow-x: hidden; }
.shell { display: flex; min-height: 100dvh; }

/* Sidebar */
.sidebar {
  width: 220px; flex-shrink: 0;
  background: var(--cinder); border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100dvh; overflow-y: auto;
}
.sb-top { padding: 24px 20px 20px; border-bottom: 1px solid var(--border); }
.sb-brand { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--ash); }
.sb-sub { font-size: .7rem; color: var(--smoke); margin-top: 3px; letter-spacing: .06em; text-transform: uppercase; }
.sb-nav { padding: 14px 12px; flex: 1; }
.nav-label { font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--haze); padding: 8px 8px 4px; }
.nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: var(--r-sm);
  color: var(--smoke); font-size: .86rem; font-weight: 600;
  text-decoration: none; margin-bottom: 2px;
  transition: all .18s; border: 1px solid transparent;
}
.nav-item:hover { background: var(--surface2); color: var(--ash); }
.nav-item.active { background: rgba(232,98,42,.12); border-color: rgba(232,98,42,.22); color: var(--ember-hi); }
.sb-footer { padding: 16px 20px; border-top: 1px solid var(--border); }

/* Main */
.main { flex: 1; padding: 32px 32px 60px; overflow-y: auto; min-width: 0; }
.page-header { margin-bottom: 28px; }
.page-title { font-family: var(--font-display); font-size: 2rem; font-weight: 700; margin-bottom: 4px; }
.page-sub   { color: var(--smoke); font-size: .86rem; }

/* Flash */
.flash {
  padding: 12px 16px; border-radius: var(--r-sm);
  margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
  font-size: .86rem; animation: fadeIn .3s ease;
}

/* KPI grid */
.kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
.kpi-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 18px 16px; text-align: center;
  transition: border-color .2s;
  position: relative; overflow: hidden;
}
.kpi-card:hover { border-color: var(--border2); }
.kpi-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  opacity: 0; transition: opacity .3s;
}
.kpi-card:hover::after { opacity: 1; }
.kc-revenue::after  { background: var(--gold); }
.kc-finished::after { background: var(--jade); }
.kc-total::after    { background: var(--azure); }
.kc-dine::after     { background: var(--ember); }
.kpi-val { font-family: var(--font-mono); font-size: 1.9rem; font-weight: 600; line-height: 1; margin-bottom: 4px; }
.kpi-lbl { color: var(--smoke); font-size: .73rem; }

/* Chart section */
.chart-section {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 22px 24px; margin-bottom: 28px;
}
.section-title {
  font-family: var(--font-display); font-size: 1.1rem; font-weight: 600;
  display: flex; align-items: center; gap: 10px; margin-bottom: 18px;
  color: var(--ash);
}
.section-title-line { flex: 1; height: 1px; background: var(--border); }
.chart-wrap { position: relative; height: 180px; }

/* Method chips */
.methods-wrap { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
.method-chip {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm);
  padding: 13px 16px; display: flex; align-items: center; gap: 12px;
  transition: border-color .2s;
}
.method-chip:hover { border-color: var(--border2); }
.mc-icon { font-size: 1.25rem; }
.mc-rev  { font-family: var(--font-mono); font-size: .95rem; font-weight: 600; }
.mc-meta { color: var(--smoke); font-size: .73rem; margin-top: 2px; }

/* Status strip */
.status-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
.st-chip {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-sm); padding: 10px 16px; min-width: 100px; text-align: center;
}
.st-num { font-family: var(--font-mono); font-size: 1.3rem; font-weight: 600; }
.st-lbl { font-size: .72rem; color: var(--smoke); margin-top: 2px; }

/* Employee table */
.table-wrap {
  background: linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
  border: 1px solid var(--border); border-radius: var(--r); overflow: hidden;
}
.emp-table { width: 100%; border-collapse: collapse; }
.emp-table th {
  padding: 11px 16px; text-align: left;
  font-size: .67rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--haze); border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,.02);
}
.emp-table td {
  padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,.04);
  font-size: .87rem;
}
.emp-table tr:last-child td { border-bottom: none; }
.emp-table tr:hover td { background: rgba(255,255,255,.02); }

.emp-avatar {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(232,98,42,.20), rgba(196,154,60,.15));
  border: 1px solid rgba(232,98,42,.20);
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .78rem; color: var(--ember-hi);
  margin-right: 8px; vertical-align: middle;
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(5,7,13,.82); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  width: 100%; max-width: 420px;
  background: linear-gradient(160deg, var(--smolder), var(--cinder));
  border: 1px solid var(--border2); border-radius: var(--r-xl);
  padding: 32px 28px; box-shadow: var(--shadow-lg);
  animation: slideUp .4s cubic-bezier(.34,1.2,.64,1) both;
}
.modal-title { font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; margin-bottom: 18px; }
.form-group  { margin-bottom: 16px; }
.modal-actions { display: flex; gap: 10px; margin-top: 18px; }

@media (max-width: 900px) {
  .shell { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: static; flex-direction: row; flex-wrap: wrap; }
  .sb-top { flex: 1; }
  .sb-nav { display: flex; flex-direction: row; gap: 4px; flex: 2; }
  .nav-label { display: none; }
  .sb-footer { display: none; }
  .main { padding: 20px; }
  .kpi-grid { grid-template-columns: repeat(2,1fr); }
}
</style>
</head>
<body>
<div class="shell">

<!-- Sidebar -->
<aside class="sidebar">
  <div class="sb-top">
    <div class="sb-brand">🔥 BBQ GRILL</div>
    <div class="sb-sub">Admin Panel</div>
  </div>
  <nav class="sb-nav">
    <div class="nav-label">เมนู</div>
    <a href="admin.php" class="nav-item active"><i class="bi bi-bar-chart-line"></i> รายงาน</a>
    <a href="staff_queue.php" class="nav-item"><i class="bi bi-grid-3x3-gap"></i> จัดการคิว</a>
    <a href="history.php" class="nav-item"><i class="bi bi-clock-history"></i> ประวัติ</a>
    <a href="index.php" class="nav-item"><i class="bi bi-house"></i> หน้าหลัก</a>
  </nav>
  <div class="sb-footer">
    <a href="logout.php" class="btn btn-ghost btn-sm btn-wide" style="text-decoration:none;">
      <i class="bi bi-box-arrow-right"></i> ออกจากระบบ
    </a>
  </div>
</aside>

<!-- Main -->
<main class="main">

  <div class="page-header">
    <div class="page-title">Admin Dashboard</div>
    <div class="page-sub">รายงานประจำวัน — <?= date('d/m/Y') ?></div>
  </div>

  <?php if ($msg):
    $is_ok = str_starts_with($msg, 'ok:');
    $msg_text = substr($msg, 3);
  ?>
  <div class="flash <?= $is_ok ? 'alert-success' : 'alert-danger' ?>">
    <i class="bi bi-<?= $is_ok ? 'check-circle-fill' : 'exclamation-triangle-fill' ?>"></i>
    <?= htmlspecialchars($msg_text) ?>
  </div>
  <?php endif; ?>

  <!-- KPI -->
  <div class="kpi-grid">
    <div class="kpi-card kc-revenue">
      <div class="kpi-val" style="color:var(--gold-hi)">฿<?= number_format((float)$rev['rev'],0) ?></div>
      <div class="kpi-lbl">รายได้วันนี้</div>
    </div>
    <div class="kpi-card kc-finished">
      <div class="kpi-val" style="color:var(--jade)"><?= $by_status['FINISHED'] ?></div>
      <div class="kpi-lbl">คิวเสร็จสิ้น</div>
    </div>
    <div class="kpi-card kc-total">
      <div class="kpi-val" style="color:var(--azure)"><?= $total_today ?></div>
      <div class="kpi-lbl">คิวทั้งหมดวันนี้</div>
    </div>
    <div class="kpi-card kc-dine">
      <div class="kpi-val" style="color:var(--ember-hi)"><?= $avg_dine ?? '—' ?></div>
      <div class="kpi-lbl">เฉลี่ยนั่ง (นาที)</div>
    </div>
  </div>

  <!-- 7-day chart -->
  <div class="chart-section">
    <div class="section-title">
      <i class="bi bi-graph-up" style="color:var(--ember)"></i>
      รายได้ 7 วันย้อนหลัง
      <div class="section-title-line"></div>
    </div>
    <div class="chart-wrap">
      <canvas id="revenueChart"></canvas>
    </div>
  </div>

  <!-- Payment methods -->
  <?php if (!empty($by_method)): ?>
  <div class="section-title" style="margin-bottom:14px;">
    <i class="bi bi-credit-card-2-front" style="color:var(--gold)"></i>
    วิธีชำระวันนี้
    <div class="section-title-line"></div>
  </div>
  <div class="methods-wrap">
    <?php foreach ($by_method as $m): ?>
    <div class="method-chip">
      <span class="mc-icon"><?= pay_icon($m['payment_method']) ?></span>
      <div>
        <div class="mc-rev">฿<?= number_format((float)$m['rev'],0) ?></div>
        <div class="mc-meta"><?= pay_label_short($m['payment_method']) ?> · <?= $m['cnt'] ?> รายการ</div>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>

  <!-- Status breakdown -->
  <div class="section-title" style="margin-bottom:14px;">
    <i class="bi bi-pie-chart" style="color:var(--azure)"></i>
    สถานะคิววันนี้
    <div class="section-title-line"></div>
  </div>
  <div class="status-strip" style="margin-bottom:32px;">
    <?php
    $st_config = ['WAITING'=>['รอยืนยัน','var(--gold-hi)'],'CONFIRMED'=>['ยืนยัน','var(--azure)'],'SEATED'=>['นั่งโต๊ะ','var(--jade)'],'FINISHED'=>['เสร็จสิ้น','var(--smoke)'],'CANCELLED'=>['ยกเลิก','var(--crimson)']];
    foreach ($st_config as $sk => [$slbl, $scol]): ?>
    <div class="st-chip">
      <div class="st-num" style="color:<?= $scol ?>"><?= $by_status[$sk] ?></div>
      <div class="st-lbl"><?= $slbl ?></div>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- Employees -->
  <div class="section-title" style="margin-bottom:16px;">
    <i class="bi bi-people" style="color:var(--ember)"></i>
    จัดการพนักงาน
    <div class="section-title-line"></div>
    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('createModal').style.display='flex'">
      <i class="bi bi-plus-lg"></i> เพิ่ม
    </button>
  </div>

  <div class="table-wrap">
    <table class="emp-table">
      <thead>
        <tr>
          <th>ชื่อ / Username</th>
          <th>Role</th>
          <th>สถานะ</th>
          <th>เข้าระบบ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($employees as $e): ?>
        <tr>
          <td>
            <span class="emp-avatar"><?= mb_substr($e['emp_name'],0,1) ?></span>
            <span style="font-weight:700;"><?= htmlspecialchars($e['emp_name']) ?></span>
            <span style="display:block;color:var(--smoke);font-family:var(--font-mono);font-size:.74rem;margin-left:38px;margin-top:-2px;">@<?= htmlspecialchars($e['username']) ?></span>
          </td>
          <td>
            <span class="badge <?= $e['role']==='ADMIN'?'badge-admin':'badge-qr' ?>"><?= $e['role'] ?></span>
          </td>
          <td>
            <span class="badge <?= $e['is_active']?'badge-paid':'badge-cancelled' ?>">
              <?= $e['is_active'] ? 'Active' : 'Disabled' ?>
            </span>
          </td>
          <td style="font-size:.76rem;color:var(--smoke);font-family:var(--font-mono);">
            <?= date('d/m/Y', strtotime($e['created_at'])) ?>
          </td>
          <td style="text-align:right;">
            <button class="btn btn-ghost btn-sm" style="margin-right:4px;"
                    onclick="openReset(<?= $e['emp_id'] ?>, '<?= htmlspecialchars($e['emp_name'],ENT_QUOTES) ?>')">
              <i class="bi bi-key"></i>
            </button>
            <?php if ($e['emp_id'] != $_SESSION['emp_id']): ?>
            <form method="POST" style="display:inline;">
              <input type="hidden" name="act" value="toggle">
              <input type="hidden" name="emp_id" value="<?= $e['emp_id'] ?>">
              <input type="hidden" name="to" value="<?= $e['is_active'] ? 0 : 1 ?>">
              <button type="submit" class="btn btn-sm <?= $e['is_active'] ? 'btn-danger' : 'btn-jade' ?>">
                <?= $e['is_active'] ? 'ปิด' : 'เปิด' ?>
              </button>
            </form>
            <?php endif; ?>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

</main>
</div>

<!-- Create Employee Modal -->
<div class="modal-overlay" id="createModal" style="display:none;" onclick="if(event.target===this)this.style.display='none'">
  <div class="modal">
    <div class="modal-title"><i class="bi bi-person-plus" style="color:var(--ember)"></i> เพิ่มพนักงาน</div>
    <form method="POST">
      <input type="hidden" name="act" value="create">
      <div class="form-group">
        <label class="label">ชื่อ-นามสกุล</label>
        <input type="text" name="emp_name" class="input" placeholder="ชื่อพนักงาน" required>
      </div>
      <div class="form-group">
        <label class="label">Username</label>
        <input type="text" name="username" class="input" placeholder="username" required>
      </div>
      <div class="form-group">
        <label class="label">Password (≥ 6 ตัว)</label>
        <input type="password" name="password" class="input" placeholder="รหัสผ่าน" minlength="6" required>
      </div>
      <div class="form-group">
        <label class="label">Role</label>
        <select name="role" class="input">
          <option value="STAFF">STAFF</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="document.getElementById('createModal').style.display='none'">ยกเลิก</button>
        <button type="submit" class="btn btn-ember" style="flex:1"><i class="bi bi-plus-lg"></i> สร้าง</button>
      </div>
    </form>
  </div>
</div>

<!-- Reset Password Modal -->
<div class="modal-overlay" id="resetModal" style="display:none;" onclick="if(event.target===this)this.style.display='none'">
  <div class="modal">
    <div class="modal-title"><i class="bi bi-key" style="color:var(--gold)"></i> Reset รหัสผ่าน — <span id="resetName"></span></div>
    <form method="POST">
      <input type="hidden" name="act" value="reset_pw">
      <input type="hidden" name="emp_id" id="resetEmpId">
      <div class="form-group">
        <label class="label">รหัสผ่านใหม่ (≥ 6 ตัว)</label>
        <input type="password" name="password" class="input" placeholder="รหัสผ่านใหม่" minlength="6" required>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="document.getElementById('resetModal').style.display='none'">ยกเลิก</button>
        <button type="submit" class="btn btn-gold" style="flex:1">บันทึก</button>
      </div>
    </form>
  </div>
</div>

<script>
function openReset(id, name) {
  document.getElementById('resetEmpId').value = id;
  document.getElementById('resetName').textContent = name;
  document.getElementById('resetModal').style.display = 'flex';
}

/* Revenue Chart */
const ctx = document.getElementById('revenueChart').getContext('2d');
const labels = <?= json_encode($chart_labels) ?>;
const data   = <?= json_encode($chart_data) ?>;

const grad = ctx.createLinearGradient(0, 0, 0, 180);
grad.addColorStop(0, 'rgba(232,98,42,.35)');
grad.addColorStop(1, 'rgba(232,98,42,.0)');

new Chart(ctx, {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      data,
      backgroundColor: data.map((_,i) => i === data.length-1 ? 'rgba(232,98,42,.85)' : 'rgba(196,154,60,.45)'),
      borderColor: data.map((_,i) => i === data.length-1 ? '#E8622A' : '#C49A3C'),
      borderWidth: 1.5,
      borderRadius: 6,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => '฿' + ctx.parsed.y.toLocaleString('th-TH', {minimumFractionDigits:0})
        },
        backgroundColor: '#1A1F31',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        titleColor: '#EAF0FA',
        bodyColor: '#C49A3C',
        padding: 10,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#7A8499', font: { family: "'Fira Code'", size: 11 } },
        border: { color: 'rgba(255,255,255,.06)' }
      },
      y: {
        grid: { color: 'rgba(255,255,255,.05)' },
        ticks: {
          color: '#7A8499', font: { family: "'Fira Code'", size: 11 },
          callback: v => '฿' + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v)
        },
        border: { color: 'rgba(255,255,255,.06)' }
      }
    }
  }
});
</script>
</body>
</html>
