<?php
// receipt_public.php — public customer receipt (token-protected)
include 'db.php';

$queue_id = (int)($_GET['queue_id'] ?? 0);
$token    = trim($_GET['token'] ?? '');

if ($queue_id <= 0 || $token === '') { http_response_code(400); die("ข้อมูลไม่ถูกต้อง"); }

$stmt = $conn->prepare("
    SELECT q.queue_id, q.pax_amount, q.booking_time, q.pay_token,
           c.customer_name, c.customer_tel,
           t.table_number,
           p.subtotal_amount, p.service_amount, p.vat_amount,
           p.total_amount, p.payment_method, p.payment_time
    FROM queues q
    JOIN customers c  ON q.customer_id = c.customer_id
    LEFT JOIN tables t ON q.table_id   = t.table_id
    LEFT JOIN payments p ON p.queue_id = q.queue_id
    WHERE q.queue_id = ?
    ORDER BY p.payment_time DESC LIMIT 1
");
$stmt->bind_param("i", $queue_id); $stmt->execute();
$d = $stmt->get_result()->fetch_assoc(); $stmt->close();

if (!$d) { http_response_code(404); die("ไม่พบข้อมูล"); }
if (empty($d['pay_token']) || !hash_equals((string)$d['pay_token'], (string)$token)) {
    http_response_code(403); die("ลิงก์ไม่ถูกต้อง");
}

function qfmt(int $id): string { return '#'.str_pad($id,4,'0',STR_PAD_LEFT); }
function pay_label(string $m): string {
    return ['CASH'=>'เงินสด','QR'=>'QR PromptPay','PROMPTPAY'=>'QR PromptPay','CARD'=>'บัตรเครดิต/เดบิต'][$m] ?? $m;
}
function pay_icon(string $m): string {
    return ['CASH'=>'💵','QR'=>'📱','PROMPTPAY'=>'📱','CARD'=>'💳'][$m] ?? '💰';
}

$ref = strtoupper(substr(md5($queue_id . ($d['payment_time'] ?? '')), 0, 10));
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>ใบเสร็จ <?= qfmt($queue_id) ?> — BBQ GRILL</title>
<link rel="stylesheet" href="theme.css">
<style>
body {
  display: flex; align-items: flex-start; justify-content: center;
  min-height: 100dvh; padding: 28px 16px 60px;
}

.wrap { width: 100%; max-width: 460px; position: relative; z-index: 1; }

/* ── Top nav (hidden on print) ── */
.top-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px;
}
.nav-brand {
  font-family: var(--font-display); font-weight: 700; font-size: 1rem;
  color: var(--gold-hi); letter-spacing: .06em;
  display: flex; align-items: center; gap: 8px;
}
.nav-qid {
  font-family: var(--font-mono); font-size: .82rem; font-weight: 600;
  padding: 5px 13px; border-radius: 99px;
  background: rgba(196,154,60,.10); border: 1px solid rgba(196,154,60,.22);
  color: var(--gold);
}

/* ── Receipt card ── */
.receipt {
  border-radius: 22px; overflow: hidden;
  box-shadow: var(--shadow-lg);
}

/* Success head */
.success-head {
  text-align: center; padding: 34px 24px 28px;
  background: linear-gradient(180deg, rgba(34,201,122,.14), rgba(34,201,122,.05));
  border: 1px solid rgba(34,201,122,.18); border-bottom: none;
  border-radius: 22px 22px 0 0;
}
.check-ring {
  width: 70px; height: 70px; border-radius: 50%;
  background: linear-gradient(135deg, #36E892, var(--jade-dk));
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px; font-size: 1.8rem; color: #fff;
  box-shadow:
    0 0 0 9px rgba(34,201,122,.10),
    0 0 0 18px rgba(34,201,122,.05),
    0 20px 50px rgba(34,201,122,.22);
  animation: pop .5s cubic-bezier(.34,1.56,.64,1) both .15s;
}
.success-title {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; margin-bottom: 4px;
}
.success-sub { color: rgba(34,201,122,.8); font-size: .84rem; }

/* Store strip */
.store-strip {
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.04));
  border: 1px solid var(--border); border-top: none; border-bottom: none;
  padding: 16px 22px;
  display: flex; align-items: center; justify-content: space-between;
}
.store-name {
  font-family: var(--font-display); font-weight: 700; font-size: 1.1rem;
  color: var(--gold-hi); letter-spacing: .06em;
}
.store-sub { color: var(--smoke); font-size: .72rem; margin-top: 2px; }

