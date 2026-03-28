<?php
// ══════════════════════════════════════════════
//  BBQ GRILL REST API  — bbq_api/index.php
//  Single-file router for XAMPP simplicity
// ══════════════════════════════════════════════

// ── CORS ──
$allowed_origins = array_filter(array_map('trim', explode(',',
    getenv('ALLOWED_ORIGINS') ?: 'http://localhost,http://localhost:4200'
)));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins, true) ||
    str_ends_with($origin, '.railway.app') ||
    str_ends_with($origin, '.up.railway.app')) {
    header("Access-Control-Allow-Origin: $origin");
} else if (empty($origin)) {
    header("Access-Control-Allow-Origin: *");
}
// ไม่ใส่ header ถ้า origin ไม่อยู่ในรายการ
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Session ──
session_start();
date_default_timezone_set('Asia/Bangkok');

// ── DB ──
$conn = new mysqli(
    getenv('DB_HOST') ?: 'db',
    getenv('DB_USER') ?: 'bbq_user',
    getenv('DB_PASSWORD') ?: 'bbq_pass',
    getenv('DB_NAME') ?: 'bbq_queue_db',
    3306
);
if ($conn->connect_error) die(json_encode(['error' => 'DB connection failed: ' . $conn->connect_error]));
$conn->set_charset("utf8mb4");

// ── Auto-migrate: add columns if not exist (MariaDB IF NOT EXISTS) ──
$conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS pay_method VARCHAR(20) NOT NULL DEFAULT 'CASH_DEPOSIT' AFTER queue_status");
$conn->query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_deposit TINYINT(1) NOT NULL DEFAULT 0 AFTER payment_method");
$conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'SILVER' AFTER pax_amount");
$conn->query("ALTER TABLE queues MODIFY COLUMN tier VARCHAR(20) NOT NULL DEFAULT 'SILVER'");
$conn->query("CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_queue_id (queue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conn->query("CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_tel VARCHAR(20) NOT NULL,
  customer_email VARCHAR(150) DEFAULT NULL,
  subject VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread','read','replied') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// migration: add customer_email if missing
$col = $conn->query("SHOW COLUMNS FROM contact_messages LIKE 'customer_email'");
if ($col && $col->num_rows === 0) {
    $conn->query("ALTER TABLE contact_messages ADD COLUMN customer_email VARCHAR(150) DEFAULT NULL AFTER customer_tel");
}

// ── Vouchers ──
$conn->query("CREATE TABLE IF NOT EXISTS vouchers (
  voucher_id    INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(32) NOT NULL UNIQUE,
  discount_pct  DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_uses      INT NOT NULL DEFAULT 1,
  used_count    INT NOT NULL DEFAULT 0,
  expires_at    DATETIME,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  description   VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(32) DEFAULT NULL AFTER pay_method");
$conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER voucher_code");

// ── VAPID Web Push ──
define('VAPID_PUBLIC',  'BHXRLotk_zLnzPtx__Vv6GE-6dBnoas-KO3r7GAyoUigAfOqgtwKVp3QpkINLlOP7_tK071XpABPO7EquVfqWbA');
define('VAPID_PRIVATE', 'LhRMGaFPDb3Uk56q07bsZSwsUn_qIZla-a6EJjjIlss');
define('VAPID_SUBJECT', 'mailto:admin@bbqgrill.com');

function b64u_encode(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64u_decode(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

function hkdf_expand(string $prk, string $info, int $len): string {
    $t = ''; $okm = '';
    for ($i = 1; strlen($okm) < $len; $i++) {
        $t = hash_hmac('sha256', $t . $info . chr($i), $prk, true);
        $okm .= $t;
    }
    return substr($okm, 0, $len);
}

function vapid_sign(string $endpoint): string {
    $aud = parse_url($endpoint, PHP_URL_SCHEME) . '://' . parse_url($endpoint, PHP_URL_HOST);
    $hdr = b64u_encode(json_encode(['typ'=>'JWT','alg'=>'ES256']));
    $pay = b64u_encode(json_encode(['aud'=>$aud,'exp'=>time()+86400,'sub'=>VAPID_SUBJECT]));
    $msg = "$hdr.$pay";
    $priv_bytes = b64u_decode(VAPID_PRIVATE);
    $der = "\x30\x31\x02\x01\x01\x04\x20" . $priv_bytes . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";
    $pem = "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----";
    $key = openssl_pkey_get_private($pem);
    openssl_sign($msg, $sig_der, $key, OPENSSL_ALGO_SHA256);
    $off = 2;
    $r_len = ord($sig_der[$off + 1]); $r = substr($sig_der, $off + 2, $r_len); $off += 2 + $r_len;
    $s_len = ord($sig_der[$off + 1]); $s = substr($sig_der, $off + 2, $s_len);
    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    return $msg . '.' . b64u_encode($r . $s);
}

function _do_push(string $endpoint, string $p256dh_b64, string $auth_b64, string $plaintext): void {
    $ua_pub      = b64u_decode($p256dh_b64);
    $auth_secret = b64u_decode($auth_b64);
    $eph = openssl_pkey_new(['curve_name'=>'prime256v1','private_key_type'=>OPENSSL_KEYTYPE_EC]);
    $det = openssl_pkey_get_details($eph);
    $as_pub = "\x04" .
        str_pad($det['ec']['x'], 32, "\x00", STR_PAD_LEFT) .
        str_pad($det['ec']['y'], 32, "\x00", STR_PAD_LEFT);
    $spki = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" . $ua_pub;
    $ua_pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----";
    $ua_key = openssl_pkey_get_public($ua_pem);
    $shared = openssl_pkey_derive($ua_key, $eph, 32);
    $prk_key = hash_hmac('sha256', $shared, $auth_secret, true);
    $ikm     = hkdf_expand($prk_key, "WebPush: info\x00" . $ua_pub . $as_pub, 32);
    $salt    = random_bytes(16);
    $prk2    = hash_hmac('sha256', $ikm, $salt, true);
    $cek     = hkdf_expand($prk2, "Content-Encoding: aes128gcm\x00", 16);
    $nonce   = hkdf_expand($prk2, "Content-Encoding: nonce\x00", 12);
    $tag = '';
    $ct  = openssl_encrypt($plaintext . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    $body = $salt . pack('N', 4096) . "\x41" . $as_pub . $ct . $tag;
    $jwt = vapid_sign($endpoint);
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Authorization: vapid t=' . $jwt . ',k=' . VAPID_PUBLIC,
            'TTL: 86400',
        ],
    ]);
    curl_exec($ch);
    curl_close($ch);
}

function send_push(int $queue_id, string $title, string $body_text): void {
    global $conn;
    $stmt = $conn->prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE queue_id=?");
    $stmt->bind_param('i', $queue_id); $stmt->execute();
    $subs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC); $stmt->close();
    $payload = json_encode([
        'title' => $title,
        'body'  => $body_text,
        'icon'  => '/favicon.ico',
        'data'  => ['queue_id' => $queue_id]
    ], JSON_UNESCAPED_UNICODE);
    foreach ($subs as $s) {
        try { _do_push($s['endpoint'], $s['p256dh'], $s['auth'], $payload); } catch (Throwable $ignored) {}
    }
}

// ── Tier pricing ──
function tier_price(string $tier): int {
    return match($tier) {
        'SILVER' => 299, 'GOLD' => 399, 'PLATINUM' => 599,
        default  => 299,
    };
}
function valid_tier(string $tier): string {
    return in_array($tier, ['SILVER','GOLD','PLATINUM'], true) ? $tier : 'SILVER';
}

// ── Helpers ──
function json_out($data, $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
function require_auth(): array {
    if (empty($_SESSION['emp_id'])) json_out(['error' => 'Unauthorized'], 401);
    return $_SESSION;
}
function require_admin(): array {
    $s = require_auth();
    if ($s['role'] !== 'ADMIN') json_out(['error' => 'Forbidden'], 403);
    return $s;
}
function qid(int $id): string {
    return '#' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
}

// ── Router ──
$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip script directory prefix
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$path = '/' . ltrim(substr($path, strlen($base)), '/');

// Route matching helper
function match_route(string $method, string $pattern, string $actual, string $req_method): array|false {
    if ($req_method !== $method) return false;
    $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
    if (!preg_match('#^' . $regex . '$#', $actual, $m)) return false;
    $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
    return $params ?: ['_matched' => true];  // ← บรรทัดนี้เท่านั้นที่เปลี่ยน
}

// ══════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════
if ($p = match_route('POST', '/auth/login', $path, $method)) {
    global $conn;
    $b = body();
    $username = trim($b['username'] ?? '');
    $password = trim($b['password'] ?? '');

    if ($username === '' || $password === '') json_out(['error' => 'กรุณากรอก username และ password'], 400);

    $stmt = $conn->prepare("SELECT emp_id, emp_name, username, password_hash, role, is_active FROM employees WHERE username=? LIMIT 1");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $u = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$u || !(int)$u['is_active']) json_out(['error' => 'บัญชีไม่พบหรือถูกปิดใช้งาน'], 401);
    if (!password_verify($password, $u['password_hash'])) json_out(['error' => 'รหัสผ่านไม่ถูกต้อง'], 401);

    $_SESSION['emp_id']   = (int)$u['emp_id'];
    $_SESSION['emp_name'] = $u['emp_name'];
    $_SESSION['role']     = $u['role'];

    json_out(['user' => ['emp_id' => (int)$u['emp_id'], 'emp_name' => $u['emp_name'], 'username' => $u['username'], 'role' => $u['role']]]);
}

if ($p = match_route('POST', '/auth/logout', $path, $method)) {
    session_unset(); session_destroy();
    json_out(['ok' => true]);
}

if ($p = match_route('GET', '/auth/me', $path, $method)) {
    if (empty($_SESSION['emp_id'])) json_out(['user' => null]);
    json_out(['user' => ['emp_id' => $_SESSION['emp_id'], 'emp_name' => $_SESSION['emp_name'], 'role' => $_SESSION['role']]]);
}

// ══════════════════════════════════════════════
//  QUEUES
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/queues', $path, $method)) {
    require_auth();
    global $conn;

    $status = $_GET['status'] ?? 'active'; // active | all | WAITING | CONFIRMED | SEATED
    $date   = $_GET['date'] ?? date('Y-m-d');

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $date = date('Y-m-d');

    $where = ["DATE(q.created_at) = ?"];
    $params = [$date]; $types = "s";

    if ($status === 'active') {
        $where[] = "q.queue_status IN ('WAITING','CONFIRMED','SEATED')";
    } elseif (in_array($status, ['WAITING','CONFIRMED','SEATED','FINISHED','CANCELLED'], true)) {
        $where[] = "q.queue_status = ?";
        $params[] = $status; $types .= "s";
    }

    $sql = "SELECT q.queue_id, q.pax_amount, q.tier, q.booking_time, q.queue_status,
                   q.created_at, q.confirmed_at, q.seated_at, q.finished_at, q.cancelled_at,
                   q.pay_token, q.pay_token_expires, q.table_id, q.pay_method,
                   c.customer_name, c.customer_tel,
                   t.table_number,
                   p.payment_id, p.total_amount, p.payment_method, p.payment_time,
                   p.subtotal_amount, p.service_amount, p.vat_amount, p.is_deposit
            FROM queues q
            JOIN customers c  ON q.customer_id = c.customer_id
            LEFT JOIN tables t  ON q.table_id   = t.table_id
            LEFT JOIN payments p ON p.queue_id  = q.queue_id
            WHERE " . implode(" AND ", $where) . "
            ORDER BY q.created_at ASC
            LIMIT 300";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Add pay_link helper
    $base_url = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];

    foreach ($rows as &$r) {
        $r['queue_id_str'] = qid((int)$r['queue_id']);
        $r['is_paid'] = !empty($r['payment_id']);
        $r['is_qr'] = !empty($r['pay_token']);
        $r['is_deposit'] = !empty($r['is_deposit']);
        $pax_r = (int)$r['pax_amount'];
        $tier_r = $r['tier'] ?? 'SILVER';
        $pp_r   = tier_price($tier_r);
        $r['price_per_person'] = $pp_r;
        $subtotal_r = $pax_r * $pp_r;
        $service_r  = round($subtotal_r * 0.10, 2);
        $vat_r      = round(($subtotal_r + $service_r) * 0.07, 2);
        $grand_r    = $subtotal_r + $service_r + $vat_r;
        $deposit_r  = $pax_r * 100;
        $r['deposit_amount']   = $deposit_r;
        $r['remaining_amount'] = round($grand_r - $deposit_r, 2);
        if ($r['is_qr'] && !empty($r['pay_token'])) {
            $r['pay_link'] = $base_url . '/#/pay/' . $r['queue_id'] . '?token=' . urlencode($r['pay_token']);
        } else {
            $r['pay_link'] = null;
        }

        $seated_at = $r['seated_at'] ?? null;
        $buffet_min = 90;
        $r['buffet_duration'] = $buffet_min;
        if ($seated_at) {
            $end_ts = strtotime($seated_at) + ($buffet_min * 60);
            $r['buffet_ends_at'] = date('Y-m-d H:i:s', $end_ts);
            $r['time_remaining_sec'] = max(0, $end_ts - time());
        } else {
            $r['buffet_ends_at'] = null;
            $r['time_remaining_sec'] = null;
        }
    }

    json_out(['queues' => $rows]);
}

