<?php
// index.php — Customer booking page
include 'db.php';
session_start();

define('PRICE_PER_PERSON', 299);
define('SERVICE_RATE', 0.10);
define('VAT_RATE', 0.07);
define('STORE_NAME', 'BBQ GRILL');
define('QR_EXPIRE_MIN', 15);

$error = '';
$success_data = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name       = trim($_POST['customer_name'] ?? '');
    $tel        = preg_replace('/\D/', '', trim($_POST['customer_tel'] ?? ''));
    $pax        = (int)($_POST['pax_amount'] ?? 0);
    $time_raw   = trim($_POST['booking_time'] ?? '');
    $pay_method = trim($_POST['pay_method'] ?? 'CASH');
    $booking_time = $time_raw ? date('Y-m-d H:i:s', strtotime($time_raw)) : date('Y-m-d H:i:s');

    if ($name === '' || strlen($tel) < 9 || $pax < 1 || $pax > 20) {
        $error = 'กรุณากรอกข้อมูลให้ครบและถูกต้อง';
    } else {
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("INSERT INTO customers (customer_name, customer_tel) VALUES (?,?) ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name)");
            $stmt->bind_param("ss", $name, $tel); $stmt->execute();
            $cid = $conn->insert_id ?: (function() use ($conn, $tel) {
                $s = $conn->prepare("SELECT customer_id FROM customers WHERE customer_tel=? LIMIT 1");
                $s->bind_param("s", $tel); $s->execute();
                return (int)$s->get_result()->fetch_assoc()['customer_id'];
            })();
            $stmt->close();

            $token = null; $expires = null;
            if ($pay_method === 'QR') {
                $token   = bin2hex(random_bytes(16));
                $expires = date('Y-m-d H:i:s', time() + QR_EXPIRE_MIN * 60);
            }

            $stmt = $conn->prepare("INSERT INTO queues (customer_id, pax_amount, booking_time, queue_status, pay_token, pay_token_expires) VALUES (?,?,?,'WAITING',?,?)");
            $stmt->bind_param("iisss", $cid, $pax, $booking_time, $token, $expires);
            $stmt->execute();
            $qid = (int)$conn->insert_id;
            $stmt->close();

            $conn->commit();
            $pay_link = $token ? (isset($_SERVER['HTTPS']) ? 'https' : 'http') . "://{$_SERVER['HTTP_HOST']}/pay.php?queue_id={$qid}&token={$token}" : null;
            $success_data = compact('qid','name','pax','pay_link');
        } catch(Throwable $e) {
            $conn->rollback(); $error = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        }
    }
}

function qid_fmt(int $id): string { return '#' . str_pad($id, 4, '0', STR_PAD_LEFT); }
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>จองโต๊ะ — BBQ GRILL</title>
<link rel="stylesheet" href="theme.css">
<style>
/* ═══ PAGE LAYOUT ═══ */
body { overflow-x: hidden; }

.page {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 520px;
}

/* ═══ LEFT — Hero ═══ */
.hero {
  position: relative;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  padding: 60px 56px;
  overflow: hidden;
}

/* Score lines — signature char mark */
.hero::before {
  content: '';
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(
      -25deg,
      transparent,
      transparent 80px,
      rgba(255,255,255,.016) 80px,
      rgba(255,255,255,.016) 81px
    );
  pointer-events: none;
}

.hero-bg {
  position: absolute; inset: 0; z-index: 0;
  background:
    radial-gradient(ellipse 70% 60% at 30% 40%, rgba(232,98,42,.22) 0%, transparent 65%),
    radial-gradient(ellipse 50% 40% at 80% 70%, rgba(196,154,60,.12) 0%, transparent 55%),
    var(--char);
}

.hero-content { position: relative; z-index: 1; }

