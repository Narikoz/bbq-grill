# BBQ GRILL Queue Management System — System Flow Documentation

**[FOR AI ASSISTANTS]**: ไฟล์นี้คือเอกสารอธิบายสถาปัตยกรรม โครงสร้างโค้ด และ Business Logic ทั้งหมดของโปรเจค เพื่อให้ AI ตัวอื่น หรือนักพัฒนา สามารถเข้าใจระบบทั้งหมดได้อย่างรวดเร็วก่อนทำการแก้ไขโค้ด

## 🎯 ภาพรวมระบบ

ระบบจัดการคิวร้านบาร์บีคิว แบบ full-stack พร้อม:
- ระบบชำระเงินออนไลน์ (QR PromptPay) รองรับการจ่ายเต็มจำนวนและมัดจำ
- **Tier Pricing** (SILVER/GOLD/PLATINUM) ราคาต่างกันตามระดับบุฟเฟ่ต์
- **Web Push Notifications** แจ้งเตือนลูกค้าเมื่อคิวได้รับการยืนยันและจัดโต๊ะ

---

## 🏗️ Tech Stack

- **Frontend**: Angular 19 (standalone components, signals, TanStack Query)
- **Backend**: PHP 8.3 (single-file REST API)
- **Database**: MariaDB 11.5
- **Server**: Nginx
- **Container**: Docker Compose
- **Timezone**: Asia/Bangkok (GMT+7)

---

## 📂 Project Structure

โปรเจคนี้แบ่งออกเป็น 2 ส่วนหลักๆ คือ Frontend (Angular) และ Backend (PHP) ทำงานร่วมกันผ่าน Docker Compose

### 1. Frontend (`/bbq_angular`)
พัฒนาด้วย Angular 19 (Standalone Components) และใช้โครงสร้างโฟลเดอร์แบบ Feature-based:
- `src/app/core/`
  - `models/index.ts`: กำหนด Interfaces (เช่น `Queue`, `Payment`, `Table`) และ Constants
  - `services/api.service.ts`: จัดการ HTTP Requests ไปยัง Backend (หุ้มด้วย TanStack Query)
  - `services/auth.service.ts`: จัดการ Authentication State (เก็บ Token/User ใน LocalStorage)
- `src/app/features/`
  - `landing/`: หน้าแรกจองคิว (Customer)
  - `pay/`: หน้าชำระเงิน QR PromptPay
  - `queue-status/`: หน้าตรวจสอบสถานะคิว (Public)
  - `receipt/`: หน้าแสดงใบเสร็จรับเงิน
  - `staff/`: Dashboard จัดการคิวสำหรับพนักงาน
  - `admin/`: Dashboard จัดการระบบ (โต๊ะ, พนักงาน, รายงาน)
  - `auth/`: หน้า Login สำหรับพนักงาน/แอดมิน

### 2. Backend (`/bbq_api`)
พัฒนาด้วย PHP 8.3 แบบ Single-file REST API
- `index.php`: ไฟล์หลักที่รวมทุกอย่าง (Router, Controllers, Database Connection)
  - มีระบบ Pattern Matching Router เช่น `match_route('GET', '/queues', ...)`
  - จัดการ Business Logic ทั้งหมด (คำนวณราคา, การจอง, การชำระเงิน, สถานะคิว)
- `init.sql`: ไฟล์ Database Schema เริ่มต้น (ใช้สร้างตารางตอนรัน Docker ครั้งแรก)

---

## � User Roles

| Role | Access |
|------|--------|
| **Customer** | จองโต๊ะ, ชำระเงิน QR, ติดตามคิว, บันทึกใบยืนยัน |
| **Staff** | จัดการคิว (ยืนยัน/จัดโต๊ะ/ยกเลิก), รับชำระเงินหน้าร้าน, สร้าง QR ใหม่ |
| **Admin** | Dashboard, รายงาน, จัดการพนักงาน, จัดการโต๊ะ |

---

## 📋 Core Features

### 0. **Landing Page & Branding** 🌟
- **Animated Backgrounds**: 
  - Canvas 1 (`#emberCanvas`): เอฟเฟกต์สะเก็ดไฟ (Embers) ลอยขึ้นด้านบนแบบ Cinematic
  - Canvas 2 (`#orbCanvas`): เอฟเฟกต์แสงออโรร่าเบลอๆ ซ้อนด้านหลังสะเก็ดไฟ
- **Typewriter Effect**: ข้อความพิมพ์สลับไปมา (เช่น "พรีเมียมบุฟเฟ่ต์ปิ้งย่าง...", "อร่อยคุ้มค่า...")
- **Section Reveal Animations**: ใช้ IntersectionObserver ให้ elements ค่อยๆ เฟดเข้ามาเมื่อ scroll
- **Premium Glassmorphism**: ทุกส่วนใช้กล่องแบบกึ่งโปร่งใส (backdrop-filter) และขอบเรืองแสงสีทอง

---

### 1. **Web Push Notifications** 🔔

**ระบบแจ้งเตือนอัตโนมัติผ่าน Web Push API:**

