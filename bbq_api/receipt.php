<?php
// receipt.php — staff receipt (auth required)
include 'db.php';
session_start();
if (empty($_SESSION['emp_id'])) { header('Location: login.php'); exit; }

$queue_id = (int)($_GET['queue_id'] ?? 0);
if ($queue_id <= 0) die("invalid");

$stmt = $conn->prepare("
    SELECT q.queue_id, q.pax_amount, q.queue_status, q.booking_time,
           c.customer_name, c.customer_tel,
           t.table_number,
           p.payment_method, p.total_amount, p.payment_time,
           p.subtotal_amount, p.service_amount, p.vat_amount
    FROM queues q
    JOIN customers c  ON q.customer_id = c.customer_id
    LEFT JOIN tables t ON q.table_id   = t.table_id
    LEFT JOIN payments p ON p.queue_id = q.queue_id
    WHERE q.queue_id = ?
    ORDER BY p.payment_time DESC LIMIT 1
");
$stmt->bind_param("i", $queue_id);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$d) die("not found");

function qfmt(int $id): string { return '#'.str_pad($id,4,'0',STR_PAD_LEFT); }
function pay_label(string $m): string {
    return ['CASH'=>'เงินสด','QR'=>'QR PromptPay','PROMPTPAY'=>'QR PromptPay','CARD'=>'บัตรเครดิต/เดบิต'][$m] ?? ($m ?: '-');
}
function pay_icon(string $m): string {
    return ['CASH'=>'💵','QR'=>'📱','PROMPTPAY'=>'📱','CARD'=>'💳'][$m] ?? '💰';
}

$ref  = $d['payment_time'] ? strtoupper(substr(md5($queue_id . $d['payment_time']), 0, 10)) : '-';
$paid = !empty($d['payment_time']);
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt <?= qfmt($queue_id) ?> — Staff</title>
<link rel="stylesheet" href="theme.css">
<style>
body {
  display: flex; align-items: flex-start; justify-content: center;
  min-height: 100dvh; padding: 28px 16px 60px;
}
.wrap { width: 100%; max-width: 500px; position: relative; z-index: 1; }

.top-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px;
}
.nav-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-display); font-weight: 700; color: var(--gold-hi);
}
.nav-qid {
  font-family: var(--font-mono); font-size: .82rem; font-weight: 600;
  padding: 5px 13px; border-radius: 99px;
  background: rgba(196,154,60,.10); border: 1px solid rgba(196,154,60,.22);
  color: var(--gold);
}

.receipt { border-radius: 22px; overflow: hidden; box-shadow: var(--shadow-lg); }

.receipt-head {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(232,98,42,.09), rgba(196,154,60,.06));
  border: 1px solid rgba(232,98,42,.15); border-bottom: none;
  border-radius: 22px 22px 0 0;
  display: flex; align-items: center; justify-content: space-between;
}
.rh-title { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; margin-bottom: 3px; }
.rh-sub   { font-family: var(--font-mono); font-size: .75rem; color: var(--smoke); }

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: var(--r-sm);
  font-size: .78rem; font-weight: 700;
}
.status-paid   { background: rgba(34,201,122,.12); border: 1px solid rgba(34,201,122,.22); color: var(--jade); }
.status-unpaid { background: rgba(196,154,60,.10);  border: 1px solid rgba(196,154,60,.22);  color: var(--gold-hi); }

.receipt-body {
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border: 1px solid var(--border); border-top: none;
}

.sec-lbl {
  padding: 12px 24px 6px;
  font-size: .65rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: var(--haze);
}
.rrow {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 24px; border-bottom: 1px solid rgba(255,255,255,.04); gap: 12px;
}
.rrow:last-of-type { border-bottom: none; }
.rk { color: var(--smoke); font-size: .83rem; }
.rv { font-weight: 600; font-size: .88rem; text-align: right; }
.rv.mono { font-family: var(--font-mono); font-size: .82rem; }

.dashed { border: none; border-top: 2px dashed rgba(255,255,255,.08); margin: 6px 24px; }

.breakdown { padding: 12px 24px 14px; border-bottom: 1px solid rgba(255,255,255,.05); }
.bk { display: flex; justify-content: space-between; padding: 4px 0; font-size: .82rem; color: var(--smoke); }
.bk b { color: var(--ash); font-weight: 600; }

.grand {
  margin: 14px 20px; padding: 15px 18px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(196,154,60,.13), rgba(196,154,60,.06));
  border: 1px solid rgba(196,154,60,.22);
  display: flex; justify-content: space-between; align-items: center;
}
.grand-lbl { font-weight: 700; color: var(--gold-hi); }
.grand-amt { font-family: var(--font-mono); font-size: 1.55rem; font-weight: 600; color: var(--gold-hi); text-shadow: 0 0 22px rgba(196,154,60,.20); }

.pay-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 7px;
  background: rgba(34,201,122,.09); border: 1px solid rgba(34,201,122,.20);
  color: var(--jade); font-weight: 700; font-size: .77rem;
}

.ref-bar {
  margin: 4px 20px 14px; padding: 10px 14px; border-radius: var(--r-sm);
  background: rgba(255,255,255,.03); border: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
}
.ref-lbl { font-size: .67rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--haze); }
.ref-val  { font-family: var(--font-mono); font-size: .78rem; color: var(--smoke); letter-spacing: .1em; }

.receipt-actions {
  border: 1px solid var(--border); border-top: none;
  border-radius: 0 0 22px 22px;
  padding: 18px 20px 22px;
  background: rgba(255,255,255,.02);
  display: flex; gap: 10px;
}