/* Body */
.receipt-body {
  background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.03));
  border: 1px solid var(--border); border-top: none;
}

.sec-lbl {
  padding: 12px 22px 6px;
  font-size: .65rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: var(--haze);
}
.rrow {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 22px; border-bottom: 1px solid rgba(255,255,255,.04); gap: 12px;
}
.rrow:last-of-type { border-bottom: none; }
.rk { color: var(--smoke); font-size: .83rem; }
.rv { font-weight: 600; font-size: .88rem; text-align: right; }
.rv.mono { font-family: var(--font-mono); font-size: .82rem; }

.dashed { border: none; border-top: 2px dashed rgba(255,255,255,.08); margin: 6px 22px; }

/* Breakdown */
.breakdown {
  padding: 12px 22px 14px; border-bottom: 1px solid rgba(255,255,255,.05);
}
.bk { display: flex; justify-content: space-between; padding: 4px 0; font-size: .82rem; color: var(--smoke); }
.bk b { color: var(--ash); font-weight: 600; }

/* Grand total */
.grand {
  margin: 14px 18px;
  padding: 15px 18px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(196,154,60,.13), rgba(196,154,60,.06));
  border: 1px solid rgba(196,154,60,.22);
  display: flex; justify-content: space-between; align-items: center;
}
.grand-lbl { font-weight: 700; color: var(--gold-hi); }
.grand-amt {
  font-family: var(--font-mono); font-size: 1.6rem; font-weight: 600;
  color: var(--gold-hi); text-shadow: 0 0 25px rgba(196,154,60,.22);
}

/* Pay badge */
.pay-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 7px;
  background: rgba(34,201,122,.09); border: 1px solid rgba(34,201,122,.20);
  color: var(--jade); font-weight: 700; font-size: .77rem;
}

/* Ref */
.ref-bar {
  margin: 4px 18px 14px;
  padding: 10px 14px; border-radius: var(--r-sm);
  background: rgba(255,255,255,.03); border: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
}
.ref-lbl { font-size: .67rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--haze); }
.ref-val  { font-family: var(--font-mono); font-size: .78rem; color: var(--smoke); letter-spacing: .1em; }

/* Actions */
.receipt-actions {
  border: 1px solid var(--border); border-top: none;
  border-radius: 0 0 22px 22px;
  padding: 18px 18px 22px;
  background: rgba(255,255,255,.02);
  display: flex; gap: 10px;
}

/* Footer */
.receipt-footer {
  text-align: center; margin-top: 20px;
  color: var(--haze); font-size: .73rem; line-height: 1.7; opacity: .8;
}
.receipt-footer strong { color: var(--gold); opacity: 1; }