if ($p = match_route('POST', '/queues', $path, $method)) {
    // Public - create queue (booking)
    global $conn;
    $b = body();
    $name       = trim($b['customer_name'] ?? '');
    $tel        = trim($b['customer_tel'] ?? '');
    $pax          = (int)($b['pax_amount'] ?? 0);
    $slot_id      = (int)($b['slot_id'] ?? 0);
    $booking_date = trim($b['booking_date'] ?? date('Y-m-d'));
    $pay_method   = trim($b['pay_method'] ?? 'CASH_DEPOSIT'); // CASH_DEPOSIT | QR_FULL | QR_DEPOSIT
    if (!in_array($pay_method, ['CASH_DEPOSIT','QR_FULL','QR_DEPOSIT'], true)) $pay_method = 'CASH_DEPOSIT';
    $tier = valid_tier(trim($b['tier'] ?? 'SILVER'));

    if ($name === '' || $tel === '' || $pax <= 0) json_out(['error' => 'กรุณากรอกข้อมูลให้ครบ'], 400);
    if (!preg_match('/^\d{9,10}$/', preg_replace('/\D/','',$tel))) json_out(['error' => 'เบอร์โทรไม่ถูกต้อง'], 400);
    if ($pax < 1 || $pax > 20) json_out(['error' => 'จำนวนคน 1–20'], 400);
    if ($slot_id <= 0) json_out(['error' => 'กรุณาเลือกรอบเวลา'], 400);

    $s = $conn->prepare("SELECT slot_id, slot_time, max_capacity, is_active FROM time_slots WHERE slot_id=? LIMIT 1");
    $s->bind_param("i", $slot_id); $s->execute();
    $slot = $s->get_result()->fetch_assoc(); $s->close();
    if (!$slot) json_out(['error' => 'ไม่พบรอบเวลา'], 400);
    if (!(int)$slot['is_active']) json_out(['error' => 'รอบเวลานี้ปิดให้บริการ'], 400);

    $s = $conn->prepare("SELECT COALESCE(SUM(pax_amount),0) as total FROM queues WHERE slot_id=? AND DATE(booking_time)=? AND queue_status!='CANCELLED'");
    $s->bind_param("is", $slot_id, $booking_date); $s->execute();
    $booked = (int)$s->get_result()->fetch_assoc()['total']; $s->close();
    if ($booked + $pax > (int)$slot['max_capacity']) {
        json_out(['error' => 'รอบนี้เต็มแล้ว (' . (int)$slot['max_capacity'] . ' คน/รอบ)'], 400);
    }

    $time = $booking_date . ' ' . substr($slot['slot_time'], 0, 5) . ':00';

    // Voucher (extracted before transaction; FOR UPDATE lock happens inside)
    $voucher_code    = strtoupper(trim($b['voucher_code'] ?? ''));
    $discount_pct    = 0.0;
    $discount_amount = 0.0;

    $conn->begin_transaction();
    try {
        // Upsert customer
        $stmt = $conn->prepare("INSERT INTO customers (customer_name, customer_tel) VALUES (?,?) ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name)");
        $stmt->bind_param("ss", $name, $tel);
        $stmt->execute();
        $cid = $conn->insert_id ?: (function() use ($conn, $tel) {
            $s = $conn->prepare("SELECT customer_id FROM customers WHERE customer_tel=? LIMIT 1");
            $s->bind_param("s", $tel); $s->execute();
            return (int)$s->get_result()->fetch_assoc()['customer_id'];
        })();
        $stmt->close();

        // Compute price (inside transaction so discount is consistent)
        $pp_n       = tier_price($tier);
        $subtotal_n = $pax * $pp_n;
        $service_n  = round($subtotal_n * 0.10, 2);
        $vat_n      = round(($subtotal_n + $service_n) * 0.07, 2);
        $grand_n    = $subtotal_n + $service_n + $vat_n;

        // Validate voucher with row-level lock
        if ($voucher_code !== '') {
            $sv = $conn->prepare("SELECT voucher_id, discount_pct, max_uses, used_count, expires_at, is_active FROM vouchers WHERE code = ? LIMIT 1 FOR UPDATE");
            $sv->bind_param('s', $voucher_code);
            $sv->execute();
            $vrow = $sv->get_result()->fetch_assoc();
            $sv->close();

            if (!$vrow || !(int)$vrow['is_active'] ||
                ($vrow['expires_at'] && strtotime($vrow['expires_at']) < time()) ||
                ($vrow['max_uses'] > 0 && (int)$vrow['used_count'] >= (int)$vrow['max_uses'])) {
                $conn->rollback();
                json_out(['error' => 'โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ'], 400);
            }
            $discount_pct    = (float)$vrow['discount_pct'];
            $discount_amount = round($grand_n * ($discount_pct / 100), 2);
        }

        $grand_n_after = $grand_n - $discount_amount;
        $deposit_n     = $pax * 100;

        // Generate QR token for all pay methods (deposit or full)
        $token   = bin2hex(random_bytes(16));
        $expires = date('Y-m-d H:i:s', time() + 30 * 60); // 30 min

        $vc_param = $voucher_code ?: null;
        $stmt = $conn->prepare("INSERT INTO queues (customer_id, pax_amount, tier, booking_time, queue_status, pay_method, pay_token, pay_token_expires, slot_id, voucher_code, discount_amount) VALUES (?,?,?,?,'WAITING',?,?,?,?,?,?)");
        $stmt->bind_param("iissssissd", $cid, $pax, $tier, $time, $pay_method, $token, $expires, $slot_id, $vc_param, $discount_amount);
        $stmt->execute();
        $qid_int = (int)$conn->insert_id;
        $stmt->close();

        // Increment used_count atomically
        if ($voucher_code !== '') {
            $conn->query("UPDATE vouchers SET used_count = used_count + 1 WHERE code = '" . $conn->real_escape_string($voucher_code) . "'");
        }

        $conn->commit();

        $base_url = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
        $data = [
            'queue_id'         => $qid_int,
            'queue_id_str'     => qid($qid_int),
            'customer_name'    => $name,
            'pax_amount'       => $pax,
            'tier'             => $tier,
            'price_per_person' => $pp_n,
            'queue_status'     => 'WAITING',
            'pay_method'       => $pay_method,
            'pay_token'        => $token,
            'pay_token_expires'=> $expires,
            'pay_link'         => $base_url . '/#/pay/' . $qid_int . '?token=' . urlencode($token),
            'deposit_amount'   => $deposit_n,
            'voucher_code'     => $voucher_code ?: null,
            'discount_pct'     => $discount_pct,
            'discount_amount'  => $discount_amount,
            'remaining_amount' => round($grand_n_after - $deposit_n, 2),
        ];
        json_out($data, 201);
    } catch (Throwable $e) {
        $conn->rollback();
        json_out(['error' => $e->getMessage()], 500);
    }
}