.fire-mark {
  font-size: 5rem; line-height: 1;
  margin-bottom: 20px;
  display: block;
  filter: drop-shadow(0 0 30px rgba(232,98,42,.6));
  animation: flicker 4s ease-in-out infinite;
}
@keyframes flicker {
  0%,100%{ filter: drop-shadow(0 0 24px rgba(232,98,42,.55)) brightness(1); }
  25%    { filter: drop-shadow(0 0 40px rgba(255,130,60,.70)) brightness(1.06); }
  75%    { filter: drop-shadow(0 0 18px rgba(200,80,30,.50)) brightness(.97); }
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 6vw, 5.5rem);
  font-weight: 700;
  line-height: .95;
  letter-spacing: -.01em;
  color: var(--ash);
  margin-bottom: 16px;
}
.hero-title em {
  font-style: italic;
  background: linear-gradient(135deg, var(--ember-hi), var(--gold));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline {
  font-size: .88rem; letter-spacing: .18em; text-transform: uppercase;
  color: var(--smoke); font-weight: 500;
  margin-bottom: 40px;
}

.hero-features {
  display: flex; gap: 24px; flex-wrap: wrap;
}
.feat {
  display: flex; align-items: center; gap: 8px;
  font-size: .82rem; color: rgba(180,190,210,.7);
}
.feat-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ember); flex-shrink: 0;
  box-shadow: 0 0 8px var(--ember);
}

/* Floating embers */
.embers-wrap {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.ember-p {
  position: absolute; bottom: -10px;
  border-radius: 50%;
  animation: rise-ember linear infinite;
  opacity: 0;
}
@keyframes rise-ember {
  0%   { transform: translateY(0)    translateX(0);    opacity: 0; }
  10%  { opacity: .9; }
  85%  { opacity: .6; }
  100% { transform: translateY(-100vh) translateX(30px); opacity: 0; }
}

/* ═══ RIGHT — Form panel ═══ */
.panel {
  background: var(--cinder);
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 48px 44px;
  overflow-y: auto;
  position: relative; z-index: 2;
}

.panel-header { margin-bottom: 32px; }
.panel-title {
  font-family: var(--font-display);
  font-size: 1.8rem; font-weight: 600;
  margin-bottom: 4px;
}
.panel-sub { color: var(--smoke); font-size: .84rem; }

/* Form */
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { margin-bottom: 20px; }

.input-icon-wrap { position: relative; }
.input-icon-wrap .icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--haze); font-size: .9rem; pointer-events: none;
}
.input-icon-wrap .input { padding-left: 40px; }

/* Pax stepper */
.stepper {
  display: flex; align-items: stretch;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: var(--r);
  overflow: hidden; height: 48px;
}
.step-btn {
  width: 50px; border: none; background: transparent;
  color: var(--gold); font-size: 1.3rem; cursor: pointer;
  transition: background .18s;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-btn:hover:not(:disabled) { background: rgba(196,154,60,.10); }
.step-btn:disabled { color: var(--haze); cursor: not-allowed; }
.step-val {
  flex: 1; text-align: center; align-self: center;
  font-family: var(--font-mono); font-size: 1.1rem; font-weight: 600;
}
.step-unit { font-size: .7rem; color: var(--smoke); font-family: var(--font-body); margin-left: 4px; }

/* Pay method */
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.method-card {
  padding: 14px 12px; border-radius: var(--r-sm);
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(255,255,255,.03);
  cursor: pointer; text-align: center;
  transition: all .2s; user-select: none;
}
.method-card:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.15); }
.method-card.active {
  background: rgba(232,98,42,.10);
  border-color: rgba(232,98,42,.35);
}
.method-icon { font-size: 1.3rem; display: block; margin-bottom: 4px; }
.method-name { font-size: .82rem; font-weight: 700; }
.method-sub  { font-size: .7rem; color: var(--smoke); margin-top: 2px; }
.method-card.active .method-name { color: var(--ember-hi); }

/* Price preview */
.price-card {
  background: linear-gradient(135deg, rgba(232,98,42,.08), rgba(196,154,60,.05));
  border: 1px solid rgba(232,98,42,.18);
  border-radius: var(--r-sm);
  padding: 16px 18px;
  margin-top: 4px;
}
.price-row {
  display: flex; justify-content: space-between;
  padding: 4px 0; font-size: .84rem;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.price-row:last-child { border: none; }
.pk { color: var(--smoke); }
.pv { font-family: var(--font-mono); font-weight: 600; font-size: .82rem; }
.price-total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 10px; margin-top: 6px;
  border-top: 1px solid rgba(232,98,42,.20);
}
.price-total-lbl { font-weight: 700; color: var(--ember-hi); }
.price-total-val {
  font-family: var(--font-mono); font-size: 1.2rem; font-weight: 600;
  color: var(--gold-hi);
}

