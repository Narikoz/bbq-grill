<?php
// pay.php — PromptPay QR payment
include 'db.php';

define('PROMPTPAY_PHONE', '0812345678'); // ← เปลี่ยนเป็นเบอร์ร้าน
define('PRICE_PER_PERSON', 299);
define('SERVICE_RATE', 0.10);
define('VAT_RATE', 0.07);
define('STORE_NAME', 'BBQ GRILL');

$queue_id = (int)($_GET['queue_id'] ?? 0);
$token    = trim($_GET['token'] ?? '');
$error    = '';
$redirect_receipt = false;

if ($queue_id <= 0 || $token === '') {
    $error = 'ลิงก์ไม่ถูกต้อง';
} else {
    $stmt = $conn->prepare("SELECT q.*, c.customer_name, c.customer_tel FROM queues q JOIN customers c ON q.customer_id=c.customer_id WHERE q.queue_id=? LIMIT 1");
    $stmt->bind_param("i", $queue_id);
    $stmt->execute();
    $q = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$q) $error = 'ไม่พบข้อมูลคิว';
    elseif (empty($q['pay_token']) || !hash_equals((string)$q['pay_token'], $token)) $error = 'Token ไม่ถูกต้อง';
    else {
        // Check already paid
        $ps = $conn->prepare("SELECT payment_id FROM payments WHERE queue_id=? LIMIT 1");
        $ps->bind_param("i", $queue_id); $ps->execute();
        $existing = $ps->get_result()->fetch_assoc(); $ps->close();

        if ($existing) {
            header("Location: receipt_public.php?queue_id={$queue_id}&token={$token}"); exit;
        }

        // Handle confirm POST
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['confirm_pay'])) {
            if (strtotime($q['pay_token_expires']) <= time()) {
                $error = 'QR หมดอายุ กรุณาติดต่อพนักงาน';
            } else {
                $conn->begin_transaction();
                try {
                    $ps2 = $conn->prepare("SELECT payment_id FROM payments WHERE queue_id=? LIMIT 1 FOR UPDATE");
                    $ps2->bind_param("i",$queue_id); $ps2->execute();
                    if (!$ps2->get_result()->fetch_assoc()) {
                        $pax = (int)$q['pax_amount'];
                        $sub = $pax * PRICE_PER_PERSON;
                        $svc = round($sub * SERVICE_RATE, 2);
                        $vat = round(($sub+$svc) * VAT_RATE, 2);
                        $grand = $sub + $svc + $vat;
                        $pm = 'PROMPTPAY';
                        $ins = $conn->prepare("INSERT INTO payments (queue_id,subtotal_amount,service_amount,vat_amount,total_amount,payment_method) VALUES (?,?,?,?,?,?)");
                        $ins->bind_param("idddds",$queue_id,$sub,$svc,$vat,$grand,$pm);
                        $ins->execute();
                    }
                    $conn->commit();
                    header("Location: receipt_public.php?queue_id={$queue_id}&token={$token}"); exit;
                } catch(Throwable $e) {
                    $conn->rollback(); $error = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
                }
            }
        }
    }
}

if (empty($error)) {
    $pax   = (int)$q['pax_amount'];
    $sub   = $pax * PRICE_PER_PERSON;
    $svc   = round($sub * SERVICE_RATE, 2);
    $vat   = round(($sub + $svc) * VAT_RATE, 2);
    $grand = $sub + $svc + $vat;
    $expires_ts = strtotime($q['pay_token_expires']);
    $is_expired = $expires_ts <= time();
}
function qfmt(int $id): string { return '#'.str_pad($id,4,'0',STR_PAD_LEFT); }
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>ชำระเงิน — BBQ GRILL</title>
<link rel="stylesheet" href="theme.css">
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<style>
body {
  display: flex; align-items: flex-start; justify-content: center;
  min-height: 100dvh; padding: 32px 16px 60px;
}
.wrap { width: 100%; max-width: 420px; position: relative; z-index: 1; }