if ($p = match_route('PATCH', '/queues/{id}', $path, $method)) {
    require_auth();
    global $conn;
    $b  = body();
    $id = (int)$p['id'];
    $action = trim($b['action'] ?? '');

    if ($id <= 0) json_out(['error' => 'queue_id ไม่ถูกต้อง'], 400);

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT queue_id, queue_status, table_id, pay_token, pay_token_expires, pax_amount, tier FROM queues WHERE queue_id=? FOR UPDATE");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $q = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$q) throw new Exception("ไม่พบคิว", 404);

        switch ($action) {
            case 'confirm':
                if ($q['queue_status'] !== 'WAITING') throw new Exception("ต้องเป็น WAITING เท่านั้น");
                $stmt = $conn->prepare("UPDATE queues SET queue_status='CONFIRMED', confirmed_at=NOW() WHERE queue_id=?");
                $stmt->bind_param("i", $id); $stmt->execute(); $stmt->close();
                $conn->commit();
                send_push($id, 'BBQ GRILL 🔥', "คิว #$id ของคุณได้รับการยืนยันแล้ว โปรดมาที่ร้านตามเวลาที่คุณจอง");
                json_out(['ok' => true, 'queue_id' => $id]);

            case 'seat':
                $table_id = (int)($b['table_id'] ?? 0);
                if ($q['queue_status'] !== 'CONFIRMED') throw new Exception("ต้องเป็น CONFIRMED เท่านั้น");
                if ($table_id <= 0) throw new Exception("กรุณาเลือกโต๊ะ");
                // Lock table
                $st = $conn->prepare("SELECT status, capacity, table_number FROM tables WHERE table_id=? FOR UPDATE");
                $st->bind_param("i", $table_id); $st->execute();
                $tbl = $st->get_result()->fetch_assoc(); $st->close();
                if (!$tbl) throw new Exception("ไม่พบโต๊ะ");
                if ($tbl['status'] !== 'AVAILABLE') throw new Exception("โต๊ะนี้ไม่ว่าง");
                $stmt = $conn->prepare("UPDATE tables SET status='OCCUPIED' WHERE table_id=? AND status='AVAILABLE'");
                $stmt->bind_param("i", $table_id); $stmt->execute();
                if ($stmt->affected_rows <= 0) throw new Exception("โต๊ะถูกจองก่อนหน้า");
                $stmt->close();
                $stmt = $conn->prepare("UPDATE queues SET table_id=?, queue_status='SEATED', seated_at=NOW() WHERE queue_id=? AND queue_status='CONFIRMED'");
                $stmt->bind_param("ii", $table_id, $id); $stmt->execute(); $stmt->close();
                $seat_table_number = $tbl['table_number'];
                $conn->commit();
                send_push($id, 'BBQ GRILL 🔥', "ได้รับการจัดโต๊ะแล้ว! กรุณามาที่โต๊ะ #{$seat_table_number} ได้เลยครับ");
                json_out(['ok' => true, 'queue_id' => $id]);

            case 'cancel':
                if (in_array($q['queue_status'], ['CANCELLED','FINISHED'], true)) throw new Exception("ยกเลิกไม่ได้");
                $tid = (int)($q['table_id'] ?? 0);
                $stmt = $conn->prepare("UPDATE queues SET queue_status='CANCELLED', cancelled_at=NOW(), table_id=NULL, pay_token=NULL, pay_token_expires=NULL WHERE queue_id=?");
                $stmt->bind_param("i", $id); $stmt->execute(); $stmt->close();
                if ($tid > 0) {
                    $stmt = $conn->prepare("UPDATE tables SET status='AVAILABLE' WHERE table_id=?");
                    $stmt->bind_param("i", $tid); $stmt->execute(); $stmt->close();
                }
                break;

            case 'finish_qr':
                // For QR-paid queues, just mark as FINISHED (payment already exists)
                if ($q['queue_status'] !== 'SEATED') throw new Exception("ต้องเป็น SEATED เท่านั้น");
                $s = $conn->prepare("SELECT payment_id FROM payments WHERE queue_id=? LIMIT 1");
                $s->bind_param("i", $id); $s->execute();
                if (!$s->get_result()->fetch_assoc()) throw new Exception("ยังไม่ได้ชำระเงิน");
                $s->close();

                $stmt = $conn->prepare("UPDATE queues SET queue_status='FINISHED', finished_at=NOW() WHERE queue_id=?");
                $stmt->bind_param("i", $id); $stmt->execute(); $stmt->close();

                $tid = (int)($q['table_id'] ?? 0);
                if ($tid > 0) {
                    $stmt = $conn->prepare("UPDATE tables SET status='AVAILABLE' WHERE table_id=?");
                    $stmt->bind_param("i", $tid); $stmt->execute(); $stmt->close();
                }
                break;

            case 'finish_cash':
            case 'finish_card':
                if ($q['queue_status'] !== 'SEATED') throw new Exception("ต้องเป็น SEATED เท่านั้น");
                $s = $conn->prepare("SELECT payment_id, is_deposit FROM payments WHERE queue_id=? LIMIT 1");
                $s->bind_param("i", $id); $s->execute();
                $existing_payment = $s->get_result()->fetch_assoc();
                $s->close();

                // ถ้ามี payment แล้วและไม่ใช่ deposit → ชำระครบแล้ว
                if ($existing_payment && !(int)$existing_payment['is_deposit']) {
                    throw new Exception("ชำระแล้ว");
                }
                // ถ้ามี deposit payment → รับชำระส่วนที่เหลือได้

                // คำนวณยอดที่ต้องรับ
                $pax      = (int)$q['pax_amount'];
                $tier_f   = $q['tier'] ?? 'SILVER';
                $pp_f     = tier_price($tier_f);
                $subtotal = $pax * $pp_f;
                $service  = round($subtotal * 0.10, 2);
                $vat      = round(($subtotal + $service) * 0.07, 2);
                $grand    = $subtotal + $service + $vat;

                // ถ้ามี deposit แล้ว รับแค่ส่วนที่เหลือ
                $deposit_amount = $existing_payment ? $pax * 100 : 0;
                $amount_to_receive = $grand - $deposit_amount;

                // INSERT payment ยอดที่เหลือ
                $pm = $action === 'finish_cash' ? 'CASH' : 'CARD';
                $stmt = $conn->prepare("INSERT INTO payments 
                    (queue_id, subtotal_amount, service_amount, vat_amount, total_amount, payment_method, is_deposit, payment_time) 
                    VALUES (?,?,?,?,?,?,0,NOW())");
                $stmt->bind_param("idddds", $id, $subtotal, $service, $vat, $amount_to_receive, $pm);
                $stmt->execute(); $stmt->close();

                $stmt = $conn->prepare("UPDATE queues SET queue_status='FINISHED', finished_at=NOW() WHERE queue_id=?");
                $stmt->bind_param("i", $id); $stmt->execute(); $stmt->close();

                $tid = (int)($q['table_id'] ?? 0);
                if ($tid > 0) {
                    $stmt = $conn->prepare("UPDATE tables SET status='AVAILABLE' WHERE table_id=?");
                    $stmt->bind_param("i", $tid); $stmt->execute(); $stmt->close();
                }
                break;

            case 'regen_qr':
                // Regenerate QR token
                $token   = bin2hex(random_bytes(16));
                $expires = date('Y-m-d H:i:s', time() + 15 * 60);
                $stmt = $conn->prepare("UPDATE queues SET pay_token=?, pay_token_expires=? WHERE queue_id=?");
                $stmt->bind_param("ssi", $token, $expires, $id); $stmt->execute(); $stmt->close();
                $base_url = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
                $conn->commit();
                json_out(['ok' => true, 'pay_token' => $token, 'pay_token_expires' => $expires,
                    'pay_link' => $base_url . '/#/pay/' . $id . '?token=' . urlencode($token)]);

            default:
                throw new Exception("action ไม่รู้จัก: $action", 400);
        }

        $conn->commit();
        json_out(['ok' => true, 'queue_id' => $id]);
    } catch (Throwable $e) {
        $conn->rollback();
        json_out(['error' => $e->getMessage()], $e->getCode() ?: 400);
    }
}

