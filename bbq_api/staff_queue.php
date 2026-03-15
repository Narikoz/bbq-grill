<?php
// staff_queue.php — Staff queue management
include 'db.php';
session_start();
if (empty($_SESSION['emp_id'])) { header('Location: login.php'); exit; }

define('PRICE_PER_PERSON', 299);

/* ── Process POST actions ── */
$action_msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action   = trim($_POST['action']   ?? '');
    $queue_id = (int)($_POST['queue_id'] ?? 0);

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("SELECT * FROM queues WHERE queue_id=? FOR UPDATE");
        $stmt->bind_param("i", $queue_id); $stmt->execute();
        $q = $stmt->get_result()->fetch_assoc(); $stmt->close();
        if (!$q) throw new Exception("ไม่พบคิว");

        switch ($action) {
            case 'confirm':
                if ($q['queue_status'] !== 'WAITING') throw new Exception("ต้องเป็นสถานะรอยืนยัน");
                $conn->prepare("UPDATE queues SET queue_status='CONFIRMED', confirmed_at=NOW() WHERE queue_id=?")
                     ->bind_param("i",$queue_id) || null;
                $s = $conn->prepare("UPDATE queues SET queue_status='CONFIRMED', confirmed_at=NOW() WHERE queue_id=?");
                $s->bind_param("i",$queue_id); $s->execute();
                break;

            case 'seat_with_table':
                $table_id = (int)($_POST['table_id'] ?? 0);
                if ($q['queue_status'] !== 'CONFIRMED') throw new Exception("ต้องยืนยันก่อน");
                if ($table_id <= 0) throw new Exception("เลือกโต๊ะก่อน");
                if ($q['pay_token']) {
                    $ps = $conn->prepare("SELECT payment_id FROM payments WHERE queue_id=? LIMIT 1");
                    $ps->bind_param("i",$queue_id); $ps->execute();
                    if (!$ps->get_result()->fetch_assoc()) throw new Exception("ต้องชำระ QR ก่อน");
                }
                $st = $conn->prepare("SELECT status FROM tables WHERE table_id=? FOR UPDATE");
                $st->bind_param("i",$table_id); $st->execute();
                $tbl = $st->get_result()->fetch_assoc();
                if (!$tbl || $tbl['status'] !== 'AVAILABLE') throw new Exception("โต๊ะไม่ว่าง");
                $conn->prepare("UPDATE tables SET status='OCCUPIED' WHERE table_id=?")
                     ->bind_param("i",$table_id);
                $ts = $conn->prepare("UPDATE tables SET status='OCCUPIED' WHERE table_id=?");
                $ts->bind_param("i",$table_id); $ts->execute();
                $us = $conn->prepare("UPDATE queues SET table_id=?,queue_status='SEATED',seated_at=NOW() WHERE queue_id=?");
                $us->bind_param("ii",$table_id,$queue_id); $us->execute();
                break;

            case 'finish_cash': case 'finish_card':
                if ($q['queue_status'] !== 'SEATED') throw new Exception("ต้องนั่งโต๊ะก่อน");
                $ps = $conn->prepare("SELECT payment_id FROM payments WHERE queue_id=? LIMIT 1 FOR UPDATE");
                $ps->bind_param("i",$queue_id); $ps->execute();
                if ($ps->get_result()->fetch_assoc()) { $conn->commit(); $action_msg='paid_already'; break; }
                $pax = (int)$q['pax_amount'];
                $sub = $pax * PRICE_PER_PERSON;
                $svc = round($sub * .10, 2); $vat = round(($sub+$svc)*.07, 2);
                $grand = $sub + $svc + $vat;
                $pm = $action === 'finish_cash' ? 'CASH' : 'CARD';
                $ins = $conn->prepare("INSERT INTO payments (queue_id,subtotal_amount,service_amount,vat_amount,total_amount,payment_method) VALUES (?,?,?,?,?,?)");
                $ins->bind_param("idddds",$queue_id,$sub,$svc,$vat,$grand,$pm); $ins->execute();
                $fin = $conn->prepare("UPDATE queues SET queue_status='FINISHED',finished_at=NOW() WHERE queue_id=?");
                $fin->bind_param("i",$queue_id); $fin->execute();
                if ((int)$q['table_id']) {
                    $ft = $conn->prepare("UPDATE tables SET status='AVAILABLE' WHERE table_id=?");
                    $ft->bind_param("i",(int)$q['table_id']); $ft->execute();
                }
                break;

            case 'cancel':
                if (in_array($q['queue_status'],['CANCELLED','FINISHED'])) throw new Exception("ยกเลิกไม่ได้แล้ว");
                $cx = $conn->prepare("UPDATE queues SET queue_status='CANCELLED',cancelled_at=NOW(),table_id=NULL WHERE queue_id=?");
                $cx->bind_param("i",$queue_id); $cx->execute();
                if ((int)$q['table_id']) {
                    $ct = $conn->prepare("UPDATE tables SET status='AVAILABLE' WHERE table_id=?");
                    $ct->bind_param("i",(int)$q['table_id']); $ct->execute();
                }
                break;

            case 'regen_qr':
                $tok = bin2hex(random_bytes(16));
                $exp = date('Y-m-d H:i:s', time()+15*60);
                $rq = $conn->prepare("UPDATE queues SET pay_token=?,pay_token_expires=? WHERE queue_id=?");
                $rq->bind_param("ssi",$tok,$exp,$queue_id); $rq->execute();
                break;
        }
        $conn->commit();
    } catch(Throwable $e) {
        $conn->rollback();
        $action_msg = $e->getMessage();
    }
    header('Location: staff_queue.php' . ($action_msg ? '?err='.urlencode($action_msg) : ''));
    exit;
}