/* PRINT */
@media print {
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body, html { background: #fff !important; color: #000 !important; padding: 0; }
  body::before, body::after { display: none !important; }
  .wrap { max-width: 100%; }
  .top-nav, .receipt-actions { display: none !important; }
  .receipt { box-shadow: none; border-radius: 0; }
  .receipt-head { background: #f8fafc !important; border-color: #e2e8f0 !important; border-radius: 0 !important; }
  .rh-title { color: #000 !important; }
  .rh-sub   { color: #475569 !important; }
  .status-paid   { background: #f0fdf4 !important; border-color: #bbf7d0 !important; color: #16a34a !important; }
  .status-unpaid { background: #fefce8 !important; border-color: #fcd34d !important; color: #92400e !important; }
  .receipt-body { background: #fff !important; border-color: #e2e8f0 !important; }
  .sec-lbl, .rk, .bk { color: #6b7280 !important; }
  .rv, .bk b { color: #000 !important; }
  .rrow { border-color: #f1f5f9 !important; }
  .dashed { border-color: #e2e8f0 !important; }
  .breakdown { border-color: #f1f5f9 !important; }
  .grand { background: #fefce8 !important; border-color: #fcd34d !important; }
  .grand-lbl, .grand-amt { color: #92400e !important; text-shadow: none !important; }
  .pay-badge { background: #f0fdf4 !important; border-color: #bbf7d0 !important; color: #166534 !important; }
  .ref-bar { background: #f9fafb !important; border-color: #e2e8f0 !important; }
  .ref-lbl, .ref-val { color: #6b7280 !important; }
}
</style>
</head>
<body>
<div class="wrap">
  <div class="top-nav">
    <div class="nav-brand">
      <a href="staff_queue.php" style="color:var(--smoke);font-family:var(--font-body);font-size:.82rem;text-decoration:none;display:flex;align-items:center;gap:5px;">
        <i class="bi bi-arrow-left"></i>
      </a>
      🔥 BBQ GRILL <span style="color:var(--smoke);font-weight:400;font-size:.75rem;font-family:var(--font-body);">Staff Receipt</span>
    </div>
    <div class="nav-qid"><?= qfmt($queue_id) ?></div>
  </div>

  <div class="receipt slide-up">
    <div class="receipt-head">
      <div>
        <div class="rh-title">ใบเสร็จรับเงิน</div>
        <div class="rh-sub"><?= $paid ? date('d/m/Y H:i:s', strtotime($d['payment_time'])) : 'ยังไม่ชำระ' ?></div>
      </div>
      <?php if ($paid): ?>
        <div class="status-badge status-paid"><i class="bi bi-check2-circle"></i> PAID</div>
      <?php else: ?>
        <div class="status-badge status-unpaid"><i class="bi bi-clock"></i> UNPAID</div>
      <?php endif; ?>
    </div>

    <div class="receipt-body">
      <div class="sec-lbl">ข้อมูลลูกค้า</div>
      <div class="rrow"><span class="rk">ชื่อ</span><span class="rv"><?= htmlspecialchars($d['customer_name']) ?></span></div>
      <div class="rrow"><span class="rk">เบอร์โทร</span><span class="rv mono"><?= htmlspecialchars($d['customer_tel']) ?></span></div>
      <div class="rrow"><span class="rk">จำนวนคน</span><span class="rv"><?= (int)$d['pax_amount'] ?> คน</span></div>
      <?php if ($d['table_number']): ?>
      <div class="rrow"><span class="rk">โต๊ะ</span><span class="rv">#<?= (int)$d['table_number'] ?></span></div>
      <?php endif; ?>
      <div class="rrow"><span class="rk">เวลาจอง</span><span class="rv mono"><?= date('d/m/Y H:i', strtotime($d['booking_time'])) ?></span></div>

      <hr class="dashed">
      <div class="sec-lbl">รายการ</div>
      <div class="breakdown">
        <div class="bk">
          <span>ค่าอาหาร (<?= (int)$d['pax_amount'] ?> × ฿<?= number_format((float)($d['subtotal_amount']??0)/max(1,(int)$d['pax_amount']),0) ?>)</span>
          <b>฿<?= number_format((float)($d['subtotal_amount']??0),2) ?></b>
        </div>
        <div class="bk"><span>ค่าบริการ (10%)</span><b>฿<?= number_format((float)($d['service_amount']??0),2) ?></b></div>
        <div class="bk"><span>VAT (7%)</span><b>฿<?= number_format((float)($d['vat_amount']??0),2) ?></b></div>
      </div>

      <div class="grand">
        <span class="grand-lbl">ยอดรวมสุทธิ</span>
        <span class="grand-amt">฿<?= number_format((float)($d['total_amount']??0),2) ?></span>
      </div>

      <?php if ($paid): ?>
      <div class="rrow">
        <span class="rk">วิธีชำระ</span>
        <span class="rv"><span class="pay-badge"><?= pay_icon($d['payment_method']) ?> <?= pay_label($d['payment_method']) ?></span></span>
      </div>
      <div class="rrow"><span class="rk">เวลาชำระ</span><span class="rv mono"><?= date('d/m/Y H:i:s', strtotime($d['payment_time'])) ?></span></div>
      <?php endif; ?>

      <div class="ref-bar">
        <span class="ref-lbl">เลขอ้างอิง</span>
        <span class="ref-val"><?= $ref ?></span>
      </div>
    </div>

    <div class="receipt-actions">
      <button onclick="window.print()" class="btn btn-jade" style="flex:1;">
        <i class="bi bi-printer-fill"></i> พิมพ์
      </button>
      <a href="staff_queue.php" class="btn btn-ghost" style="flex:1; text-decoration:none; text-align:center;">
        <i class="bi bi-arrow-left"></i> กลับ
      </a>
    </div>
  </div>
</div>
</body>
</html>