/* Staff link */
.staff-link {
  display: flex; align-items: center; gap: 8px;
  justify-content: center;
  margin-top: 20px;
  color: var(--haze); font-size: .8rem; text-decoration: none;
  transition: color .2s;
}
.staff-link:hover { color: var(--smoke); }

/* ═══ SUCCESS MODAL ═══ */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(5,7,13,.85); backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  width: 100%; max-width: 440px;
  background: linear-gradient(160deg, var(--smolder), var(--cinder));
  border: 1px solid var(--border2);
  border-radius: var(--r-xl);
  padding: 44px 36px;
  text-align: center;
  box-shadow: var(--shadow-lg), 0 0 60px rgba(34,201,122,.08);
  animation: slideUp .5s cubic-bezier(.34,1.2,.64,1) both;
}
.modal-ring {
  width: 76px; height: 76px; border-radius: 50%;
  background: linear-gradient(135deg, var(--jade), var(--jade-dk));
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 22px; font-size: 1.9rem; color: #fff;
  box-shadow:
    0 0 0 10px rgba(34,201,122,.10),
    0 0 0 20px rgba(34,201,122,.05),
    0 20px 50px rgba(34,201,122,.25);
  animation: pop .55s cubic-bezier(.34,1.56,.64,1) both .1s;
}
.modal-title {
  font-family: var(--font-display); font-size: 1.9rem; font-weight: 700;
  margin-bottom: 6px;
}
.modal-sub { color: var(--smoke); font-size: .86rem; margin-bottom: 24px; }
.modal-qid {
  background: rgba(232,98,42,.10);
  border: 1px solid rgba(232,98,42,.25);
  border-radius: var(--r-sm);
  padding: 16px;
  font-family: var(--font-mono); font-size: 2rem; font-weight: 600;
  color: var(--gold-hi); letter-spacing: .12em;
  margin-bottom: 24px;
  text-shadow: 0 0 20px rgba(196,154,60,.25);
}
.modal-info {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 12px 16px;
  margin-bottom: 20px;
  text-align: left;
  font-size: .84rem;
  color: var(--smoke);
}
.modal-info .mi { display: flex; justify-content: space-between; padding: 3px 0; }
.modal-info .mv { color: var(--ash); font-weight: 600; }
.modal-actions { display: flex; gap: 10px; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 900px) {
  .page { grid-template-columns: 1fr; }
  .hero { min-height: 40vh; padding: 40px 28px; }
  .hero-title { font-size: 2.8rem; }
  .panel { padding: 32px 24px; }
}
@media (max-width: 480px) {
  .form-row { grid-template-columns: 1fr; }
  .modal { padding: 32px 24px; }
}
</style>
</head>
<body>