/* ── Load data ── */
$today = date('Y-m-d');
$filter = $_GET['filter'] ?? 'active';
$err_msg = $_GET['err'] ?? '';

$where = ["DATE(q.created_at) = '$today'"];
if ($filter === 'active') $where[] = "q.queue_status IN ('WAITING','CONFIRMED','SEATED')";
elseif (in_array($filter, ['WAITING','CONFIRMED','SEATED','FINISHED','CANCELLED'], true))
    $where[] = "q.queue_status = '$filter'";

$sql = "SELECT q.*, c.customer_name, c.customer_tel, t.table_number,
               p.payment_id, p.total_amount, p.payment_method, p.payment_time
        FROM queues q
        JOIN customers c ON q.customer_id = c.customer_id
        LEFT JOIN tables t ON q.table_id = t.table_id
        LEFT JOIN payments p ON p.queue_id = q.queue_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY q.created_at ASC LIMIT 300";
$queues = $conn->query($sql)->fetch_all(MYSQLI_ASSOC);

$tables_res = $conn->query("SELECT * FROM tables WHERE status='AVAILABLE' ORDER BY capacity, table_number");
$avail_tables = $tables_res->fetch_all(MYSQLI_ASSOC);

// KPI
$kpi = ['WAITING'=>0,'CONFIRMED'=>0,'SEATED'=>0,'FINISHED'=>0,'CANCELLED'=>0];
foreach ($queues as $q) if (isset($kpi[$q['queue_status']])) $kpi[$q['queue_status']]++;

function qfmt(int $id): string { return '#'.str_pad($id,4,'0',STR_PAD_LEFT); }
function status_label(string $s): string {
    return ['WAITING'=>'รอยืนยัน','CONFIRMED'=>'ยืนยันแล้ว','SEATED'=>'นั่งโต๊ะ','FINISHED'=>'เสร็จสิ้น','CANCELLED'=>'ยกเลิก'][$s] ?? $s;
}
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>จัดการคิว — BBQ GRILL</title>
<link rel="stylesheet" href="theme.css">
<style>
body { overflow: hidden; }

/* ── Shell ── */
.shell { display: flex; height: 100dvh; }

/* ── Sidebar ── */
.sidebar {
  width: 220px; flex-shrink: 0;
  background: var(--cinder);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: relative; z-index: 2;
}
.sb-top { padding: 24px 20px 20px; border-bottom: 1px solid var(--border); }
.sb-brand {
  font-family: var(--font-display); font-size: 1.3rem; font-weight: 700;
  color: var(--ash); letter-spacing: .04em;
  display: flex; align-items: center; gap: 8px;
}
.sb-sub { font-size: .72rem; color: var(--smoke); margin-top: 3px; letter-spacing: .05em; text-transform: uppercase; }