// ══════════════════════════════════════════════
//  TABLES
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/tables', $path, $method)) {
    require_auth();
    global $conn;
    $only_available = ($_GET['available'] ?? '') === '1';
    $sql = $only_available
        ? "SELECT table_id, table_number, capacity, status FROM tables WHERE status='AVAILABLE' ORDER BY capacity ASC, table_number ASC"
        : "SELECT table_id, table_number, capacity, status FROM tables ORDER BY table_number ASC";
    $res = $conn->query($sql);
    json_out(['tables' => $res->fetch_all(MYSQLI_ASSOC)]);
}

// ══════════════════════════════════════════════
//  PAYMENTS (queue public confirm via pay.php token)
// ══════════════════════════════════════════════
if ($p = match_route('POST', '/payments/confirm', $path, $method)) {
    // Called by Angular pay page after customer taps confirm
    global $conn;
    $b        = body();
    $queue_id = (int)($b['queue_id'] ?? 0);
    $token    = trim($b['token'] ?? '');

    if ($queue_id <= 0 || $token === '') json_out(['error' => 'ข้อมูลไม่ครบ'], 400);

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT queue_status, pay_token, pay_token_expires, pax_amount, pay_method, tier FROM queues WHERE queue_id=? FOR UPDATE");
        $stmt->bind_param("i", $queue_id); $stmt->execute();
        $q = $stmt->get_result()->fetch_assoc(); $stmt->close();

        if (!$q) throw new Exception("ไม่พบคิว");
        if (in_array($q['queue_status'], ['FINISHED','CANCELLED'], true)) throw new Exception("คิวนี้ปิดแล้ว");
        if (empty($q['pay_token']) || !hash_equals((string)$q['pay_token'], (string)$token)) throw new Exception("Token ไม่ถูกต้อง");
        if (strtotime($q['pay_token_expires']) <= time()) throw new Exception("QR หมดอายุ");

        $stmt = $conn->prepare("SELECT payment_id, is_deposit FROM payments WHERE queue_id=? ORDER BY payment_id DESC LIMIT 1 FOR UPDATE");
        $stmt->bind_param("i", $queue_id); $stmt->execute();
        $existing = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        if ($existing) {
            // ถ้าเจอและ is_deposit=0 → จ่ายเต็มแล้ว
            if ((int)$existing['is_deposit'] === 0) {
                $conn->commit();
                json_out(['ok' => true, 'already_paid' => true]);
            }
            // ถ้าเจอและ is_deposit=1 → มัดจำแล้ว รอรับที่ร้าน
            $conn->commit();
            json_out(['ok' => true, 'already_paid' => true]);
        }

        $pax      = (int)$q['pax_amount'];
        $pay_m    = $q['pay_method'] ?? 'QR_FULL';
        $tier_c   = $q['tier'] ?? 'SILVER';
        $pp_c     = tier_price($tier_c);
        $subtotal = $pax * $pp_c;
        $service  = round($subtotal * 0.10, 2);
        $vat      = round(($subtotal + $service) * 0.07, 2);
        $grand    = $subtotal + $service + $vat;
        $deposit  = $pax * 100;

        // Deposit methods: CASH_DEPOSIT, QR_DEPOSIT → record only deposit amount
        $is_deposit = in_array($pay_m, ['CASH_DEPOSIT','QR_DEPOSIT'], true) ? 1 : 0;
        $amount   = $is_deposit ? $deposit : $grand;
        // For deposit, set subtotal/service/vat to deposit (simplified)
        if ($is_deposit) {
            $rec_subtotal = $deposit; $rec_service = 0; $rec_vat = 0; $rec_total = $deposit;
        } else {
            $rec_subtotal = $subtotal; $rec_service = $service; $rec_vat = $vat; $rec_total = $grand;
        }
        $pm = 'PROMPTPAY';

        $stmt = $conn->prepare("INSERT INTO payments (queue_id, subtotal_amount, service_amount, vat_amount, total_amount, payment_method, is_deposit, payment_time) VALUES (?,?,?,?,?,?,?,NOW())");
        $stmt->bind_param("iddddsi", $queue_id, $rec_subtotal, $rec_service, $rec_vat, $rec_total, $pm, $is_deposit);
        $stmt->execute(); $stmt->close();

        // Clear pay_token after payment confirmed
        $conn->query("UPDATE queues SET pay_token=NULL, pay_token_expires=NULL WHERE queue_id=$queue_id");

        $conn->commit();
        json_out(['ok' => true, 'is_deposit' => (bool)$is_deposit, 'amount_paid' => $rec_total]);
    } catch (Throwable $e) {
        $conn->rollback();
        json_out(['error' => $e->getMessage()], 400);
    }
}