#### **การทำงาน:**
1. เมื่อลูกค้าเข้าหน้า `/queue-status/:id` และคิวอยู่ในสถานะ WAITING หรือ CONFIRMED
2. ระบบจะขอ permission แจ้งเตือนจากเบราว์เซอร์
3. หากลูกค้าอนุญาต → ระบบจะ register Service Worker (`/sw.js`)
4. Subscribe push notification ด้วย VAPID public key
5. บันทึก subscription ลง `push_subscriptions` table ผ่าน `POST /push-subscribe`

#### **Notification Messages:**
- **เมื่อ Staff กด Confirm:**
  - Title: `BBQ GRILL 🔥`
  - Body: `คิว #{id} ของคุณได้รับการยืนยันแล้ว โปรดมาที่ร้านตามเวลาที่คุณจอง`

- **เมื่อ Staff จัดโต๊ะ (Seat):**
  - Title: `BBQ GRILL 🔥`
  - Body: `ได้รับการจัดโต๊ะแล้ว! กรุณามาที่โต๊ะ #{table_number} ได้เลยครับ`

#### **Technical Implementation:**
- **VAPID Keys** (hardcoded ใน code):
  ```
  PUBLIC:  BHXRLotk_zLnzPtx__Vv6GE-6dBnoas-KO3r7GAyoUigAfOqgtwKVp3QpkINLlOP7_tK071XpABPO7EquVfqWbA
  PRIVATE: LhRMGaFPDb3Uk56q07bsZSwsUn_qIZla-a6EJjjIlss
  SUBJECT: mailto:admin@bbqgrill.com
  ```
- **Backend** (`index.php`):
  - `send_push($queue_id, $title, $body)` — ดึง subscriptions จาก DB → สร้าง JWT VAPID header → curl POST
  - Manual JWT signing ด้วย ES256 (OpenSSL)
  - Manual Web Push encryption (aes128gcm)
  - เรียกใน `case 'confirm'` และ `case 'seat'`
- **Frontend** (`queue-status.page.ts`):
  - `effect()` ตรวจสอบสถานะ → เรียก `requestPushPermission()`
  - Register `/sw.js` → `pushManager.subscribe()`
  - POST subscription ไป `/api/push-subscribe`
- **Service Worker** (`sw.js`):
  - `push` event → `showNotification()`
  - `notificationclick` → `clients.openWindow('/')`

---

### 1. **Customer Booking Flow** (3 Steps)

#### **Step 1 — เลือกวันเวลา & จำนวนคน**
- เลือกวันที่จอง (date picker)
- เลือก time slot (เช่น 18:00, 19:00, 20:00)
  - แสดงจำนวนที่ว่าง/เต็ม
  - ตรวจสอบ capacity ต่อรอบ
- เลือกจำนวนคน (1-20 คน, slider)
- **เลือก Tier** (3 options):
  - 🥈 **SILVER** — ฿299/คน (บุฟเฟ่ต์มาตรฐาน)
  - 🥇 **GOLD** — ฿399/คน (เนื้อพรีเมียม)
  - 💎 **PLATINUM** — ฿599/คน (เนื้อระดับพรีเมียมสูง)
- **เลือกวิธีชำระเงิน** (2 options):
  - 💵 **เงินสด** → `CASH_DEPOSIT`
    - ต้องสแกน QR มัดจำ ฿pax×100 ก่อน
    - จ่ายส่วนที่เหลือหน้าร้าน
  - 📱 **QR PromptPay** → แสดง sub-option ใน Step 2

#### **Step 2 — กรอกข้อมูลลูกค้า**
- **ชื่อ-นามสกุล** (min 2 ตัวอักษร)
- **เบอร์โทร** (9-10 หลัก, unique per customer)
- **QR Sub-option** (แสดงเฉพาะเมื่อเลือก QR):
  - 📱 **จ่ายเต็มจำนวน** → `QR_FULL`
    - ฿{grand} (เช่น ฿703.85)
    - "ชำระครบทันที ไม่ต้องจ่ายเพิ่ม"
  - 🔒 **จ่ายมัดจำ** → `QR_DEPOSIT`
    - ฿{pax×100} (เช่น ฿200)
    - "จ่ายแค่ {pax}×฿100 ตอนนี้ / คงเหลือ ฿{remaining} จ่ายหน้าร้าน"

#### **Step 3 — ยืนยันการจอง**
- แสดงสรุปข้อมูล:
  - ชื่อ, เบอร์โทร
  - จำนวนคน
  - วันเวลา
  - วิธีชำระเงิน (แสดงยอดที่ต้องจ่าย)
- กดปุ่ม "✓ ยืนยันการจอง"
- **API Call**: `POST /queues`
  ```json
  {
    "customer_name": "ccccc",
    "customer_tel": "0987654321",
    "pax_amount": 2,
    "tier": "SILVER",
    "slot_id": 3,
    "booking_date": "2026-03-21",
    "pay_method": "QR_DEPOSIT"
  }
  ```