.sb-nav { padding: 14px 12px; flex: 1; overflow-y: auto; }
.nav-label { font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--haze); padding: 8px 8px 4px; }
.nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: var(--r-sm);
  color: var(--smoke); font-size: .86rem; font-weight: 600;
  text-decoration: none; cursor: pointer; margin-bottom: 2px;
  transition: all .18s; border: 1px solid transparent;
}
.nav-item:hover { background: var(--surface2); color: var(--ash); }
.nav-item.active {
  background: rgba(232,98,42,.12); border-color: rgba(232,98,42,.22);
  color: var(--ember-hi);
}
.nav-item i { width: 16px; text-align: center; font-size: .95rem; }
.nav-count {
  margin-left: auto;
  background: var(--ember); color: #fff;
  font-size: .62rem; font-weight: 700;
  padding: 1px 6px; border-radius: 99px;
  min-width: 18px; text-align: center;
}

.sb-footer {
  padding: 16px 20px; border-top: 1px solid var(--border);
}
.user-chip {
  display: flex; align-items: center; gap: 9px; margin-bottom: 12px;
}
.user-avatar {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(232,98,42,.25), rgba(196,154,60,.20));
  border: 1px solid rgba(232,98,42,.25);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .85rem; color: var(--ember-hi);
}
.user-name { font-weight: 700; font-size: .83rem; }
.user-role-badge { font-size: .65rem; }

/* ── Main ── */
.main {
  flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden;
}

/* ── Topbar ── */
.topbar {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,.02);
  flex-shrink: 0;
}
.topbar-title { font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; flex: 1; }
.live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--jade);
  box-shadow: 0 0 0 3px rgba(34,201,122,.25);
  animation: pulse-live 2s ease-in-out infinite;
}
@keyframes pulse-live {
  0%,100%{ box-shadow: 0 0 0 3px rgba(34,201,122,.25); }
  50%    { box-shadow: 0 0 0 7px rgba(34,201,122,.10); }
}
.topbar-time { font-family: var(--font-mono); font-size: .78rem; color: var(--smoke); }
.refresh-btn {
  width: 34px; height: 34px; border-radius: var(--r-sm);
  background: var(--surface); border: 1px solid var(--border);
  color: var(--smoke); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.refresh-btn:hover { background: var(--surface2); color: var(--ash); }
.refresh-btn.spinning i { animation: spin .6s linear infinite; }

/* ── KPI strip ── */
.kpi-strip {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
  padding: 14px 24px; flex-shrink: 0;
}
.kpi-tile {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-sm); padding: 12px 14px;
  text-align: center; position: relative; overflow: hidden;
  transition: border-color .2s;
}
.kpi-tile:hover { border-color: var(--border2); }
.kpi-tile::before {
  content: ''; position: absolute; inset: 0; opacity: 0;
  transition: opacity .3s;
}
.kpi-waiting::before   { background: rgba(196,154,60,.06); }
.kpi-confirmed::before { background: rgba(91,156,246,.06); }
.kpi-seated::before    { background: rgba(34,201,122,.06); }
.kpi-finished::before  { background: rgba(122,132,153,.04); }
.kpi-total::before     { background: rgba(232,98,42,.06); }
.kpi-tile:hover::before { opacity: 1; }
.kpi-num {
  font-family: var(--font-mono); font-size: 1.7rem; font-weight: 600;
  line-height: 1; position: relative; z-index: 1;
}
.kpi-lbl { font-size: .7rem; color: var(--smoke); margin-top: 3px; position: relative; z-index: 1; }