if ($p = match_route('GET', '/payments/{queue_id}', $path, $method)) {
    global $conn;
    $qid_int = (int)$p['queue_id'];
    $token   = trim($_GET['token'] ?? '');

    $stmt = $conn->prepare("
        SELECT q.queue_id, q.pax_amount, q.tier, q.pay_method, q.booking_time, q.queue_status, q.pay_token, q.pay_token_expires,
               c.customer_name, c.customer_tel,
               t.table_number
        FROM queues q
        JOIN customers c  ON q.customer_id = c.customer_id
        LEFT JOIN tables t ON q.table_id = t.table_id
        WHERE q.queue_id = ?
    ");
    $stmt->bind_param("i", $qid_int); $stmt->execute();
    $d = $stmt->get_result()->fetch_assoc(); $stmt->close();

    if (!$d) json_out(['error' => 'ไม่พบ'], 404);

    // Token validation (for public receipt)
    if ($token !== '' && (empty($d['pay_token']) || !hash_equals((string)$d['pay_token'], (string)$token))) {
        json_out(['error' => 'Token ไม่ถูกต้อง'], 403);
    }
    // Staff: must be authed if no token
    if ($token === '') require_auth();

    // Get all payments and sum total_amount
    $stmt = $conn->prepare("
        SELECT subtotal_amount, service_amount, vat_amount, 
               SUM(total_amount) as total_amount, 
               payment_method, payment_time
        FROM payments 
        WHERE queue_id = ?
        ORDER BY payment_time DESC LIMIT 1
    ");
    $stmt->bind_param("i", $qid_int); $stmt->execute();
    $payment = $stmt->get_result()->fetch_assoc(); $stmt->close();

    if ($payment) {
        $d['subtotal_amount'] = $payment['subtotal_amount'];
        $d['service_amount'] = $payment['service_amount'];
        $d['vat_amount'] = $payment['vat_amount'];
        $d['total_amount'] = $payment['total_amount'];
        $d['payment_method'] = $payment['payment_method'];
        $d['payment_time'] = $payment['payment_time'];
    }

    $ref = strtoupper(substr(md5($qid_int . ($d['payment_time'] ?? '')), 0, 10));
    $d['queue_id_str'] = qid($qid_int);
    $d['ref'] = $ref;
    $d['price_per_person'] = tier_price($d['tier'] ?? 'SILVER');
    $d['pay_method_label'] = ['CASH'=>'เงินสด','QR'=>'QR PromptPay','PROMPTPAY'=>'QR PromptPay','CARD'=>'บัตรเครดิต/เดบิต'][$d['payment_method'] ?? ''] ?? ($d['payment_method'] ?? '-');

    $pax_d   = (int)($d['pax_amount'] ?? 0);
    $pp_d    = tier_price($d['tier'] ?? 'SILVER');
    $sub_d   = $pax_d * $pp_d;
    $svc_d   = round($sub_d * 0.10, 2);
    $vat_d   = round(($sub_d + $svc_d) * 0.07, 2);
    $grand_d = $sub_d + $svc_d + $vat_d;
    $dep_d   = $pax_d * 100;
    $d['deposit_amount']   = $dep_d;
    $d['remaining_amount'] = round($grand_d - $dep_d, 2);

    json_out($d);
}

// Get all payments for a queue (for receipt breakdown)
if ($p = match_route('GET', '/payments/all/{queue_id}', $path, $method)) {
    global $conn;
    $qid_int = (int)$p['queue_id'];

    $stmt = $conn->prepare("
        SELECT payment_id, total_amount, is_deposit, payment_method, payment_time
        FROM payments
        WHERE queue_id = ?
        ORDER BY payment_time ASC
    ");
    $stmt->bind_param("i", $qid_int);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $payments = [];
    while ($row = $result->fetch_assoc()) {
        $payments[] = $row;
    }
    $stmt->close();

    json_out(['payments' => $payments]);
}

// ══════════════════════════════════════════════
//  QUEUE PUBLIC (token-based, no auth required)
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/queue-public/{queue_id}', $path, $method)) {
    global $conn;
    $qid_int = (int)$p['queue_id'];
    $token   = trim($_GET['token'] ?? '');

    if ($qid_int <= 0 || $token === '') json_out(['error' => 'ข้อมูลไม่ครบ'], 400);

    $stmt = $conn->prepare("
        SELECT q.queue_id, q.pax_amount, q.tier, q.pay_method, q.booking_time,
               q.queue_status, q.pay_token, q.pay_token_expires,
               q.created_at, q.seated_at, q.table_id,
               c.customer_name, c.customer_tel,
               t.table_number,
               p.payment_id, p.payment_method AS paid_method, p.payment_time
        FROM queues q
        JOIN customers c  ON q.customer_id = c.customer_id
        LEFT JOIN tables t ON q.table_id = t.table_id
        LEFT JOIN payments p ON p.queue_id = q.queue_id
        WHERE q.queue_id = ?
        LIMIT 1
    ");
    $stmt->bind_param("i", $qid_int); $stmt->execute();
    $d = $stmt->get_result()->fetch_assoc(); $stmt->close();

    if (!$d) json_out(['error' => 'ไม่พบคิว'], 404);
    if (empty($d['pay_token'])) {
        // pay_token cleared after payment confirmed — allow only if queue is already paid
        if (empty($d['payment_id'])) json_out(['error' => 'Token ไม่ถูกต้อง'], 403);
    } elseif (!hash_equals((string)$d['pay_token'], $token)) {
        json_out(['error' => 'Token ไม่ถูกต้อง'], 403);
    }

    $pax_q   = (int)$d['pax_amount'];
    $tier_q  = $d['tier'] ?? 'SILVER';
    $pp_q    = tier_price($tier_q);
    $sub_q   = $pax_q * $pp_q;
    $svc_q   = round($sub_q * 0.10, 2);
    $vat_q   = round(($sub_q + $svc_q) * 0.07, 2);
    $grand_q = $sub_q + $svc_q + $vat_q;
    $dep_q   = $pax_q * 100;

    $d['queue_id_str']     = qid($qid_int);
    $d['price_per_person'] = $pp_q;
    $d['deposit_amount']   = $dep_q;
    $d['remaining_amount'] = round($grand_q - $dep_q, 2);
    $d['is_paid']          = !empty($d['payment_id']);
    $d['is_qr']            = !empty($d['pay_token']);
    $d['created_at']       = $d['created_at'] ?? $d['booking_time'];

    json_out($d);
}

// ══════════════════════════════════════════════
//  TIME SLOTS
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/slots', $path, $method)) {
    global $conn;
    $date = trim($_GET['date'] ?? date('Y-m-d'));

    $stmt = $conn->prepare("
        SELECT ts.slot_id, ts.slot_time, ts.max_capacity, ts.is_active,
               COALESCE(SUM(CASE WHEN q.queue_status != 'CANCELLED' THEN q.pax_amount ELSE 0 END), 0) AS booked_pax
        FROM time_slots ts
        LEFT JOIN queues q ON q.slot_id = ts.slot_id AND DATE(q.booking_time) = ?
        WHERE ts.is_active = 1
        GROUP BY ts.slot_id
        ORDER BY ts.slot_time
    ");
    $stmt->bind_param("s", $date); $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC); $stmt->close();

    foreach ($rows as &$r) {
        $r['slot_id']        = (int)$r['slot_id'];
        $r['max_capacity']   = (int)$r['max_capacity'];
        $r['is_active']      = (bool)(int)$r['is_active'];
        $r['booked_pax']     = (int)$r['booked_pax'];
        $r['remaining']      = max(0, $r['max_capacity'] - $r['booked_pax']);
        $r['is_full']        = $r['remaining'] === 0;
        $r['is_nearly_full'] = !$r['is_full'] && $r['remaining'] < 5;
        $r['slot_time']      = substr($r['slot_time'], 0, 5); // HH:MM
    }
    json_out(['slots' => $rows]);
}

if ($p = match_route('POST', '/slots', $path, $method)) {
    global $conn;
    require_admin();
    $b = body();
    $slot_time    = trim($b['slot_time'] ?? '');
    $max_capacity = (int)($b['max_capacity'] ?? 30);
    $is_active    = isset($b['is_active']) ? (int)$b['is_active'] : 1;

    if (!preg_match('/^\d{2}:\d{2}$/', $slot_time)) json_out(['error' => 'รูปแบบเวลาต้องเป็น HH:MM'], 400);
    if ($max_capacity < 1) json_out(['error' => 'ความจุต้องมากกว่า 0'], 400);

    $stmt = $conn->prepare("INSERT INTO time_slots (slot_time, max_capacity, is_active) VALUES (?,?,?)");
    $stmt->bind_param("sii", $slot_time, $max_capacity, $is_active);
    $stmt->execute();
    $new_id = (int)$conn->insert_id;
    $stmt->close();
    json_out(['ok' => true, 'slot_id' => $new_id], 201);
}

if ($p = match_route('PATCH', '/slots/{slot_id}', $path, $method)) {
    global $conn;
    require_admin();
    $sid = (int)$p['slot_id'];
    $b   = body();

    $fields = []; $types = ''; $values = [];
    if (isset($b['max_capacity'])) { $fields[] = 'max_capacity=?'; $types .= 'i'; $values[] = (int)$b['max_capacity']; }
    if (isset($b['is_active']))    { $fields[] = 'is_active=?';    $types .= 'i'; $values[] = (int)$b['is_active']; }
    if (isset($b['slot_time']))    { $fields[] = 'slot_time=?';    $types .= 's'; $values[] = trim($b['slot_time']); }
    if (!$fields) json_out(['error' => 'ไม่มีข้อมูลที่จะอัปเดต'], 400);

    $values[] = $sid;
    $types   .= 'i';
    $stmt = $conn->prepare('UPDATE time_slots SET ' . implode(',', $fields) . ' WHERE slot_id=?');
    $stmt->bind_param($types, ...$values);
    $stmt->execute(); $stmt->close();
    json_out(['ok' => true]);
}

// ══════════════════════════════════════════════
//  EMPLOYEES (Admin only)
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/employees', $path, $method)) {
    require_admin();
    global $conn;
    $res = $conn->query("SELECT emp_id, emp_name, username, role, is_active, created_at FROM employees ORDER BY created_at DESC");
    json_out(['employees' => $res->fetch_all(MYSQLI_ASSOC)]);
}

if ($p = match_route('POST', '/employees', $path, $method)) {
    require_admin();
    global $conn;
    $b = body();
    $name = trim($b['emp_name'] ?? '');
    $user = trim($b['username'] ?? '');
    $pass = trim($b['password'] ?? '');
    $role = trim($b['role'] ?? 'STAFF');

    if ($name === '' || $user === '' || $pass === '') json_out(['error' => 'กรอกข้อมูลให้ครบ'], 400);
    if (!in_array($role, ['ADMIN','STAFF'], true)) json_out(['error' => 'role ไม่ถูกต้อง'], 400);

    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO employees (emp_name, username, password_hash, role, is_active) VALUES (?,?,?,?,1)");
    $stmt->bind_param("ssss", $name, $user, $hash, $role);
    try {
        $stmt->execute();
        json_out(['ok' => true, 'emp_id' => (int)$conn->insert_id], 201);
    } catch (Throwable $e) {
        json_out(['error' => 'username ซ้ำ'], 409);
    }
}

if ($p = match_route('PUT', '/employees/{id}', $path, $method)) {
    require_admin();
    global $conn;
    $b    = body();
    $eid  = (int)$p['id'];
    $name = trim($b['emp_name'] ?? '');
    $role = trim($b['role'] ?? '');

    if ($name === '') json_out(['error' => 'กรอกชื่อ'], 400);
    if (!in_array($role, ['ADMIN','STAFF'], true)) json_out(['error' => 'role ไม่ถูกต้อง'], 400);

    $stmt = $conn->prepare("UPDATE employees SET emp_name=?, role=? WHERE emp_id=?");
    $stmt->bind_param("ssi", $name, $role, $eid); $stmt->execute(); $stmt->close();
    json_out(['ok' => true]);
}

if ($p = match_route('DELETE', '/employees/{id}', $path, $method)) {
    require_admin();
    global $conn;
    $eid = (int)$p['id'];
    $stmt = $conn->prepare("DELETE FROM employees WHERE emp_id=?");
    $stmt->bind_param("i", $eid); $stmt->execute(); $stmt->close();
    json_out(['ok' => true]);
}

if ($p = match_route('PATCH', '/employees/{id}', $path, $method)) {
    $sess = require_admin();
    global $conn;
    $b   = body();
    $eid = (int)$p['id'];
    $act = trim($b['action'] ?? '');

    if ($act === 'reset_password') {
        $pass = trim($b['password'] ?? '');
        if ($pass === '') json_out(['error' => 'กรอกรหัสผ่าน'], 400);
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE employees SET password_hash=? WHERE emp_id=?");
        $stmt->bind_param("si", $hash, $eid); $stmt->execute(); $stmt->close();
        json_out(['ok' => true]);
    }

    if ($act === 'toggle_active') {
        if ($eid === (int)$sess['emp_id']) json_out(['error' => 'ห้ามปิดบัญชีตัวเอง'], 400);
        $to = (int)($b['is_active'] ?? 1);
        $stmt = $conn->prepare("UPDATE employees SET is_active=? WHERE emp_id=?");
        $stmt->bind_param("ii", $to, $eid); $stmt->execute(); $stmt->close();
        json_out(['ok' => true]);
    }

    json_out(['error' => 'action ไม่รู้จัก'], 400);
}

// ══════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/reports/today', $path, $method)) {
    require_admin();
    global $conn;

    $stats = [];

    // Revenue
    $r = $conn->query("SELECT IFNULL(SUM(total_amount),0) rev, IFNULL(AVG(total_amount),0) avg_bill, COUNT(*) cnt FROM payments WHERE DATE(payment_time)=CURDATE()");
    $stats['revenue'] = $r->fetch_assoc();

    // Queue counts by status
    $r = $conn->query("SELECT queue_status, COUNT(*) n FROM queues WHERE DATE(created_at)=CURDATE() GROUP BY queue_status");
    $by_status = ['WAITING'=>0,'CONFIRMED'=>0,'SEATED'=>0,'FINISHED'=>0,'CANCELLED'=>0];
    while ($row = $r->fetch_assoc()) $by_status[$row['queue_status']] = (int)$row['n'];
    $stats['by_status'] = $by_status;
    $stats['total_today'] = array_sum($by_status);

    // Avg wait + dine times
    $r = $conn->query("SELECT AVG(TIMESTAMPDIFF(SECOND,confirmed_at,seated_at)) wait_sec, AVG(TIMESTAMPDIFF(SECOND,seated_at,finished_at)) dine_sec FROM queues WHERE DATE(created_at)=CURDATE() AND confirmed_at IS NOT NULL AND seated_at IS NOT NULL");
    $times = $r->fetch_assoc();
    $stats['avg_wait_min'] = $times['wait_sec'] ? round((float)$times['wait_sec']/60,1) : null;
    $stats['avg_dine_min'] = $times['dine_sec'] ? round((float)$times['dine_sec']/60,1) : null;

    // Peak hour
    $r = $conn->query("SELECT HOUR(created_at) hr, COUNT(*) n FROM queues WHERE DATE(created_at)=CURDATE() GROUP BY hr ORDER BY n DESC LIMIT 1");
    $pk = $r->fetch_assoc();
    $stats['peak_hour'] = $pk ? str_pad($pk['hr'],2,'0',STR_PAD_LEFT).':00' : '-';

    // Revenue by method
    $r = $conn->query("SELECT payment_method, SUM(total_amount) rev, COUNT(*) cnt FROM payments WHERE DATE(payment_time)=CURDATE() GROUP BY payment_method ORDER BY rev DESC");
    $stats['by_method'] = $r->fetch_all(MYSQLI_ASSOC);

    json_out($stats);
}

