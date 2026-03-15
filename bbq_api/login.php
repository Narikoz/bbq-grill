<?php
// login.php
include 'db.php';
session_start();

if (!empty($_SESSION['emp_id'])) {
    header('Location: staff_queue.php'); exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = 'กรุณากรอก username และ password';
    } else {
        $stmt = $conn->prepare("SELECT emp_id, emp_name, password_hash, role, is_active FROM employees WHERE username=? LIMIT 1");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $u = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$u || !(int)$u['is_active']) {
            $error = 'ไม่พบบัญชีหรือบัญชีถูกปิดใช้งาน';
        } elseif (!password_verify($password, $u['password_hash'])) {
            $error = 'รหัสผ่านไม่ถูกต้อง';
        } else {
            $_SESSION['emp_id']   = (int)$u['emp_id'];
            $_SESSION['emp_name'] = $u['emp_name'];
            $_SESSION['role']     = $u['role'];
            header('Location: staff_queue.php'); exit;
        }
    }
}
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>เข้าสู่ระบบ — BBQ GRILL</title>
<link rel="stylesheet" href="theme.css">
<style>
body {
  display: flex; align-items: center; justify-content: center;
  min-height: 100dvh; padding: 24px;
}

/* Diagonal score marks */
body::before {
  background:
    repeating-linear-gradient(-22deg, transparent, transparent 90px,
      rgba(255,255,255,.018) 90px, rgba(255,255,255,.018) 91px),
    radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,98,42,.12), transparent 70%);
}

.login-wrap {
  width: 100%; max-width: 420px;
  position: relative; z-index: 1;
}

/* Glow ring behind card */
.login-wrap::before {
  content: '';
  position: absolute; inset: -40px;
  background: radial-gradient(ellipse at center, rgba(232,98,42,.10), transparent 70%);
  pointer-events: none;
}

.brand-block {
  text-align: center; margin-bottom: 36px;
}
.brand-flame {
  font-size: 3rem; line-height: 1; display: block; margin-bottom: 10px;
  filter: drop-shadow(0 0 18px rgba(232,98,42,.6));
  animation: flicker 3.5s ease-in-out infinite;
}
@keyframes flicker {
  0%,100%{ filter: drop-shadow(0 0 16px rgba(232,98,42,.55)); }
  50%    { filter: drop-shadow(0 0 32px rgba(255,130,60,.75)); }
}
.brand-name {
  font-family: var(--font-display);
  font-size: 2rem; font-weight: 700; letter-spacing: .08em;
  background: linear-gradient(135deg, var(--ash), var(--gold-hi));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.brand-role { color: var(--smoke); font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; margin-top: 4px; }

.card { padding: 38px 36px; animation: slideUp .45s ease both; }

.form-group { margin-bottom: 18px; }

.input-wrap { position: relative; }
.input-wrap .icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--haze); font-size: .9rem; pointer-events: none;
}
.input-wrap .input { padding-left: 40px; }

.pw-toggle {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--haze); cursor: pointer;
  padding: 4px; transition: color .2s;
}
.pw-toggle:hover { color: var(--smoke); }

.divider-text {
  text-align: center; color: var(--haze); font-size: .75rem;
  position: relative; margin: 18px 0;
}
.divider-text::before, .divider-text::after {
  content: ''; position: absolute; top: 50%;
  width: calc(50% - 20px); height: 1px; background: var(--border);
}
.divider-text::before { left: 0; }
.divider-text::after  { right: 0; }

.back-link {
  display: flex; align-items: center; gap: 6px; justify-content: center;
  color: var(--haze); font-size: .8rem; text-decoration: none;
  margin-top: 18px; transition: color .2s;
}
.back-link:hover { color: var(--smoke); }

/* Credentials hint */
.hint-box {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-sm); padding: 12px 14px;
  margin-bottom: 20px; font-size: .78rem; color: var(--smoke);
}
.hint-box .hint-row { display: flex; justify-content: space-between; padding: 2px 0; }
.hint-box .hint-val  { font-family: var(--font-mono); color: var(--ash); }
</style>
</head>
<body>
<div class="login-wrap z1">

  <div class="brand-block">
    <span class="brand-flame">🔥</span>
    <div class="brand-name">BBQ GRILL</div>
    <div class="brand-role">Staff Portal</div>
  </div>

  <div class="card">

    <?php if ($error): ?>
    <div class="alert alert-danger">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <?= htmlspecialchars($error) ?>
    </div>
    <?php endif; ?>

    <!-- Default credentials hint for demo -->
    <div class="hint-box">
      <div class="hint-row"><span>Admin</span><span class="hint-val">admin / admin1234</span></div>
      <div class="hint-row"><span>Staff</span><span class="hint-val">staff / staff1234</span></div>
    </div>

    <form method="POST">
      <div class="form-group">
        <label class="label">Username</label>
        <div class="input-wrap">
          <i class="bi bi-person icon"></i>
          <input type="text" name="username" class="input" placeholder="กรอก username"
                 autocomplete="username" value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
        </div>
      </div>

      <div class="form-group">
        <label class="label">Password</label>
        <div class="input-wrap">
          <i class="bi bi-lock icon"></i>
          <input type="password" name="password" id="pwInput" class="input"
                 placeholder="กรอกรหัสผ่าน" autocomplete="current-password">
          <button type="button" class="pw-toggle" id="pwToggle" onclick="togglePw()">
            <i class="bi bi-eye" id="pwIcon"></i>
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-ember btn-wide btn-lg" style="margin-top:6px;">
        <i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ
      </button>
    </form>

    <div class="divider-text">หรือ</div>

    <a href="index.php" class="btn btn-ghost btn-wide" style="text-decoration:none;">
      <i class="bi bi-house"></i> กลับหน้าจองลูกค้า
    </a>
  </div>

</div>

<script>
function togglePw() {
  const inp  = document.getElementById('pwInput');
  const icon = document.getElementById('pwIcon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    inp.type = 'password';
    icon.className = 'bi bi-eye';
  }
}
</script>
</body>
</html>