/* ── Filter tabs ── */
.filter-bar { display: flex; gap: 6px; padding: 0 24px 14px; flex-shrink: 0; overflow-x: auto; }
.ftab {
  padding: 6px 14px; border-radius: 99px;
  font-size: .78rem; font-weight: 700; cursor: pointer;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--smoke); white-space: nowrap;
  transition: all .18s; text-decoration: none; display: flex; align-items: center; gap: 5px;
}
.ftab:hover { background: var(--surface2); color: var(--ash); }
.ftab.active { background: rgba(232,98,42,.12); border-color: rgba(232,98,42,.30); color: var(--ember-hi); }

/* ── Error bar ── */
.err-bar {
  margin: 0 24px 14px;
  background: rgba(232,64,74,.10); border: 1px solid rgba(232,64,74,.22);
  border-radius: var(--r-sm); padding: 10px 14px;
  color: #fca5a5; font-size: .84rem; display: flex; align-items: center; gap: 8px;
}

/* ── Queue grid ── */
.queue-area { flex: 1; overflow-y: auto; padding: 0 24px 24px; }
.queue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

/* ── Queue card ── */
.qcard {
  background: linear-gradient(145deg, rgba(255,255,255,.065), rgba(255,255,255,.03));
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  transition: transform .2s ease, border-color .2s, box-shadow .2s;
  position: relative;
}
.qcard:hover { transform: translateY(-2px); border-color: var(--border2); box-shadow: var(--shadow-sm); }
.qcard-accent {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  border-radius: 2px 0 0 2px;
}
.qcard.waiting   .qcard-accent { background: var(--gold); }
.qcard.confirmed .qcard-accent { background: var(--azure); }
.qcard.seated    .qcard-accent { background: var(--jade); }
.qcard.finished  .qcard-accent { background: var(--haze); }
.qcard.cancelled .qcard-accent { background: var(--crimson); opacity: .5; }
.qcard.finished, .qcard.cancelled { opacity: .65; }

.qcard-head {
  padding: 12px 14px 10px 18px;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
}
.qcard-id {
  font-family: var(--font-mono); font-size: .88rem; font-weight: 600;
  color: var(--gold-hi); letter-spacing: .04em;
}
.qcard-badges { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }

.qcard-body { padding: 0 14px 12px 18px; }
.qcard-name { font-weight: 700; font-size: .97rem; margin-bottom: 3px; }
.qcard-meta {
  display: flex; gap: 10px; flex-wrap: wrap;
  font-size: .78rem; color: var(--smoke);
}
.qcard-meta span { display: flex; align-items: center; gap: 4px; }

.qcard-footer {
  padding: 10px 14px 13px 18px;
  border-top: 1px solid rgba(255,255,255,.05);
  display: flex; gap: 7px; flex-wrap: wrap; align-items: center;
}

.table-row {
  display: flex; gap: 7px; align-items: center; width: 100%;
}
.table-row select { flex: 1; font-size: .8rem; padding: 7px 10px; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(5,7,13,.82); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  width: 100%; max-width: 400px;
  background: linear-gradient(160deg, var(--smolder), var(--cinder));
  border: 1px solid var(--border2);
  border-radius: var(--r-xl); padding: 32px 28px;
  box-shadow: var(--shadow-lg);
  animation: slideUp .4s cubic-bezier(.34,1.2,.64,1) both;
}
.modal-icon { font-size: 2rem; margin-bottom: 14px; }
.modal-title { font-family: var(--font-display); font-size: 1.3rem; font-weight: 600; margin-bottom: 8px; }
.modal-sub   { color: var(--smoke); font-size: .86rem; margin-bottom: 18px; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }

/* Empty state */
.empty-state {
  text-align: center; padding: 80px 20px; color: var(--haze);
}
.empty-state i { font-size: 2.8rem; opacity: .35; display: block; margin-bottom: 14px; }

@media (max-width: 768px) {
  body { overflow: auto; }
  .shell { flex-direction: column; height: auto; }
  .sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; padding: 0; }
  .sb-top { border-right: 1px solid var(--border); border-bottom: none; flex: 1; }
  .sb-nav { display: flex; flex-direction: row; gap: 4px; padding: 8px; }
  .nav-label { display: none; }
  .sb-footer { display: none; }
  .main { overflow: visible; }
  .body { overflow: visible; }
  .kpi-strip { grid-template-columns: repeat(3, 1fr); }
  .queue-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="shell">