// ══════════════════════════════════════════════
//  PUSH SUBSCRIBE
// ══════════════════════════════════════════════
if ($p = match_route('POST', '/push-subscribe', $path, $method)) {
    global $conn;
    $b        = body();
    $queue_id = (int)($b['queue_id'] ?? 0);
    $endpoint = trim($b['endpoint'] ?? '');
    $p256dh   = trim($b['p256dh'] ?? '');
    $auth     = trim($b['auth'] ?? '');
    if ($queue_id <= 0 || $endpoint === '' || $p256dh === '' || $auth === '') {
        json_out(['error' => 'ข้อมูลไม่ครบ'], 400);
    }
    $stmt = $conn->prepare("INSERT INTO push_subscriptions (queue_id, endpoint, p256dh, auth) VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth)");
    $stmt->bind_param("isss", $queue_id, $endpoint, $p256dh, $auth);
    $stmt->execute(); $stmt->close();
    json_out(['ok' => true]);
}

// ══════════════════════════════════════════════
//  REPORT — Export CSV
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/report/export', $path, $method)) {
    require_admin();
    global $conn;

    $from = trim($_GET['from'] ?? date('Y-m-d', strtotime('-30 days')));
    $to   = trim($_GET['to']   ?? date('Y-m-d'));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) $from = date('Y-m-d', strtotime('-30 days'));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $to))   $to   = date('Y-m-d');

    $stmt = $conn->prepare("
        SELECT q.queue_id, c.customer_name, c.customer_tel, q.pax_amount, q.tier,
               t.table_number, q.created_at, q.seated_at, q.finished_at,
               MAX(CASE WHEN p.is_deposit=0 THEN p.payment_method END) AS payment_method,
               SUM(CASE WHEN p.is_deposit=1 THEN p.total_amount ELSE 0 END) AS deposit_amount,
               SUM(p.total_amount) AS total_amount,
               q.queue_status
        FROM queues q
        JOIN customers c   ON q.customer_id = c.customer_id
        LEFT JOIN tables t ON q.table_id    = t.table_id
        LEFT JOIN payments p ON p.queue_id  = q.queue_id
        WHERE DATE(q.created_at) BETWEEN ? AND ?
        GROUP BY q.queue_id, c.customer_name, c.customer_tel, q.pax_amount, q.tier,
                 t.table_number, q.created_at, q.seated_at, q.finished_at, q.queue_status
        ORDER BY q.created_at DESC
    ");
    $stmt->bind_param('ss', $from, $to);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Override response headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="bbq-report-' . $from . '-to-' . $to . '.csv"');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');

    $out = fopen('php://output', 'w');
    fputs($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel compatibility
    fputcsv($out, ['queue_id','ชื่อลูกค้า','เบอร์โทร','จำนวนคน','tier','โต๊ะ','เวลาจอง','เวลานั่ง','เวลาเสร็จ','วิธีชำระ','มัดจำ','ยอดรวม','สถานะ']);
    foreach ($rows as $r) {
        fputcsv($out, [
            '#' . str_pad((string)$r['queue_id'], 4, '0', STR_PAD_LEFT),
            $r['customer_name'],
            "\t" . $r['customer_tel'],
            (int)$r['pax_amount'],
            $r['tier'] ?? 'SILVER',
            $r['table_number'] ?? '-',
            $r['created_at'] ?? '',
            $r['seated_at'] ?? '',
            $r['finished_at'] ?? '',
            $r['payment_method'] ?? '-',
            $r['deposit_amount'] !== null ? number_format((float)$r['deposit_amount'], 2, '.', '') : '-',
            $r['total_amount']   !== null ? number_format((float)$r['total_amount'],   2, '.', '') : '-',
            $r['queue_status'],
        ]);
    }
    fclose($out);
    exit;
}