/* ── Steps ── */
.steps {
  display: flex; align-items: center; justify-content: center;
  gap: 0; margin-bottom: 28px;
}
.step { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.step-dot {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem; font-weight: 700; z-index: 1;
  border: 2px solid rgba(255,255,255,.12);
  background: var(--surface); color: var(--smoke);
  transition: all .3s;
}
.step.done .step-dot  { background: var(--jade); border-color: var(--jade); color: #fff; }
.step.active .step-dot{ border-color: var(--ember); color: var(--ember-hi); background: rgba(232,98,42,.10); }
.step-lbl { font-size: .67rem; color: var(--smoke); white-space: nowrap; }
.step.done .step-lbl, .step.active .step-lbl { color: var(--ember-hi); }
.step-line { width: 52px; height: 2px; background: rgba(255,255,255,.08); margin: -18px 4px 22px; transition: background .4s; }
.step-line.done { background: var(--jade); }

/* ── Card ── */
.card { overflow: hidden; }

/* Header band */
.pay-head {
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(232,98,42,.10), rgba(196,154,60,.06));
  border-bottom: 1px solid rgba(232,98,42,.14);
}
.pay-head-name { font-weight: 800; font-size: 1.05rem; margin-bottom: 3px; }
.pay-head-meta {
  display: flex; gap: 12px; font-size: .79rem; color: var(--smoke);
}
.pay-head-meta span { display: flex; align-items: center; gap: 4px; }

/* QR zone */
.qr-zone {
  padding: 28px 22px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}

/* QR frame — signature element */
.qr-outer {
  position: relative;
  padding: 6px;
  background: linear-gradient(135deg, var(--ember), var(--gold));
  border-radius: 20px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.06),
    0 20px 60px rgba(232,98,42,.25),
    0 0 40px rgba(232,98,42,.12);
  animation: qr-breathe 3s ease-in-out infinite;
}
@keyframes qr-breathe {
  0%,100%{ box-shadow: 0 0 0 1px rgba(255,255,255,.06), 0 20px 55px rgba(232,98,42,.22), 0 0 35px rgba(232,98,42,.10); }
  50%    { box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 24px 70px rgba(232,98,42,.32), 0 0 55px rgba(232,98,42,.16); }
}
.qr-inner {
  width: 190px; height: 190px; border-radius: 16px;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
.qr-inner img { width: 88%; height: 88%; object-fit: contain; }

.qr-expired-overlay {
  position: absolute; inset: 0;
  background: rgba(12,15,26,.85); backdrop-filter: blur(4px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; color: var(--crimson); font-weight: 700; font-size: .88rem;
  border-radius: 16px;
}
.qr-expired-overlay i { font-size: 1.8rem; }

.qr-label {
  display: flex; align-items: center; gap: 6px;
  font-size: .75rem; color: var(--smoke);
}
.qr-label i { color: var(--jade); }

/* Amount */
.amount-zone { padding: 0 22px 18px; text-align: center; }
.amount-lbl { font-size: .75rem; color: var(--smoke); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; }
.amount-val {
  font-family: var(--font-mono); font-size: 2.2rem; font-weight: 600;
  color: var(--gold-hi);
  text-shadow: 0 0 30px rgba(196,154,60,.22);
  line-height: 1;
  margin-bottom: 10px;
}
.amount-chips { display: flex; gap: 7px; justify-content: center; flex-wrap: wrap; }
.chip {
  padding: 3px 9px; border-radius: var(--r-xs);
  font-size: .73rem; background: var(--surface); border: 1px solid var(--border);
  color: var(--smoke);
}

/* Timer */
.timer-bar {
  margin: 0 22px 18px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-sm); padding: 11px 16px;
  display: flex; align-items: center; justify-content: space-between;
}
.timer-lbl { font-size: .8rem; color: var(--smoke); }
.timer-val {
  font-family: var(--font-mono); font-weight: 600; font-size: 1.1rem;
  color: var(--jade); transition: color .3s;
}
.timer-val.warn    { color: var(--gold); animation: blink 1s step-end infinite; }
.timer-val.expired { color: var(--crimson); animation: none; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }

/* Actions */
.pay-actions { padding: 8px 20px 22px; display: flex; flex-direction: column; gap: 10px; }

/* Confirm loading pulse */
.btn-confirm-done {
  background: var(--jade) !important;
  animation: confirm-pulse .4s ease both !important;
}
@keyframes confirm-pulse {
  0%  { transform: scale(.96); }
  60% { transform: scale(1.02); }
  100%{ transform: scale(1); }
}
</style>
</head>
<body>
<div class="wrap">

<!-- Steps -->
<div class="steps">
  <div class="step done">
    <div class="step-dot"><i class="bi bi-check2"></i></div>
    <div class="step-lbl">นั่งโต๊ะ</div>
  </div>
  <div class="step-line done"></div>
  <div class="step active">
    <div class="step-dot">2</div>
    <div class="step-lbl">สแกนจ่าย</div>
  </div>
  <div class="step-line"></div>
  <div class="step">
    <div class="step-dot">3</div>
    <div class="step-lbl">ใบเสร็จ</div>
  </div>
</div>

<?php if ($error): ?>
<div class="card">
  <div style="padding:40px 28px;text-align:center;">
    <div style="font-size:2.5rem;margin-bottom:14px;">😕</div>
    <div class="alert alert-danger" style="text-align:left;margin-bottom:16px;">
      <i class="bi bi-exclamation-triangle-fill"></i> <?= htmlspecialchars($error) ?>
    </div>
    <a href="index.php" class="btn btn-ghost btn-wide" style="text-decoration:none;">
      <i class="bi bi-house"></i> กลับหน้าแรก
    </a>
  </div>
</div>
<?php else: ?>

<div class="card">
  <!-- Header -->
  <div class="pay-head">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div>
        <div class="pay-head-name"><?= htmlspecialchars($q['customer_name']) ?></div>
        <div class="pay-head-meta">
          <span><i class="bi bi-phone"></i><?= htmlspecialchars($q['customer_tel']) ?></span>
          <span><i class="bi bi-people"></i><?= $pax ?> คน</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="badge badge-qr">QR PromptPay</span>
        <span style="font-family:var(--font-mono);font-size:.78rem;color:var(--smoke);"><?= qfmt($queue_id) ?></span>
      </div>
    </div>
  </div>

  <!-- QR -->
  <div class="qr-zone">
    <div class="qr-outer">
      <div class="qr-inner" id="qrWrap">
        <div class="spinner spinner-gold" id="qrSpinner"></div>
        <?php if ($is_expired): ?>
        <div class="qr-expired-overlay">
          <i class="bi bi-x-circle-fill"></i>
          QR หมดอายุ
        </div>
        <?php endif; ?>
      </div>
    </div>
    <div class="qr-label">
      <i class="bi bi-shield-check-fill"></i>
      PromptPay · <?= STORE_NAME ?>
    </div>
  </div>

  <!-- Amount -->
  <div class="amount-zone">
    <div class="amount-lbl">ยอดที่ต้องชำระ</div>
    <div class="amount-val">฿<?= number_format($grand, 2) ?></div>
    <div class="amount-chips">
      <span class="chip">ค่าอาหาร ฿<?= number_format($sub, 0) ?></span>
      <span class="chip">Service 10% ฿<?= number_format($svc, 2) ?></span>
      <span class="chip">VAT 7% ฿<?= number_format($vat, 2) ?></span>
    </div>
  </div>

  <!-- Timer -->
  <div class="timer-bar">
    <span class="timer-lbl">⌛ QR หมดอายุใน</span>
    <span class="timer-val <?= $is_expired ? 'expired' : '' ?>" id="timerVal">
      <?= $is_expired ? 'หมดอายุ' : '' ?>
    </span>
  </div>

  <!-- Actions -->
  <div class="pay-actions">
    <form method="POST" id="confirmForm" onsubmit="return onConfirm()">
      <input type="hidden" name="confirm_pay" value="1">
      <button type="submit" class="btn btn-jade btn-wide btn-lg" id="confirmBtn"
              <?= $is_expired ? 'disabled' : '' ?>>
        <i class="bi bi-check2-circle"></i>
        <span id="confirmLabel">ยืนยันว่าโอนเงินแล้ว</span>
      </button>
    </form>
    <a href="index.php" class="btn btn-ghost btn-wide" style="text-decoration:none;text-align:center;">
      <i class="bi bi-arrow-left"></i> กลับหน้าแรก
    </a>
  </div>

</div>

<script>
/* QR generation */
const PHONE = '<?= PROMPTPAY_PHONE ?>';
const AMOUNT = <?= $grand ?>;
const EXPIRED = <?= $is_expired ? 'true' : 'false' ?>;

function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}