- **Response**:
  ```json
  {
    "queue_id": 45,
    "queue_id_str": "#0045",
    "pay_method": "QR_DEPOSIT",
    "pay_token": "abc123...",
    "pay_token_expires": "2026-03-21 19:30:00",
    "pay_link": "http://localhost/#/pay/45?token=abc123",
    "deposit_amount": 200,
    "remaining_amount": 503.85
  }
  ```
- **Modal แสดง**:
  - Queue ID: #0045
  - ปุ่ม "📱 เข้าผ่าน QR PromptPay" → navigate to pay_link
  - ปุ่ม "🕐 ติดตามคิวของฉัน" → navigate to `/queue-status/:id`
  - ปุ่ม "จองใหม่" → reset form

---

### 2. **Payment Flow**

#### **หน้า Pay** (`/pay/:id?token=xxx`)

**UI Components:**
- **Header**: BBQ GRILL logo + "PROMPTPAY" badge
- **Step Pills**: นั่งโต๊ะ (✓) → สแกนจ่าย (active) → ใบเสร็จ
- **Customer Info Card**:
  - ชื่อ, เบอร์โทร, จำนวนคน
  - Queue ID badge (gold)
- **QR Code Section**:
  - SVG countdown ring (gold → amber → red)
  - QR code inside ring (gold frame)
  - Timer label (MM:SS)
  - PromptPay logo
- **Amount Section**:
  - หัวข้อ: "ยอดที่ต้องชำระ"
  - ยอดเงิน (large): ฿200 หรือ ฿703.85
  - **Subtitle** (ใหม่):
    - `CASH_DEPOSIT` / `QR_DEPOSIT`: "ยอดมัดจำ (คงเหลือ ฿504 ชำระหน้าร้าน)"
    - `QR_FULL`: "ยอดรวมทั้งหมด"
  - Price chips: ค่าอาหาร, Service, VAT
- **Actions**:
  - ปุ่ม "✓ ยืนยันว่าโอนเงินแล้ว" (green gradient)
  - ปุ่ม "📱 ขอ QR ใหม่" (ถ้า expired)
  - ปุ่ม "← กลับหน้าแรก"

**Logic:**
1. Fetch data from 2 sources:
   - `GET /payments/:queue_id?token=xxx` → customer info, pax, expires
   - `GET /queues?status=all` → filter by queue_id → get `pay_method`, `deposit_amount`, `remaining_amount`
2. Calculate amount to show:
   ```typescript
   if (pay_method === 'QR_DEPOSIT' || pay_method === 'CASH_DEPOSIT') {
     amountToShow = deposit_amount  // ฿200
     subtitle = `ยอดมัดจำ (คงเหลือ ฿${remaining} ชำระหน้าร้าน)`
   } else {
     amountToShow = grand  // ฿703.85
     subtitle = 'ยอดรวมทั้งหมด'
   }
   ```
3. Generate QR code with correct amount (PromptPay format)
4. Start countdown timer (30 min)
5. When user clicks "ยืนยันว่าโอนเงินแล้ว":
   - **API Call**: `POST /payments/confirm`
     ```json
     {
       "queue_id": 45,
       "token": "abc123..."
     }
     ```
   - **Backend Logic**:
     ```php
     // Read pay_method from queues table
     $pay_method = $queue['pay_method']; // QR_DEPOSIT
     
     // Determine deposit vs full
     $is_deposit = in_array($pay_method, ['CASH_DEPOSIT','QR_DEPOSIT']) ? 1 : 0;
     
     // Record payment
     if ($is_deposit) {
       $amount = $pax * 100;  // ฿200
     } else {
       $amount = $grand;  // ฿703.85
     }
     
     INSERT INTO payments (queue_id, total_amount, is_deposit, ...)
     ```
   - Navigate → `/queue-status/:id`

---

### 3. **Queue Status Page** (`/queue-status/:id`)

**Public page** (ลูกค้าดูได้โดยไม่ต้อง login)

**UI Components:**
- **Header**: BBQ GRILL logo + Queue ID badge
- **Status Badge**: สีตามสถานะ
  - WAITING: amber
  - CONFIRMED: jade
  - SEATED: blue
  - FINISHED: emerald
  - CANCELLED: crimson
- **Push Notification** (auto-request):
  - เมื่อสถานะเป็น WAITING หรือ CONFIRMED → ขอ permission แจ้งเตือน
  - ลูกค้าจะได้รับ notification เมื่อ Staff confirm และ seat
- **Paid Banner** (ถ้า `is_paid=true`):
  - สีเขียว: "✅ ชำระเงินแล้ว"
  - "📸 บันทึกหน้าจอนี้พร้อมสลิปการโอนเงิน แล้วแสดงต่อพนักงานเมื่อมาถึงร้าน"
- **Info Grid**:
  1. วันที่จอง
  2. เวลา
  3. จำนวนคน
  4. Tier (SILVER/GOLD/PLATINUM)
  5. ราคาต่อคน (฿299/399/599)
  6. ราคารวม (คำนวณตาม tier)
  7. โต๊ะ (ถ้ามี)