// ══════════════════════════════════════════════
//  REPORT — Revenue Chart Data
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/report/revenue', $path, $method)) {
    require_admin();
    global $conn;

    $period  = trim($_GET['period'] ?? 'daily');
    $labels  = []; $revenue = []; $queues = [];

    if ($period === 'daily') {
        // Last 30 days, one point per day
        $r = $conn->query("
            SELECT DATE(payment_time) AS d,
                   IFNULL(SUM(total_amount), 0) AS rev,
                   COUNT(DISTINCT queue_id) AS cnt
            FROM payments
            WHERE payment_time >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY d ORDER BY d ASC
        ");
        $map = [];
        while ($row = $r->fetch_assoc()) $map[$row['d']] = $row;
        for ($i = 29; $i >= 0; $i--) {
            $d      = date('Y-m-d', strtotime("-{$i} days"));
            $labels[]  = date('d/m', strtotime($d));
            $revenue[] = isset($map[$d]) ? round((float)$map[$d]['rev'], 2) : 0;
            $queues[]  = isset($map[$d]) ? (int)$map[$d]['cnt'] : 0;
        }
    } elseif ($period === 'weekly') {
        // Last 12 weeks, one point per week
        $r = $conn->query("
            SELECT YEARWEEK(payment_time, 1) AS wk,
                   MIN(DATE(payment_time))   AS week_start,
                   IFNULL(SUM(total_amount), 0) AS rev,
                   COUNT(DISTINCT queue_id)  AS cnt
            FROM payments
            WHERE payment_time >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
            GROUP BY wk ORDER BY wk ASC
        ");
        while ($row = $r->fetch_assoc()) {
            $labels[]  = 'W' . date('d/m', strtotime($row['week_start']));
            $revenue[] = round((float)$row['rev'], 2);
            $queues[]  = (int)$row['cnt'];
        }
    } else {
        // monthly — last 12 months
        $r = $conn->query("
            SELECT DATE_FORMAT(payment_time, '%Y-%m') AS mo,
                   IFNULL(SUM(total_amount), 0) AS rev,
                   COUNT(DISTINCT queue_id)  AS cnt
            FROM payments
            WHERE payment_time >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY mo ORDER BY mo ASC
        ");
        while ($row = $r->fetch_assoc()) {
            $labels[]  = date('m/Y', strtotime($row['mo'] . '-01'));
            $revenue[] = round((float)$row['rev'], 2);
            $queues[]  = (int)$row['cnt'];
        }
    }

    json_out(['labels' => $labels, 'revenue' => $revenue, 'queues' => $queues]);
}

// ══════════════════════════════════════════════
//  CUSTOMERS — CRM List
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/customers', $path, $method)) {
    require_auth();
    global $conn;

    $r = $conn->query("
        SELECT c.*,
               COUNT(DISTINCT q.queue_id) AS total_bookings,
               SUM(CASE WHEN q.queue_status='FINISHED' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN q.queue_status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
               MAX(q.created_at) AS last_visit,
               COALESCE(SUM(CASE WHEN p.is_deposit=0 THEN p.total_amount END), 0) AS total_spent,
               ROUND(COALESCE(AVG(CASE WHEN p.is_deposit=0 THEN p.total_amount END), 0), 2) AS avg_spend
        FROM customers c
        LEFT JOIN queues q ON q.customer_id = c.customer_id
        LEFT JOIN payments p ON p.queue_id = q.queue_id
        GROUP BY c.customer_id
        ORDER BY last_visit DESC
    ");
    json_out(['customers' => $r->fetch_all(MYSQLI_ASSOC)]);
}

// ══════════════════════════════════════════════
//  CUSTOMERS — Booking History
// ══════════════════════════════════════════════
if ($p = match_route('GET', '/customers/{id}/history', $path, $method)) {
    require_auth();
    global $conn;
    $cid = (int)$p['id'];

    $stmt = $conn->prepare("
        SELECT q.queue_id, q.pax_amount, q.tier, q.queue_status,
               q.created_at, q.seated_at, q.finished_at,
               t.table_number,
               COALESCE(SUM(CASE WHEN p.is_deposit=0 THEN p.total_amount ELSE 0 END), 0) AS total_amount,
               MAX(CASE WHEN p.is_deposit=0 THEN p.payment_method END) AS payment_method
        FROM queues q
        LEFT JOIN tables t   ON t.table_id  = q.table_id
        LEFT JOIN payments p ON p.queue_id  = q.queue_id
        WHERE q.customer_id = ?
        GROUP BY q.queue_id
        ORDER BY q.created_at DESC
    ");
    $stmt->bind_param('i', $cid);
    $stmt->execute();
    $queues = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    json_out(['queues' => $queues]);
}

// ══════════════════════════════════════════════
//  CONTACT MESSAGES
// ══════════════════════════════════════════════
if ($p = match_route('POST', '/contact-messages', $path, $method)) {
    global $conn;
    $b       = body();
    $name    = trim($b['name']    ?? '');
    $tel     = trim($b['tel']     ?? '');
    $email   = trim($b['email']   ?? '');
    $subject = trim($b['subject'] ?? '');
    $message = trim($b['message'] ?? '');

    if (mb_strlen($name) < 2) json_out(['error' => 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'], 400);
    if (!preg_match('/^[0-9]{9,10}$/', preg_replace('/\D/', '', $tel))) json_out(['error' => 'เบอร์โทรไม่ถูกต้อง'], 400);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['error' => 'รูปแบบอีเมลไม่ถูกต้อง'], 400);
    if (empty($subject)) json_out(['error' => 'กรุณาเลือกหัวข้อ'], 400);
    if (mb_strlen($message) < 10) json_out(['error' => 'ข้อความต้องมีอย่างน้อย 10 ตัวอักษร'], 400);

    $emailVal = $email ?: null;
    $stmt = $conn->prepare("INSERT INTO contact_messages (customer_name, customer_tel, customer_email, subject, message) VALUES (?,?,?,?,?)");
    $stmt->bind_param('sssss', $name, $tel, $emailVal, $subject, $message);
    $stmt->execute();
    $id = (int)$conn->insert_id;
    $stmt->close();

    json_out(['ok' => true, 'message_id' => $id], 201);
}

if ($p = match_route('GET', '/contact-messages', $path, $method)) {
    require_admin();
    global $conn;

    $status_filter = $_GET['status'] ?? 'all';
    $allowed = ['all', 'unread', 'read', 'replied'];
    if (!in_array($status_filter, $allowed, true)) $status_filter = 'all';

    if ($status_filter === 'all') {
        $result = $conn->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
    } else {
        $stmt = $conn->prepare("SELECT * FROM contact_messages WHERE status=? ORDER BY created_at DESC");
        $stmt->bind_param('s', $status_filter);
        $stmt->execute();
        $result = $stmt->get_result();
    }

    $messages = $result->fetch_all(MYSQLI_ASSOC);

    $unread = (int)$conn->query("SELECT COUNT(*) c FROM contact_messages WHERE status='unread'")->fetch_assoc()['c'];

    json_out(['messages' => $messages, 'unread_count' => $unread]);
}

if ($p = match_route('PATCH', '/contact-messages/{id}', $path, $method)) {
    require_admin();
    global $conn;
    $mid    = (int)$p['id'];
    $b      = body();
    $status = trim($b['status'] ?? '');

    if (!in_array($status, ['unread', 'read', 'replied'], true)) {
        json_out(['error' => 'status ไม่ถูกต้อง'], 400);
    }

    $stmt = $conn->prepare("UPDATE contact_messages SET status=? WHERE id=?");
    $stmt->bind_param('si', $status, $mid);
    $stmt->execute();
    $stmt->close();

    json_out(['ok' => true]);
}

if ($p = match_route('DELETE', '/contact-messages/{id}', $path, $method)) {
    require_admin();
    global $conn;
    $mid = (int)$p['id'];
    $stmt = $conn->prepare("DELETE FROM contact_messages WHERE id=?");
    $stmt->bind_param('i', $mid);
    $stmt->execute();
    $stmt->close();
    json_out(['ok' => true]);
}

if ($p = match_route('DELETE', '/contact-messages', $path, $method)) {
    require_admin();
    global $conn;
    $conn->query("DELETE FROM contact_messages");
    json_out(['ok' => true]);
}

// ══════════════════════════════════════════════
//  VOUCHERS
// ══════════════════════════════════════════════

if ($p = match_route('POST', '/vouchers/validate', $path, $method)) {
    global $conn;
    $b    = body();
    $code = strtoupper(trim($b['code'] ?? ''));

    if ($code === '') json_out(['error' => 'กรุณากรอกโค้ด'], 400);

    $stmt = $conn->prepare("
        SELECT voucher_id, code, discount_pct, max_uses, used_count, expires_at, is_active, description
        FROM vouchers WHERE code = ? LIMIT 1
    ");
    $stmt->bind_param('s', $code);
    $stmt->execute();
    $v = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$v)                   json_out(['error' => 'ไม่พบโค้ดส่วนลดนี้'], 404);
    if (!(int)$v['is_active']) json_out(['error' => 'โค้ดนี้ถูกปิดใช้งานแล้ว'], 400);
    if ($v['expires_at'] && strtotime($v['expires_at']) < time())
                               json_out(['error' => 'โค้ดหมดอายุแล้ว'], 400);
    if ($v['max_uses'] > 0 && (int)$v['used_count'] >= (int)$v['max_uses'])
                               json_out(['error' => 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว'], 400);

    json_out([
        'ok'           => true,
        'code'         => $v['code'],
        'discount_pct' => (float)$v['discount_pct'],
        'description'  => $v['description'] ?? '',
        'expires_at'   => $v['expires_at'],
    ]);
}

if ($p = match_route('GET', '/vouchers', $path, $method)) {
    require_admin();
    global $conn;
    $result = $conn->query("SELECT * FROM vouchers ORDER BY created_at DESC");
    $list   = $result->fetch_all(MYSQLI_ASSOC);
    json_out(['vouchers' => $list]);
}

if ($p = match_route('POST', '/vouchers', $path, $method)) {
    require_admin();
    global $conn;

    $b            = body();
    $code         = strtoupper(trim($b['code'] ?? ''));
    $discount_pct = (float)($b['discount_pct'] ?? 0);
    $max_uses     = (int)($b['max_uses'] ?? 1);
    $expires_raw  = trim($b['expires_at'] ?? '');
    // datetime-local sends YYYY-MM-DDTHH:MM — convert to MySQL YYYY-MM-DD HH:MM:SS
    $expires_at   = $expires_raw ? str_replace('T', ' ', $expires_raw) . ':00' : null;
    $description  = trim($b['description'] ?? '');
    $is_active    = isset($b['is_active']) ? (int)$b['is_active'] : 1;

    if ($code === '')  json_out(['error' => 'กรุณากรอกโค้ด'], 400);
    if (!preg_match('/^[A-Z0-9_\-]{3,32}$/', $code)) json_out(['error' => 'โค้ดต้องเป็นตัวอักษรภาษาอังกฤษ/ตัวเลข 3-32 ตัว'], 400);
    if ($discount_pct <= 0 || $discount_pct > 100) json_out(['error' => 'ส่วนลดต้อง 1-100%'], 400);

    $stmt = $conn->prepare("
        INSERT INTO vouchers (code, discount_pct, max_uses, expires_at, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param('sdissi', $code, $discount_pct, $max_uses, $expires_at, $description, $is_active);
    try {
        $stmt->execute();
        $id = (int)$conn->insert_id;
        $stmt->close();
        json_out(['ok' => true, 'voucher_id' => $id], 201);
    } catch (Throwable $e) {
        json_out(['error' => 'โค้ดนี้มีอยู่แล้ว: ' . $e->getMessage()], 409);
    }
}

if ($p = match_route('PATCH', '/vouchers/{id}', $path, $method)) {
    require_admin();
    global $conn;

    $vid    = (int)$p['id'];
    $b      = body();
    $fields = []; $types = ''; $values = [];

    if (isset($b['is_active']))   { $fields[] = 'is_active=?';   $types .= 'i'; $values[] = (int)$b['is_active']; }
    if (isset($b['max_uses']))    { $fields[] = 'max_uses=?';    $types .= 'i'; $values[] = (int)$b['max_uses']; }
    if (isset($b['expires_at']))  { $fields[] = 'expires_at=?';  $types .= 's'; $values[] = $b['expires_at'] ?: null; }
    if (isset($b['description'])) { $fields[] = 'description=?'; $types .= 's'; $values[] = $b['description']; }
    if (!$fields) json_out(['error' => 'ไม่มีข้อมูลที่จะอัปเดต'], 400);

    $values[] = $vid; $types .= 'i';
    $stmt = $conn->prepare('UPDATE vouchers SET ' . implode(',', $fields) . ' WHERE voucher_id=?');
    $stmt->bind_param($types, ...$values);
    $stmt->execute(); $stmt->close();
    json_out(['ok' => true]);
}

if ($p = match_route('DELETE', '/vouchers/{id}', $path, $method)) {
    require_admin();
    global $conn;

    $vid  = (int)$p['id'];
    $stmt = $conn->prepare("DELETE FROM vouchers WHERE voucher_id=?");
    $stmt->bind_param('i', $vid); $stmt->execute(); $stmt->close();
    json_out(['ok' => true]);
}

// ── 404 ──
json_out(['error' => "Route not found: $method $path"], 404);