<div class="page">

  <!-- ═══ HERO ═══ -->
  <div class="hero">
    <div class="hero-bg"></div>

    <!-- Floating embers -->
    <div class="embers-wrap" aria-hidden="true" id="embers-wrap"></div>

    <div class="hero-content">
      <span class="fire-mark">🔥</span>

      <h1 class="hero-title">
        Luxury<br>
        <em>Grill</em><br>
        Experience
      </h1>
      <p class="hero-tagline">Reserve Your Table Tonight</p>

      <div class="hero-features">
        <div class="feat"><div class="feat-dot"></div>Premium Wagyu Beef</div>
        <div class="feat"><div class="feat-dot" style="background:var(--gold)"></div>Charcoal Grill</div>
        <div class="feat"><div class="feat-dot" style="background:var(--jade)"></div>Private Dining</div>
      </div>
    </div>
  </div>

  <!-- ═══ FORM PANEL ═══ -->
  <div class="panel">
    <div class="panel-header z1">
      <div class="panel-title">จองโต๊ะ</div>
      <div class="panel-sub">กรอกข้อมูลเพื่อจองที่นั่งล่วงหน้า</div>
    </div>

    <?php if ($error): ?>
    <div class="alert alert-danger fade-in z1">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span><?= htmlspecialchars($error) ?></span>
    </div>
    <?php endif; ?>

    <form method="POST" id="bookForm" class="z1">
      <div class="form-row">
        <div class="form-group">
          <label class="label">ชื่อ-นามสกุล</label>
          <div class="input-icon-wrap">
            <i class="bi bi-person icon"></i>
            <input type="text" name="customer_name" class="input" placeholder="ชื่อของคุณ" required maxlength="120">
          </div>
        </div>
        <div class="form-group">
          <label class="label">เบอร์โทรศัพท์</label>
          <div class="input-icon-wrap">
            <i class="bi bi-phone icon"></i>
            <input type="tel" name="customer_tel" class="input" placeholder="0812345678" required maxlength="10" pattern="\d{9,10}" inputmode="tel">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="label">จำนวนคน</label>
        <div class="stepper">
          <button type="button" class="step-btn" id="decBtn" onclick="changePax(-1)">−</button>
          <span class="step-val"><span id="paxVal">2</span><span class="step-unit">คน</span></span>
          <button type="button" class="step-btn" id="incBtn" onclick="changePax(1)">+</button>
        </div>
        <input type="hidden" name="pax_amount" id="paxInput" value="2">
      </div>

      <div class="form-group">
        <label class="label">วันเวลาที่ต้องการ</label>
        <div class="input-icon-wrap">
          <i class="bi bi-calendar3 icon"></i>
          <input type="datetime-local" name="booking_time" class="input" id="bookingTime" style="padding-left:40px;">
        </div>
      </div>

      <div class="form-group">
        <label class="label">วิธีชำระเงิน</label>
        <div class="method-grid" id="methodGrid">
          <div class="method-card active" data-method="CASH" onclick="selectMethod('CASH',this)">
            <span class="method-icon">💵</span>
            <div class="method-name">เงินสด</div>
            <div class="method-sub">ชำระหน้าร้าน</div>
          </div>
          <div class="method-card" data-method="QR" onclick="selectMethod('QR',this)">
            <span class="method-icon">📱</span>
            <div class="method-name">QR PromptPay</div>
            <div class="method-sub">สแกนจ่ายทันที</div>
          </div>
        </div>
        <input type="hidden" name="pay_method" id="payMethod" value="CASH">
      </div>

      <!-- Price preview -->
      <div class="price-card" id="priceCard">
        <div class="price-row">
          <span class="pk">ค่าอาหาร (<span id="pc-pax">2</span> × ฿<?= PRICE_PER_PERSON ?>)</span>
          <span class="pv">฿<span id="pc-sub">598.00</span></span>
        </div>
        <div class="price-row">
          <span class="pk">Service Charge 10%</span>
          <span class="pv">฿<span id="pc-svc">59.80</span></span>
        </div>
        <div class="price-row">
          <span class="pk">VAT 7%</span>
          <span class="pv">฿<span id="pc-vat">45.97</span></span>
        </div>
        <div class="price-total-row">
          <span class="price-total-lbl">ยอดรวม</span>
          <span class="price-total-val">฿<span id="pc-grand">703.77</span></span>
        </div>
      </div>

      <button type="submit" class="btn btn-ember btn-wide btn-lg" style="margin-top:22px;" id="submitBtn">
        <i class="bi bi-check2-circle"></i>
        <span id="submitLabel">ยืนยันการจอง</span>
      </button>
    </form>

    <a href="login.php" class="staff-link z1">
      <i class="bi bi-shield-lock"></i> เข้าสู่ระบบพนักงาน
    </a>
  </div>

</div><!-- .page -->