<!-- ═══ SIDEBAR ═══ -->
<aside class="sidebar">
  <div class="sb-top">
    <div class="sb-brand">🔥 BBQ GRILL</div>
    <div class="sb-sub">Queue Dashboard</div>
  </div>

  <nav class="sb-nav">
    <div class="nav-label">คิว</div>
    <a href="?filter=active" class="nav-item <?= $filter==='active'?'active':'' ?>">
      <i class="bi bi-grid-3x3-gap-fill"></i> ทั้งหมด (Active)
      <?php if ($kpi['WAITING']): ?><span class="nav-count"><?= $kpi['WAITING'] ?></span><?php endif; ?>
    </a>
    <a href="?filter=WAITING" class="nav-item <?= $filter==='WAITING'?'active':'' ?>">
      <i class="bi bi-hourglass-split"></i> รอยืนยัน
    </a>
    <a href="?filter=CONFIRMED" class="nav-item <?= $filter==='CONFIRMED'?'active':'' ?>">
      <i class="bi bi-check-circle"></i> ยืนยันแล้ว
    </a>
    <a href="?filter=SEATED" class="nav-item <?= $filter==='SEATED'?'active':'' ?>">
      <i class="bi bi-person-workspace"></i> นั่งโต๊ะ
    </a>
    <a href="?filter=FINISHED" class="nav-item <?= $filter==='FINISHED'?'active':'' ?>">
      <i class="bi bi-check2-all"></i> เสร็จสิ้น
    </a>

    <?php if ($_SESSION['role'] === 'ADMIN'): ?>
    <div class="nav-label" style="margin-top:8px;">Admin</div>
    <a href="admin.php" class="nav-item">
      <i class="bi bi-bar-chart-line"></i> รายงาน
    </a>
    <a href="admin_employees.php" class="nav-item">
      <i class="bi bi-people"></i> พนักงาน
    </a>
    <?php endif; ?>

    <div class="nav-label" style="margin-top:8px;">อื่นๆ</div>
    <a href="index.php" class="nav-item">
      <i class="bi bi-house"></i> หน้าจองลูกค้า
    </a>
    <a href="history.php" class="nav-item">
      <i class="bi bi-clock-history"></i> ประวัติ
    </a>
  </nav>

  <div class="sb-footer">
    <div class="user-chip">
      <div class="user-avatar"><?= mb_substr($_SESSION['emp_name'], 0, 1) ?></div>
      <div>
        <div class="user-name"><?= htmlspecialchars($_SESSION['emp_name']) ?></div>
        <span class="badge <?= $_SESSION['role']==='ADMIN'?'badge-admin':'badge-qr' ?> user-role-badge">
          <?= $_SESSION['role'] ?>
        </span>
      </div>
    </div>
    <a href="logout.php" class="btn btn-ghost btn-sm btn-wide" style="text-decoration:none;">
      <i class="bi bi-box-arrow-right"></i> ออกจากระบบ
    </a>
  </div>
</aside>