function buildPromptPay(phone, amount) {
  const d = phone.replace(/\D/g,'');
  const norm = '0066' + (d.startsWith('0') ? d.slice(1) : d);
  const account = '0116' + String(norm.length).padStart(2,'0') + norm;
  const merchant = '0002TH.PROMPTPAY' + account;
  const mLen = String(merchant.length).padStart(2,'0');
  const amtStr = amount.toFixed(2);
  const body = '000201' + '26' + mLen + merchant + '5802TH' + '5303764' + '54' + String(amtStr.length).padStart(2,'0') + amtStr + '6304';
  return body + crc16(body);
}

if (!EXPIRED) {
  const payload = buildPromptPay(PHONE, AMOUNT);
  QRCode.toDataURL(payload, { width: 340, margin: 1, color: { dark: '#000', light: '#fff' } })
    .then(url => {
      document.getElementById('qrSpinner').remove();
      const img = document.createElement('img');
      img.src = url; img.alt = 'PromptPay QR';
      document.getElementById('qrWrap').appendChild(img);
    })
    .catch(() => {
      document.getElementById('qrSpinner').textContent = 'เกิดข้อผิดพลาด';
    });
}

/* Countdown */
const expireAt = <?= $expires_ts ?> * 1000;
const tv = document.getElementById('timerVal');
const confirmBtn = document.getElementById('confirmBtn');

function tick() {
  const sec = Math.max(0, Math.floor((expireAt - Date.now()) / 1000));
  if (sec <= 0) {
    tv.textContent = 'หมดอายุ'; tv.className = 'timer-val expired';
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }
  const m = Math.floor(sec / 60), s = sec % 60;
  tv.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  tv.className = 'timer-val' + (sec < 60 ? ' warn' : '');
  setTimeout(tick, 1000);
}
tick();

/* Confirm loading */
function onConfirm() {
  const btn = document.getElementById('confirmBtn');
  document.getElementById('confirmLabel').textContent = 'กำลังบันทึก...';
  btn.disabled = true;
  return true;
}
</script>
<?php endif; ?>

</div>
</body>
</html>