<!-- ═══ SUCCESS MODAL ═══ -->
<?php if ($success_data): ?>
<div class="modal-backdrop" id="successModal">
  <div class="modal">
    <div class="modal-ring">✓</div>
    <div class="modal-title">จองสำเร็จ!</div>
    <div class="modal-sub">ขอบคุณที่ใช้บริการ BBQ GRILL</div>

    <div class="modal-qid"><?= qid_fmt($success_data['qid']) ?></div>

    <div class="modal-info">
      <div class="mi"><span>ชื่อ</span><span class="mv"><?= htmlspecialchars($success_data['name']) ?></span></div>
      <div class="mi"><span>จำนวน</span><span class="mv"><?= $success_data['pax'] ?> คน</span></div>
      <div class="mi"><span>สถานะ</span><span class="mv" style="color:var(--gold-hi);">รอยืนยัน</span></div>
    </div>

    <?php if ($success_data['pay_link']): ?>
    <a href="<?= htmlspecialchars($success_data['pay_link']) ?>" class="btn btn-jade btn-wide" style="margin-bottom:10px; text-decoration:none;">
      <i class="bi bi-qr-code-scan"></i> ชำระผ่าน QR PromptPay
    </a>
    <?php endif; ?>

    <div class="modal-actions">
      <button class="btn btn-ghost btn-wide" onclick="document.getElementById('successModal').remove()">
        <i class="bi bi-plus"></i> จองอีกครั้ง
      </button>
    </div>
  </div>
</div>
<?php endif; ?>

<script>
/* ── Embers particle system ── */
const wrap = document.getElementById('embers-wrap');
const colors = ['#E8622A','#FF8555','#C49A3C','#F0C96A','#FF5C72'];
for (let i = 0; i < 22; i++) {
  const el = document.createElement('div');
  el.className = 'ember-p';
  const size = 3 + Math.random() * 5;
  Object.assign(el.style, {
    left: Math.random() * 100 + '%',
    width: size + 'px', height: size + 'px',
    background: colors[Math.floor(Math.random() * colors.length)],
    animationDuration: (9 + Math.random() * 14) + 's',
    animationDelay: (-Math.random() * 20) + 's',
    borderRadius: '50%',
    filter: 'blur(.5px)'
  });
  wrap.appendChild(el);
}

/* ── Booking time default (next quarter hour) ── */
const d = new Date();
d.setMinutes(d.getMinutes() + 15 - (d.getMinutes() % 15));
d.setSeconds(0);
document.getElementById('bookingTime').value = d.toISOString().slice(0,16);

/* ── Pax stepper ── */
const PRICE = <?= PRICE_PER_PERSON ?>;
const SVC   = <?= SERVICE_RATE ?>;
const VAT   = <?= VAT_RATE ?>;
let pax = 2;

function changePax(d) {
  pax = Math.min(20, Math.max(1, pax + d));
  document.getElementById('paxVal').textContent   = pax;
  document.getElementById('paxInput').value       = pax;
  document.getElementById('decBtn').disabled      = pax <= 1;
  document.getElementById('incBtn').disabled      = pax >= 20;
  updatePrice();
}

function updatePrice() {
  const sub   = pax * PRICE;
  const svc   = Math.round(sub * SVC * 100) / 100;
  const vat   = Math.round((sub + svc) * VAT * 100) / 100;
  const grand = sub + svc + vat;
  document.getElementById('pc-pax').textContent   = pax;
  document.getElementById('pc-sub').textContent   = sub.toFixed(2);
  document.getElementById('pc-svc').textContent   = svc.toFixed(2);
  document.getElementById('pc-vat').textContent   = vat.toFixed(2);
  document.getElementById('pc-grand').textContent = grand.toFixed(2);
}
updatePrice();

/* ── Pay method selector ── */
function selectMethod(method, el) {
  document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('payMethod').value = method;
}

/* ── Button ripple ── */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', ((e.clientX-r.left)/r.width*100)+'%');
    btn.style.setProperty('--my', ((e.clientY-r.top)/r.height*100)+'%');
  });
});

/* ── Submit loading state ── */
document.getElementById('bookForm').addEventListener('submit', () => {
  document.getElementById('submitLabel').textContent = 'กำลังจอง...';
  document.getElementById('submitBtn').disabled = true;
});
</script>
</body>
</html>