<!-- ═══ MAIN ═══ -->
<main class="main">

  <!-- Topbar -->
  <div class="topbar">
    <div class="live-dot"></div>
    <div class="topbar-title">คิววันที่ <?= date('d/m/Y') ?></div>
    <div class="topbar-time" id="clock"></div>
    <button class="refresh-btn" id="refreshBtn" onclick="refreshPage()" title="รีเฟรช">
      <i class="bi bi-arrow-clockwise"></i>
    </button>
  </div>

  <!-- KPI -->
  <div class="kpi-strip">
    <div class="kpi-tile kpi-waiting">
      <div class="kpi-num" style="color:var(--gold-hi)"><?= $kpi['WAITING'] ?></div>
      <div class="kpi-lbl">รอยืนยัน</div>
    </div>
    <div class="kpi-tile kpi-confirmed">
      <div class="kpi-num" style="color:var(--azure)"><?= $kpi['CONFIRMED'] ?></div>
      <div class="kpi-lbl">ยืนยันแล้ว</div>
    </div>
    <div class="kpi-tile kpi-seated">
      <div class="kpi-num" style="color:var(--jade)"><?= $kpi['SEATED'] ?></div>
      <div class="kpi-lbl">นั่งโต๊ะ</div>
    </div>
    <div class="kpi-tile kpi-finished">
      <div class="kpi-num" style="color:var(--smoke)"><?= $kpi['FINISHED'] ?></div>
      <div class="kpi-lbl">เสร็จสิ้น</div>
    </div>
    <div class="kpi-tile kpi-total">
      <div class="kpi-num" style="color:var(--ember-hi)"><?= count($queues) ?></div>
      <div class="kpi-lbl">ทั้งหมด</div>
    </div>
  </div>

  <!-- Error -->
  <?php if ($err_msg): ?>
  <div class="err-bar"><i class="bi bi-exclamation-triangle-fill"></i> <?= htmlspecialchars($err_msg) ?></div>
  <?php endif; ?>

  <!-- Queue area -->
  <div class="queue-area">
    <?php if (empty($queues)): ?>
    <div class="empty-state">
      <i class="bi bi-inbox"></i>
      ไม่มีคิวในขณะนี้
    </div>
    <?php else: ?>
    <div class="queue-grid">
      <?php foreach ($queues as $q):
        $status = $q['queue_status'];
        $is_paid = !empty($q['payment_id']);
        $is_qr   = !empty($q['pay_token']);
        $pax = (int)$q['pax_amount'];
        $grand = $pax * 299 * 1.10 * 1.07;
      ?>
      <div class="qcard <?= strtolower($status) ?> fade-in">
        <div class="qcard-accent"></div>
        <div class="qcard-head">
          <div>
            <div class="qcard-id"><?= qfmt((int)$q['queue_id']) ?></div>
            <div style="font-size:.7rem;color:var(--haze);margin-top:2px;font-family:var(--font-mono)">
              <?= date('H:i', strtotime($q['created_at'])) ?>
            </div>
          </div>
          <div class="qcard-badges">
            <span class="badge badge-<?= strtolower($status) ?>"><?= status_label($status) ?></span>
            <?php if ($is_paid): ?><span class="badge badge-paid">PAID</span><?php endif; ?>
            <?php if ($is_qr && !$is_paid): ?><span class="badge badge-qr">QR</span><?php endif; ?>
          </div>
        </div>

        <div class="qcard-body">
          <div class="qcard-name"><?= htmlspecialchars($q['customer_name']) ?></div>
          <div class="qcard-meta">
            <span><i class="bi bi-phone"></i><?= htmlspecialchars($q['customer_tel']) ?></span>
            <span><i class="bi bi-people"></i><?= $pax ?> คน</span>
            <?php if ($q['table_number']): ?><span><i class="bi bi-grid-1x2"></i>โต๊ะ #<?= $q['table_number'] ?></span><?php endif; ?>
            <span style="color:var(--haze);font-family:var(--font-mono);font-size:.72rem;">฿<?= number_format($grand,0) ?></span>
          </div>
        </div>

        <div class="qcard-footer">
          <?php if ($status === 'WAITING'): ?>
            <?php if ($is_qr && !$is_paid): ?>
              <form method="POST" style="display:inline">
                <input type="hidden" name="action" value="regen_qr">
                <input type="hidden" name="queue_id" value="<?= $q['queue_id'] ?>">
                <button class="btn btn-ghost btn-sm"><i class="bi bi-qr-code"></i> ออก QR ใหม่</button>
              </form>
            <?php else: ?>
              <form method="POST" style="display:inline">
                <input type="hidden" name="action" value="confirm">
                <input type="hidden" name="queue_id" value="<?= $q['queue_id'] ?>">
                <button class="btn btn-jade btn-sm"><i class="bi bi-check-lg"></i> ยืนยัน</button>
              </form>
            <?php endif; ?>
            <button class="btn btn-danger btn-sm" onclick="showCancel(<?= $q['queue_id'] ?>, '<?= htmlspecialchars($q['customer_name'], ENT_QUOTES) ?>')">
              <i class="bi bi-x-lg"></i>
            </button>

          <?php elseif ($status === 'CONFIRMED'): ?>
            <?php if ($is_qr && !$is_paid): ?>
              <span style="color:var(--smoke);font-size:.8rem;"><i class="bi bi-hourglass-split"></i> รอชำระ QR</span>
            <?php else: ?>
              <form method="POST" class="table-row">
                <input type="hidden" name="action" value="seat_with_table">
                <input type="hidden" name="queue_id" value="<?= $q['queue_id'] ?>">
                <select name="table_id" class="input" required>
                  <option value="">— เลือกโต๊ะ —</option>
                  <?php foreach ($avail_tables as $t): ?>
                  <option value="<?= $t['table_id'] ?>">โต๊ะ #<?= $t['table_number'] ?> (<?= $t['capacity'] ?> ที่)</option>
                  <?php endforeach; ?>
                </select>
                <button class="btn btn-gold btn-sm" type="submit">นั่งโต๊ะ</button>
              </form>
            <?php endif; ?>
            <button class="btn btn-danger btn-sm" onclick="showCancel(<?= $q['queue_id'] ?>, '<?= htmlspecialchars($q['customer_name'], ENT_QUOTES) ?>')">
              <i class="bi bi-x-lg"></i>
            </button>

          <?php elseif ($status === 'SEATED'): ?>
            <form method="POST" style="display:inline">
              <input type="hidden" name="action" value="finish_cash">
              <input type="hidden" name="queue_id" value="<?= $q['queue_id'] ?>">
              <button class="btn btn-gold btn-sm"><i class="bi bi-cash"></i> เงินสด</button>
            </form>
            <form method="POST" style="display:inline">
              <input type="hidden" name="action" value="finish_card">
              <input type="hidden" name="queue_id" value="<?= $q['queue_id'] ?>">
              <button class="btn btn-ghost btn-sm"><i class="bi bi-credit-card"></i> บัตร</button>
            </form>
            <button class="btn btn-danger btn-sm" onclick="showCancel(<?= $q['queue_id'] ?>, '<?= htmlspecialchars($q['customer_name'], ENT_QUOTES) ?>')">
              <i class="bi bi-x-lg"></i>
            </button>

          <?php elseif ($status === 'FINISHED' && $is_paid): ?>
            <a href="receipt.php?queue_id=<?= $q['queue_id'] ?>" class="btn btn-ghost btn-sm" style="text-decoration:none;">
              <i class="bi bi-receipt"></i> ใบเสร็จ
            </a>
          <?php endif; ?>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>