/* ════════════ PRINT ════════════ */
@media print {
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body, html {
    background: #fff !important; color: #000 !important;
    padding: 0; margin: 0;
  }
  body::before, body::after { display: none !important; }

  .wrap { max-width: 100%; }
  .top-nav, .receipt-actions, .receipt-footer { display: none !important; }

  .receipt { box-shadow: none; border-radius: 0; }

  .success-head {
    background: #f0fdf4 !important; border-color: #bbf7d0 !important;
    border-radius: 0 !important;
  }
  .check-ring {
    background: #22c55e !important; box-shadow: none !important; animation: none !important; color: #fff !important;
  }
  .success-title { color: #000 !important; }
  .success-sub   { color: #16a34a !important; }

  .store-strip   { background: #fafafa !important; border-color: #e5e7eb !important; }
  .store-name    { color: #92400e !important; -webkit-text-fill-color: #92400e !important; }
  .store-sub     { color: #6b7280 !important; }

  .receipt-body  { background: #fff !important; border-color: #e5e7eb !important; }
  .sec-lbl       { color: #9ca3af !important; }
  .rk            { color: #6b7280 !important; }
  .rv            { color: #000 !important; }
  .rrow          { border-color: #f3f4f6 !important; }
  .dashed        { border-color: #e5e7eb !important; }

  .breakdown     { border-color: #f3f4f6 !important; }
  .bk            { color: #6b7280 !important; }
  .bk b          { color: #000 !important; }

  .grand         { background: #fefce8 !important; border-color: #fcd34d !important; }
  .grand-lbl     { color: #92400e !important; }
  .grand-amt     { color: #92400e !important; text-shadow: none !important; font-family: monospace !important; }

  .pay-badge     { background: #f0fdf4 !important; border-color: #bbf7d0 !important; color: #166534 !important; }
  .ref-bar       { background: #f9fafb !important; border-color: #e5e7eb !important; }
  .ref-lbl, .ref-val { color: #6b7280 !important; }
  .nav-qid       { background: #fef3c7 !important; border-color: #fcd34d !important; color: #92400e !important; }
}
</style>
</head>
<body>
<div class="wrap">

  <!-- Top nav -->
  <div class="top-nav">
    <div class="nav-brand">🔥 BBQ GRILL <span style="color:var(--smoke);font-weight:400;font-size:.75rem;">ใบเสร็จ</span></div>
    <div class="nav-qid"><?= qfmt($queue_id) ?></div>
  </div>

  <div class="receipt slide-up">

    <!-- Success head -->
    <div class="success-head">
      <div class="check-ring">✓</div>
      <div class="success-title">ชำระเงินสำเร็จ</div>
      <div class="success-sub">ขอบคุณที่ใช้บริการ BBQ GRILL</div>
    </div>

    <!-- Store strip -->
    <div class="store-strip">
      <div>
        <div class="store-name">BBQ GRILL</div>
        <div class="store-sub">Luxury Hotel Dining Experience</div>
      </div>
      <div class="nav-qid"><?= qfmt($queue_id) ?></div>
    </div>

    <!-- Body -->
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
          <span>ค่าอาหาร (<?= (int)$d['pax_amount'] ?> × ฿<?= number_format((float)$d['subtotal_amount'] / max(1,(int)$d['pax_amount']), 0) ?>)</span>
          <b>฿<?= number_format((float)$d['subtotal_amount'], 2) ?></b>
        </div>
        <div class="bk"><span>ค่าบริการ (10%)</span><b>฿<?= number_format((float)$d['service_amount'], 2) ?></b></div>
        <div class="bk"><span>VAT (7%)</span><b>฿<?= number_format((float)$d['vat_amount'], 2) ?></b></div>
      </div>

      <div class="grand">
        <span class="grand-lbl">ยอดรวมสุทธิ</span>
        <span class="grand-amt">฿<?= number_format((float)$d['total_amount'], 2) ?></span>
      </div>

      <div class="rrow">
        <span class="rk">วิธีชำระ</span>
        <span class="rv">
          <span class="pay-badge"><?= pay_icon($d['payment_method']) ?> <?= pay_label($d['payment_method']) ?></span>
        </span>
      </div>
      <div class="rrow"><span class="rk">เวลาชำระ</span><span class="rv mono"><?= date('d/m/Y H:i:s', strtotime($d['payment_time'])) ?></span></div>

      <div class="ref-bar">
        <span class="ref-lbl">เลขอ้างอิง</span>
        <span class="ref-val"><?= $ref ?></span>
      </div>

    </div><!-- /.receipt-body -->

    <!-- Actions -->
    <div class="receipt-actions">
      <button onclick="window.print()" class="btn btn-jade" style="flex:1;">
        <i class="bi bi-printer-fill"></i> พิมพ์
      </button>
      <a href="index.php" class="btn btn-ghost" style="flex:1; text-decoration:none; text-align:center;">
        <i class="bi bi-house"></i> หน้าแรก
      </a>
    </div>

  </div><!-- /.receipt -->

  <div class="receipt-footer">
    <strong>BBQ GRILL</strong> · Luxury Hotel Dining · โทร: 02-123-4567<br>
    พิมพ์เมื่อ <?= date('d/m/Y H:i') ?>
  </div>

</div>
<script>
if (location.search.includes('print=1')) setTimeout(() => window.print(), 600);
</script>
</body>
</html>