- **Auto-refresh**: ทุก 10 วินาที (TanStack Query refetchInterval)
- **Actions**:
  - ปุ่ม "📷 บันทึกใบยืนยัน" (ถ้าชำระแล้ว)
    - ใช้ html2canvas capture `.glass-card`
    - Download PNG: `bbq-{queue_id_str}.png`
  - ปุ่ม "❌ ยกเลิกการจอง" (custom modal, เฉพาะ WAITING)
  - ปุ่ม "🔥 จองใหม่"

**Cancel Modal:**
- หัวข้อ: "ยกเลิกการจอง?"
- ข้อความ: "คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคิว {queue_id}?"
- ปุ่ม "ยกเลิกคิว" (red) + "ไม่ยกเลิก" (gray)
- **API Call**: `PATCH /queues/:id` with `action: 'cancel'`

---

### 4. **Staff Dashboard** (`/staff`)

**Protected route** (ต้อง login)

**Features:**
- **Filter tabs**: WAITING / CONFIRMED / SEATED / ALL
- **Date picker**: เลือกวันที่ดูคิว (default: วันนี้)
- **Queue cards** (real-time):
  - Queue ID + heat indicator (🔥 สีแดงถ้ารอนาน)
  - Customer info (ชื่อ, เบอร์, pax)
  - Booking time + slot
  - Status badge
  - Payment status:
    - ✅ Paid (green badge)
    - ⏳ Unpaid (amber badge)
    - แสดง pay_method label
  - Table assignment (ถ้ามี)
  - **Action buttons** (ตามสถานะ):
    - WAITING: "✅ ยืนยัน" → CONFIRMED
    - CONFIRMED: "🪑 จัดโต๊ะ" (เลือกโต๊ะว่าง) → SEATED
    - SEATED:
      - ถ้า paid: "✓ เสร็จสิ้น (QR)" → FINISHED
      - ถ้ายังไม่ paid: "💵 เสร็จสิ้น (เงินสด)" / "💳 เสร็จสิ้น (บัตร)" → FINISHED + create payment
    - ทุกสถานะ: "❌ ยกเลิก" → CANCELLED
  - **QR Management**:
    - แสดง "📱 QR Link" (copy to clipboard)
    - ปุ่ม "🔄 สร้าง QR ใหม่" (ถ้า expired)

**Seat Modal:**
- แสดงโต๊ะว่าง (AVAILABLE)
- แสดง capacity ของแต่ละโต๊ะ
- เลือกโต๊ะ → `PATCH /queues/:id` with `action: 'seat'`, `table_id: X`

**Finish Cash/Card Modal:**
- แสดงยอดรวม
- เลือก CASH หรือ CARD
- → `PATCH /queues/:id` with `action: 'finish_cash'` or `'finish_card'`
- Backend สร้าง payment record + set queue to FINISHED + release table

---

### 5. **Admin Dashboard** (`/admin`)

**Protected route** (role: ADMIN only)

**Today Report Section:**
- 📊 **จำนวนคิวทั้งหมด**: X คิว
- 💰 **รายได้วันนี้**: ฿X,XXX.XX
- 👥 **จำนวนลูกค้า**: X คน
- ❌ **อัตราการยกเลิก**: X%

**Employee Management:**
- Table: username, ชื่อ, role, actions
- ปุ่ม "➕ เพิ่มพนักงาน"
  - Modal: username, password, ชื่อ, role (STAFF/ADMIN)
  - `POST /employees`
- ปุ่ม "🗑️ ลบ" → `DELETE /employees/:id`

**Table Management:**
- Table: เลขโต๊ะ, ที่นั่ง, สถานะ
- Badge สี: AVAILABLE (green) / OCCUPIED (amber)

**Time Slots:**
- Table: เวลา, capacity, สถานะ (active/inactive)

---

## 🗄️ Database Schema

### `queues` (คิว)
```sql
CREATE TABLE queues (
  queue_id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  pax_amount INT NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'SILVER',
  booking_time DATETIME NOT NULL,
  queue_status ENUM('WAITING','CONFIRMED','SEATED','FINISHED','CANCELLED') DEFAULT 'WAITING',
  pay_method VARCHAR(20) NOT NULL DEFAULT 'CASH_DEPOSIT',
  pay_token VARCHAR(64),
  pay_token_expires DATETIME,
  table_id INT,
  slot_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  seated_at DATETIME,
  finished_at DATETIME,
  cancelled_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (table_id) REFERENCES tables(table_id),
  FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id)
);
```

### `payments` (การชำระเงิน)
```sql
CREATE TABLE payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  queue_id INT NOT NULL, /* ไม่เป็น UNIQUE แล้ว เพื่อรองรับ multiple payments (เช่น มัดจำ + จ่ายส่วนที่เหลือ) */
  subtotal_amount DECIMAL(10,2) NOT NULL,
  service_amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('PROMPTPAY','CASH','CARD') NOT NULL,
  is_deposit TINYINT(1) NOT NULL DEFAULT 0,
  payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES queues(queue_id)
);
```