</main>
</div>

<!-- Cancel modal -->
<div class="modal-overlay" id="cancelModal" style="display:none;">
  <div class="modal">
    <div class="modal-icon">⚠️</div>
    <div class="modal-title">ยืนยันการยกเลิก</div>
    <div class="modal-sub" id="cancelSub">คิวนี้จะถูกยกเลิก</div>
    <div class="alert alert-warning" style="margin:0;">
      <i class="bi bi-exclamation-triangle"></i> ไม่สามารถย้อนกลับได้
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" style="flex:1" onclick="document.getElementById('cancelModal').style.display='none'">
        ไม่ใช่
      </button>
      <form method="POST" style="flex:1;">
        <input type="hidden" name="action" value="cancel">
        <input type="hidden" name="queue_id" id="cancelQid">
        <button type="submit" class="btn btn-danger btn-wide">
          <i class="bi bi-trash3"></i> ยืนยันยกเลิก
        </button>
      </form>
    </div>
  </div>
</div>

<script>
/* Live clock */
function tick() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
tick(); setInterval(tick, 1000);

/* Auto-refresh every 30s */
let autoTimer = setTimeout(() => location.reload(), 30000);

function refreshPage() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  clearTimeout(autoTimer);
  setTimeout(() => location.reload(), 300);
}

/* Cancel modal */
function showCancel(qid, name) {
  document.getElementById('cancelQid').value = qid;
  document.getElementById('cancelSub').textContent = `ต้องการยกเลิกคิวของ "${name}" ใช่ไหม?`;
  document.getElementById('cancelModal').style.display = 'flex';
}
document.getElementById('cancelModal').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});
</script>
</body>
</html>