### `customers` (ข้อมูลลูกค้า)
```sql
CREATE TABLE customers (
  customer_id INT PRIMARY KEY AUTO_INCREMENT,
  customer_name VARCHAR(100) NOT NULL,
  customer_tel VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `tables` (โต๊ะ)
```sql
CREATE TABLE tables (
  table_id INT PRIMARY KEY AUTO_INCREMENT,
  table_number VARCHAR(10) NOT NULL UNIQUE,
  capacity INT NOT NULL,
  status ENUM('AVAILABLE','OCCUPIED') DEFAULT 'AVAILABLE'
);
```

### `time_slots` (รอบเวลาการจอง)
```sql
CREATE TABLE time_slots (
  slot_id INT PRIMARY KEY AUTO_INCREMENT,
  slot_time TIME NOT NULL,
  max_capacity INT NOT NULL DEFAULT 50,
  is_active TINYINT(1) DEFAULT 1
);
```

### `employees` (พนักงาน)
```sql
CREATE TABLE employees (
  emp_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  emp_name VARCHAR(100) NOT NULL,
  role ENUM('STAFF','ADMIN') DEFAULT 'STAFF',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `push_subscriptions` (Web Push)
```sql
CREATE TABLE push_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  queue_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_queue_id (queue_id)
);
```

---

## 🔌 API Endpoints

### **Public Endpoints** (ไม่ต้อง auth)

#### `POST /queues` — สร้างคิว
**Request:**
```json
{
  "customer_name": "ccccc",
  "customer_tel": "0987654321",
  "pax_amount": 2,
  "tier": "SILVER",
  "slot_id": 3,
  "booking_date": "2026-03-21",
  "pay_method": "QR_DEPOSIT"
}
```
**Response:**
```json
{
  "queue_id": 45,
  "queue_id_str": "#0045",
  "pay_method": "QR_DEPOSIT",
  "pay_token": "abc123...",
  "pay_token_expires": "2026-03-21 19:30:00",
  "pay_link": "http://localhost/#/pay/45?token=abc123",
  "deposit_amount": 200,
  "remaining_amount": 503.85
}
```

#### `POST /payments/confirm` — ยืนยันชำระเงิน QR
**Request:**
```json
{
  "queue_id": 45,
  "token": "abc123..."
}
```
**Backend Logic:**
- Validate token + expiry
- Read `pay_method` from `queues` table
- Calculate amount:
  - `CASH_DEPOSIT` / `QR_DEPOSIT` → `is_deposit = 1`, total_amount = pax × 100
  - `QR_FULL` → `is_deposit = 0`, total_amount = grand total
- Insert payment record into `payments` table
- Clear `pay_token` and `pay_token_expires`
**Response:**
```json
{
  "ok": true,
  "is_deposit": true,
  "amount_paid": 200
}
```

#### `GET /payments/:queue_id?token=xxx` — ดูข้อมูล payment
**Response:**
```json
{
  "queue_id": 45,
  "queue_id_str": "#0045",
  "customer_name": "ccccc",
  "customer_tel": "0987654321",
  "pax_amount": 2,
  "booking_time": "2026-03-21 19:00:00",
  "pay_token_expires": "2026-03-21 19:30:00",
  "subtotal_amount": 598,
  "service_amount": 59.80,
  "vat_amount": 46.05,
  "total_amount": 703.85
}
```

#### `GET /payments/all/:queue_id` — ดูประวัติการชำระเงินทั้งหมดของคิว
ใช้สำหรับหน้า Receipt เพื่อเช็คว่ามีรายการมัดจำหรือไม่
**Response:**
```json
{
  "payments": [
    {
      "payment_id": 1,
      "queue_id": 45,
      "total_amount": "200.00",
      "payment_method": "PROMPTPAY",
      "is_deposit": 1,
      "payment_time": "2026-03-21 19:15:00"
    }
  ]
}
```

---

### **Protected Endpoints** (ต้อง auth)

#### `GET /queues?status=active&date=2026-03-21` — ดูคิวทั้งหมด
**Response:**
```json
{
  "queues": [
    {
      "queue_id": 45,
      "queue_id_str": "#0045",
      "customer_name": "ccccc",
      "customer_tel": "0987654321",
      "pax_amount": 2,
      "tier": "SILVER",
      "price_per_person": 299,
      "booking_time": "2026-03-21 19:00:00",
      "queue_status": "WAITING",
      "pay_method": "QR_DEPOSIT",
      "pay_token": "abc123...",
      "pay_token_expires": "2026-03-21 19:30:00",
      "pay_link": "http://localhost/#/pay/45?token=abc123",
      "table_id": null,
      "table_number": null,
      "is_paid": false,
      "is_qr": true,
      "is_deposit": false,
      "deposit_amount": 200,
      "remaining_amount": 503.85,
      "payment_id": null,
      "total_amount": null,
      "payment_method": null,
      "created_at": "2026-03-21 18:45:00"
    }
  ]
}
```

#### `PATCH /queues/:id` — อัปเดตสถานะคิว
**Actions:**
- `confirm` — WAITING → CONFIRMED
- `seat` — CONFIRMED → SEATED (ต้องส่ง `table_id`)
- `cancel` — any → CANCELLED (release table)
- `finish_qr` — SEATED → FINISHED (ต้องมี payment แล้ว)
- `finish_cash` — SEATED → FINISHED (สร้าง payment CASH)
- `finish_card` — SEATED → FINISHED (สร้าง payment CARD)
- `regen_qr` — สร้าง QR token ใหม่

**Request (seat):**
```json
{
  "action": "seat",
  "table_id": 5
}
```

**Request (finish_cash):**
```json
{
  "action": "finish_cash"
}
```

#### `GET /tables?available=1` — ดูโต๊ะว่าง
**Response:**
```json
{
  "tables": [
    {
      "table_id": 5,
      "table_number": "T05",
      "capacity": 4,
      "status": "AVAILABLE"
    }
  ]
}
```

#### `GET /today-report` — รายงานวันนี้
**Response:**
```json
{
  "total_queues": 25,
  "total_revenue": 17596.25,
  "total_pax": 59,
  "cancel_rate": 8.0
}
```

#### `GET /report/revenue` — ข้อมูลกราฟรายได้ 7 วันย้อนหลัง
**Response:**
```json
{
  "labels": ["15 มี.ค.", "16 มี.ค.", ...],
  "data": [12000, 15500, ...]
}
```

#### `GET /report/export?start=2026-03-01&end=2026-03-31` — ส่งออกข้อมูล CSV
- ดาวน์โหลดเป็นไฟล์ `.csv` (application/csv)

#### `GET /customers` — ข้อมูลลูกค้าทั้งหมด (CRM)
**Response:**
```json
{
  "customers": [
    {
      "customer_id": 1,
      "customer_name": "ccccc",
      "customer_tel": "0987654321",
      "visit_count": 5,
      "total_spent": 8500.50,
      "last_visit": "2026-03-21 19:00:00"
    }
  ]
}
```

#### `GET /employees` — ดูพนักงาน
**Response:**
```json
{
  "employees": [
    {
      "emp_id": 1,
      "username": "admin",
      "emp_name": "Admin User",
      "role": "ADMIN"
    }
  ]
}
```

#### `POST /employees` — เพิ่มพนักงาน
**Request:**
```json
{
  "username": "staff01",
  "password": "pass123",
  "emp_name": "Staff One",
  "role": "STAFF"
}
```

#### `DELETE /employees/:id` — ลบพนักงาน

#### `POST /push-subscribe` — บันทึก Push Subscription
**Request:**
```json
{
  "queue_id": 45,
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "BHXRLotk...",
  "auth": "LhRMGaFP..."
}
```
**Response:**
```json
{
  "ok": true
}
```

---

### **Auth Endpoints**

#### `POST /auth/login`
**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response:**
```json
{
  "user": {
    "emp_id": 1,
    "emp_name": "Admin User",
    "role": "ADMIN"
  }
}
```

#### `POST /auth/logout`
**Response:**
```json
{
  "ok": true
}
```

#### `GET /auth/me`
**Response:**
```json
{
  "user": {
    "emp_id": 1,
    "emp_name": "Admin User",
    "role": "ADMIN"
  }
}
```

---

## 💰 Pricing Logic

### **Tier Pricing**
```typescript
// Tier Prices
SILVER   = 299 บาท/คน
GOLD     = 399 บาท/คน
PLATINUM = 599 บาท/คน

// Constants
SERVICE_RATE = 10%
VAT_RATE = 7%
DEPOSIT_PER_PERSON = 100 บาท

// Calculation
pricePerPerson = tier_price(tier)  // 299, 399, or 599
subtotal = pax × pricePerPerson
service = subtotal × 0.10
vat = (subtotal + service) × 0.07
grand = subtotal + service + vat

// Deposit
deposit = pax × 100
remaining = grand - deposit
```

**ตัวอย่าง (2 คน, SILVER tier):**
- ค่าอาหาร: ฿598.00 (2×299)
- Service 10%: ฿59.80
- VAT 7%: ฿46.05
- **รวมทั้งหมด: ฿703.85**
- **มัดจำ: ฿200.00** (2×100)
- **คงเหลือ: ฿503.85**

**ตัวอย่าง (2 คน, GOLD tier):**
- ค่าอาหาร: ฿798.00 (2×399)
- Service 10%: ฿79.80
- VAT 7%: ฿61.45
- **รวมทั้งหมด: ฿939.25**
- **มัดจำ: ฿200.00** (2×100)
- **คงเหลือ: ฿739.25**

---

## 🎨 UI/UX Design System

### **Theme: Obsidian Ember**
```css
--color-coal:       #050608  /* background */
--color-ash:        #E8E6E3  /* primary text */
--color-smoke:      #9CA3AF  /* secondary text */
--color-haze:       #6B7280  /* tertiary text */
--color-gold:       #C9A84C  /* primary accent */
--color-gold-light: #D4B962
--color-gold-dark:  #B89A3F
--color-jade:       #10B981  /* success */
--color-crimson:    #EF4444  /* error */
--color-amber:      #F59E0B  /* warning */
--color-lava:       #F97316  /* hot */
```

### **Typography**
- Display: "Kanit" (Thai-optimized)
- Sans: "Kanit" (body text)
- Mono: system monospace (numbers, codes)

### **Animations**
- `thermal-in`: fade + scale entrance
- `ripple`: button press effect
- SVG countdown ring: smooth stroke-dashoffset transition

### **Components**
- Glass cards: `rgba(255,255,255,.035)` + blur
- Gold gradient buttons: `linear-gradient(135deg, gold-light, gold)`
- Jade gradient (confirm): `linear-gradient(135deg, #34D399, jade)`
- Heat indicators: cold → warm → hot → critical

---

## 🔐 Security Features

1. **Authentication**
   - Session-based (PHP `$_SESSION`)
   - Password hashing: `password_hash()` with bcrypt
   - Role-based access control (STAFF / ADMIN)

2. **Authorization**
   - `require_auth()` middleware for protected endpoints
   - Role check for admin-only endpoints

3. **Input Validation**
   - Zod schema validation (frontend)
   - PHP validation + sanitization (backend)
   - SQL prepared statements (prevent injection)

4. **Token Security**
   - QR payment token: 32-byte random hex
   - Token expiry: 30 minutes
   - `hash_equals()` for timing-safe comparison

5. **CORS**
   - Configured for localhost development
   - Credentials allowed for session cookies

---

## 🚀 Deployment & DevOps

### **Docker Services**
```yaml
services:
  db:        # MariaDB 11.5 (port 3306)
  api:       # PHP 8.3-FPM (port 9000)
  nginx:     # Nginx 1.27 (port 80)
  angular:   # Node 22 dev server (port 4200)
  phpmyadmin: # phpMyAdmin (port 8080)
```

### **Environment Variables**
```env
DB_HOST=db
DB_USER=bbq_user
DB_PASSWORD=bbq_pass
DB_NAME=bbq_queue_db
TZ=Asia/Bangkok
```

### **Auto-Migration**
```php
// Runs on first API request (safe, idempotent)
$conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS pay_method VARCHAR(20) ...");
$conn->query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_deposit TINYINT(1) ...");
$conn->query("ALTER TABLE queues ADD COLUMN IF NOT EXISTS tier VARCHAR(20) ...");
$conn->query("CREATE TABLE IF NOT EXISTS push_subscriptions (...)");
```

### **Startup Commands**
```bash
# Start all services
docker compose up -d --build

# Watch Angular compilation
docker compose logs -f angular

# Access services
http://localhost          # Frontend
http://localhost:8080     # phpMyAdmin
```

---

## 📱 Complete Customer Journey Example

### **Scenario**: ลูกค้าจอง 2 คน, เลือก QR มัดจำ

1. **เข้าหน้าแรก** `http://localhost`
2. **Step 1 — เลือกวันเวลา**
   - วันที่: 21 มี.ค. 2026
   - เวลา: 19:00 (slot_id=3)
   - จำนวนคน: 2 คน
   - วิธีชำระ: 📱 QR PromptPay
   - กด "ถัดไป →"
3. **Step 2 — กรอกข้อมูล**
   - ชื่อ: "ccccc"
   - เบอร์: "0987654321"
   - **QR Sub-option แสดง**:
     - เลือก 🔒 **จ่ายมัดจำ ฿200**
   - กด "ถัดไป →"
4. **Step 3 — ยืนยัน**
   - ตรวจสอบข้อมูล
   - วิธีชำระ: "🔒 QR มัดจำ ฿200 (คงเหลือ ฿504 หน้าร้าน)"
   - กด "✓ ยืนยันการจอง"
5. **Modal แสดงผลสำเร็จ**
   - Queue ID: **#0045**
   - กด "📱 เข้าผ่าน QR PromptPay"
6. **หน้า Pay** `/pay/45?token=abc123`
   - แสดง QR code
   - ยอดที่ต้องชำระ: **฿200.00**
   - Subtitle: "ยอดมัดจำ (คงเหลือ ฿504 ชำระหน้าร้าน)"
   - Countdown: 29:54
   - สแกน QR ในแอป PromptPay → โอน ฿200
   - กด "✓ ยืนยันว่าโอนเงินแล้ว"
7. **Navigate → Queue Status** `/queue-status/45`
   - สถานะ: WAITING (amber)
   - Banner: "✅ ชำระเงินแล้ว"
   - ข้อมูล: วันที่, เวลา, 2 คน, ฿704
   - กด "📷 บันทึกใบยืนยัน" → download `bbq-#0045.png`
8. **มาถึงร้าน**
   - แสดงรูปใบยืนยัน + สลิปโอนเงินต่อพนักงาน
9. **พนักงาน (Staff Dashboard)**
   - เห็นคิว #0045 (WAITING, Paid ✅)
   - กด "✅ ยืนยัน" → CONFIRMED
   - กด "🪑 จัดโต๊ะ" → เลือกโต๊ะ T05 → SEATED
10. **ลูกค้ารับประทานอาหาร**
11. **เสร็จสิ้น**
    - พนักงานกด "✓ เสร็จสิ้น (QR)"
    - ลูกค้าจ่ายเงินคงเหลือ ฿504 (เงินสด/บัตร) หน้าร้าน
    - Queue → FINISHED
    - โต๊ะ T05 → AVAILABLE

---

## 🔄 State Transitions

### **Queue Status Flow**
```
WAITING
  ↓ (staff: confirm)
CONFIRMED
  ↓ (staff: seat + select table)
SEATED
  ↓ (staff: finish_qr / finish_cash / finish_card)
FINISHED

Any status → CANCELLED (staff: cancel)
```

### **Payment Flow**
```
No payment
  ↓ (customer: QR confirm OR staff: finish_cash/card)
Payment created
  - is_deposit=1 (CASH_DEPOSIT / QR_DEPOSIT)
  - is_deposit=0 (QR_FULL)
```

### **Table Status Flow**
```
AVAILABLE
  ↓ (queue seated)
OCCUPIED
  ↓ (queue finished/cancelled)
AVAILABLE
```

---

## 📊 Business Rules

1. **Capacity Management**
   - แต่ละ time slot มี `max_capacity` (default: 50 คน)
   - ตรวจสอบ `SUM(pax_amount)` ของคิวที่ไม่ใช่ CANCELLED
   - ถ้าเต็ม → reject booking

2. **Table Assignment**
   - โต๊ะต้อง AVAILABLE
   - Lock table ด้วย `FOR UPDATE` (prevent race condition)
   - Set table → OCCUPIED เมื่อ seat queue
   - Release table เมื่อ finish/cancel queue

3. **Payment Rules**
   - การจ่ายเงินรองรับ Multiple Payments ต่อ 1 คิว (ตาราง payments ห้ามมี UNIQUE ที่ queue_id)
   - `CASH_DEPOSIT` / `QR_DEPOSIT`: สแกน QR มัดจำ → ได้ record ที่ 1 (`is_deposit=1`) → วันจริงกินเสร็จ จ่ายเงินคงเหลือหน้าร้าน → ได้ record ที่ 2 (`is_deposit=0`)
   - `QR_FULL`: สแกน QR ยอดเต็มทีเดียว → ได้ record เดียว (`is_deposit=0`)
   - หน้าใบเสร็จ (`/receipt`) จะคำนวณยอดรวมจาก `SUM(total_amount)` ของทุก payments สำหรับคิวนั้นๆ
   - QR token สำหรับการจ่ายเงินมีอายุ 30 นาที

4. **Customer Uniqueness**
   - `customer_tel` เป็น UNIQUE
   - Upsert: ถ้าเบอร์ซ้ำ → update ชื่อ

5. **Timezone**
   - ทุกอย่างใช้ `Asia/Bangkok` (GMT+7)
   - Docker services + PHP + MariaDB ตั้งค่า TZ

---

## 🧪 Testing Scenarios

### **Happy Path**
1. ✅ จองสำเร็จ (QR_FULL) → ชำระ → ยืนยัน → จัดโต๊ะ → เสร็จสิ้น
2. ✅ จองสำเร็จ (QR_DEPOSIT) → ชำระมัดจำ → ยืนยัน → จัดโต๊ะ → เสร็จสิ้น (รับเงินคงเหลือ)
3. ✅ จองสำเร็จ (CASH_DEPOSIT) → สแกน QR มัดจำ → ยืนยัน → จัดโต๊ะ → เสร็จสิ้น (รับเงินทั้งหมด)

### **Edge Cases**
1. ❌ จองเมื่อ slot เต็ม → error "รอบนี้เต็มแล้ว"
2. ❌ ชำระด้วย token หมดอายุ → error "QR หมดอายุ"
3. ❌ ชำระซ้ำ → return `already_paid: true`
4. ❌ จัดโต๊ะที่ถูกจองแล้ว → error "โต๊ะถูกจองก่อนหน้า"
5. ✅ ยกเลิกคิว SEATED → release table
6. ✅ สร้าง QR ใหม่ → token ใหม่ + expires ใหม่

---

## 🎓 Key Learnings & Best Practices

1. **Signal-based State Management**
   - ใช้ Angular signals แทน RxJS subjects
   - Computed signals สำหรับ derived state
   - Effect สำหรับ side effects

2. **TanStack Query**
   - Auto-refetch, caching, loading states
   - Optimistic updates
   - Error handling

3. **Single-file PHP API**
   - Pattern matching router
   - Transaction management
   - Prepared statements
   - Manual Web Push implementation (VAPID JWT + aes128gcm encryption)

4. **Database Design**
   - Foreign keys + constraints
   - Enum types สำหรับ status
   - Timestamp tracking (created_at, confirmed_at, etc.)

5. **UX Patterns**
   - Multi-step forms with validation
   - Real-time countdown timers
   - Optimistic UI updates
   - Custom modals (no browser confirm)
   - Screenshot capture (html2canvas)

---

นี่คือ **complete system flow documentation** สำหรับ BBQ GRILL Queue Management System 🔥
