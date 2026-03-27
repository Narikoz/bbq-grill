# 🎯 MCP Usage Examples for BBQ Grill System

ตัวอย่างการใช้งาน MCP Servers กับระบบ BBQ Grill POS/Queue Management

---

## 📊 Supabase MCP - Database Queries

### ตัวอย่างที่ 1: ดูคิวที่รออยู่ทั้งหมด
```
คำสั่งให้ Cascade:
"ใช้ Supabase MCP query ตาราง queues ที่มี queue_status = 'WAITING' วันนี้"

Expected Output:
- รายการคิวทั้งหมดที่รออยู่
- แสดง queue_id, customer_name, pax_amount, booking_time
- เรียงตามเวลาที่สร้าง
```

### ตัวอย่างที่ 2: วิเคราะห์ Revenue วันนี้
```
คำสั่งให้ Cascade:
"Query payments วันนี้และคำนวณ total revenue, average bill, และจำนวน transactions"

Expected Output:
- Total Revenue: ฿X,XXX
- Average Bill: ฿XXX
- Total Transactions: XX
- Breakdown by payment method (CASH, CARD, PROMPTPAY)
```

### ตัวอย่างที่ 3: หา Queue ที่รอนานที่สุด
```
คำสั่งให้ Cascade:
"หา queues ที่ queue_status = 'CONFIRMED' และคำนวณเวลารอจาก confirmed_at ถึงตอนนี้ เรียงจากนานที่สุด"

Expected Output:
- Queue #0123 - รออยู่ 45 นาที
- Queue #0124 - รออยู่ 32 นาที
- Queue #0125 - รออยู่ 18 นาที
```

### ตัวอย่างที่ 4: Customer Analytics
```
คำสั่งให้ Cascade:
"หา customers ที่จองบ่อยที่สุด (count queues per customer) top 10"

Expected Output:
- นาย A - 15 ครั้ง
- นาง B - 12 ครั้ง
- คุณ C - 10 ครั้ง
```

### ตัวอย่างที่ 5: Table Utilization
```
คำสั่งให้ Cascade:
"วิเคราะห์ table utilization - แต่ละโต๊ะถูกใช้กี่ครั้งวันนี้ และ average dine time"

Expected Output:
- Table 1 (4 seats): 8 ครั้ง, avg 45 นาที
- Table 2 (2 seats): 12 ครั้ง, avg 35 นาที
```

---

## 🧪 Postman MCP - API Testing

### ตัวอย่างที่ 1: Test Login Flow
```
คำสั่งให้ Cascade:
"ใช้ Postman MCP test POST /api/auth/login ด้วย:
{
  'username': 'admin',
  'password': 'admin1234'
}
แล้วเช็คว่า response มี user object และ role = 'ADMIN'"

Expected Output:
✅ Status: 200 OK
✅ Response contains user object
✅ user.role = 'ADMIN'
✅ user.emp_name exists
```

### ตัวอย่างที่ 2: Test Queue Creation
```
คำสั่งให้ Cascade:
"Test POST /api/queues สร้างคิวใหม่:
{
  'customer_name': 'Test Customer',
  'customer_tel': '0812345678',
  'pax_amount': 4,
  'pay_method': 'CASH'
}
แล้วเช็คว่าได้ queue_id กลับมา"

Expected Output:
✅ Status: 201 Created
✅ Response contains queue_id
✅ queue_status = 'WAITING'
✅ customer_name = 'Test Customer'
```

### ตัวอย่างที่ 3: Test Queue Status Transition
```
คำสั่งให้ Cascade:
"Test complete queue flow:
1. Create queue (WAITING)
2. Confirm queue (CONFIRMED)
3. Seat queue (SEATED)
4. Finish queue (FINISHED)

ตรวจสอบแต่ละ step ว่า status เปลี่ยนถูกต้อง"

Expected Output:
✅ Step 1: WAITING → queue created
✅ Step 2: CONFIRMED → confirmed_at timestamp set
✅ Step 3: SEATED → table_id assigned, seated_at set
✅ Step 4: FINISHED → payment created, finished_at set
```

### ตัวอย่างที่ 4: Test Error Handling
```
คำสั่งให้ Cascade:
"Test error cases:
1. Login ด้วย wrong password
2. Create queue ด้วย invalid phone
3. Confirm queue ที่ไม่มี
4. Seat queue โดยไม่ confirm ก่อน"

Expected Output:
✅ Wrong password → 401 Unauthorized
✅ Invalid phone → 400 Bad Request
✅ Queue not found → 404 Not Found
✅ Invalid state → 400 Bad Request
```

### ตัวอย่างที่ 5: Load Testing
```
คำสั่งให้ Cascade:
"ใช้ Postman MCP run collection 'Queue Management' 50 iterations พร้อมกัน
และรายงาน:
- Average response time
- Success rate
- Failed requests (if any)"

Expected Output:
📊 Load Test Results:
- Total Requests: 50
- Success: 48 (96%)
- Failed: 2 (4%)
- Avg Response Time: 245ms
- Max Response Time: 1.2s
```

---

## 🔒 Snyk MCP - Security Scanning

### ตัวอย่างที่ 1: Scan Angular Dependencies
```
คำสั่งให้ Cascade:
"ใช้ Snyk MCP scan bbq_angular/package.json และรายงาน vulnerabilities"

Expected Output:
🔍 Scanning bbq_angular/package.json...

Found 3 vulnerabilities:
❌ HIGH: lodash@4.17.20 (Prototype Pollution)
   Fix: Upgrade to lodash@4.17.21
   
⚠️ MEDIUM: axios@0.21.1 (SSRF)
   Fix: Upgrade to axios@0.21.4
   
ℹ️ LOW: minimist@1.2.5 (Prototype Pollution)
   Fix: Upgrade to minimist@1.2.6
```

### ตัวอย่างที่ 2: Scan Docker Images
```
คำสั่งให้ Cascade:
"Scan Docker images ที่ใช้:
- node:22-alpine
- mariadb:11.3
- nginx:1.27-alpine
- php:8.2-apache"

Expected Output:
🐳 Docker Image Security Scan:

node:22-alpine: ✅ No vulnerabilities
mariadb:11.3: ⚠️ 2 LOW severity issues
nginx:1.27-alpine: ✅ No vulnerabilities
php:8.2-apache: ❌ 1 MEDIUM severity issue
```

### ตัวอย่างที่ 3: Code Security Audit
```
คำสั่งให้ Cascade:
"Audit bbq_api/index.php สำหรับ security issues:
- SQL injection
- XSS vulnerabilities
- Authentication bypass
- Session security"

Expected Output:
🔐 Security Audit Results:

✅ SQL Injection: Protected (using prepared statements)
✅ XSS: Protected (JSON output only)
✅ Authentication: Secure (session-based)
⚠️ CSRF: Not protected (consider adding CSRF tokens)
ℹ️ Rate Limiting: Not implemented
```

### ตัวอย่างที่ 4: License Compliance
```
คำสั่งให้ Cascade:
"Check license compliance สำหรับ dependencies ทั้งหมด"

Expected Output:
📜 License Compliance:

✅ MIT: 45 packages
✅ Apache-2.0: 12 packages
✅ BSD-3-Clause: 8 packages
⚠️ GPL-3.0: 1 package (check compatibility)
```

### ตัวอย่างที่ 5: Generate Security Report
```
คำสั่งให้ Cascade:
"Generate comprehensive security report สำหรับทั้งโปรเจค"

Expected Output:
📊 BBQ Grill Security Report
Date: 2026-03-16

Summary:
- Total Dependencies: 918
- Vulnerabilities Found: 5
  - Critical: 0
  - High: 1
  - Medium: 2
  - Low: 2
- Docker Images: 4 scanned
- Code Issues: 2 warnings

Recommendations:
1. Upgrade lodash to 4.17.21
2. Implement CSRF protection
3. Add rate limiting
4. Update mariadb to 11.4
```

---

## 📢 Slack MCP - Notifications

### ตัวอย่างที่ 1: Payment Failed Alert
```
คำสั่งให้ Cascade:
"เมื่อ payment failed ให้ส่ง Slack message ไป #alerts channel:
'⚠️ Payment Failed
Queue: #0123
Customer: John Doe
Amount: ฿1,299
Time: 14:30
Reason: QR Code Expired'"

Expected Output:
✅ Message sent to #alerts
📱 Notification delivered
```

### ตัวอย่างที่ 2: Daily Revenue Report
```
คำสั่งให้ Cascade:
"ทุกเที่ยงคืน ส่ง daily revenue report ไป #reports:
'📊 Daily Revenue Report - 2026-03-16
Total Revenue: ฿45,890
Transactions: 48
Avg Bill: ฿956
Top Payment Method: PromptPay (65%)
Peak Hour: 18:00-19:00'"

Expected Output:
✅ Scheduled message created
⏰ Will send at 00:00 daily
```

### ตัวอย่างที่ 3: Queue Overflow Alert
```
คำสั่งให้ Cascade:
"เมื่อ active queues > 20 ส่ง alert:
'🔥 Queue Overflow Alert!
Active Queues: 23
WAITING: 15
CONFIRMED: 8
Longest Wait: 45 minutes
Action Required: Consider adding more tables'"

Expected Output:
✅ Alert sent
👥 @staff mentioned
```

---

## 💳 Payment MCP - Integration Examples

### ตัวอย่างที่ 1: Process Credit Card
```
คำสั่งให้ Cascade:
"Process credit card payment:
Queue ID: 123
Amount: ฿1,299
Card: **** **** **** 4242
Expiry: 12/26"

Expected Output:
✅ Payment Authorized
Transaction ID: txn_abc123
Status: Success
Receipt: Generated
```

### ตัวอย่างที่ 2: Refund Processing
```
คำสั่งให้ Cascade:
"Process refund for queue_id 123:
Original Amount: ฿1,299
Refund Amount: ฿1,299
Reason: Customer cancelled"

Expected Output:
✅ Refund Processed
Refund ID: ref_xyz789
Status: Completed
ETA: 3-5 business days
```

---

## 📝 Best Practices

### 1. Database Queries
- ใช้ prepared statements เสมอ
- Limit results ด้วย LIMIT clause
- Index columns ที่ query บ่อย
- Cache results ที่ไม่เปลี่ยนบ่อย

### 2. API Testing
- Test ทั้ง happy path และ error cases
- ใช้ environment variables สำหรับ credentials
- Automate regression tests
- Monitor API performance

### 3. Security Scanning
- Scan ทุกครั้งก่อน deploy
- Fix critical/high vulnerabilities ทันที
- Update dependencies เป็นประจำ
- Review security reports weekly

### 4. Notifications
- ตั้ง alert thresholds ให้เหมาะสม
- ใช้ different channels สำหรับ different severity
- Include actionable information
- Avoid alert fatigue

---

## 🎓 Learning Resources

### Supabase MCP
- SQL Basics: https://www.w3schools.com/sql/
- MariaDB Docs: https://mariadb.com/kb/en/documentation/

### Postman MCP
- API Testing Guide: https://learning.postman.com/docs/writing-scripts/test-scripts/
- REST API Best Practices: https://restfulapi.net/

### Snyk MCP
- Security Best Practices: https://snyk.io/learn/
- OWASP Top 10: https://owasp.org/www-project-top-ten/

### Slack MCP
- Slack API: https://api.slack.com/
- Bot Development: https://api.slack.com/bot-users

---

สร้างโดย: Cascade AI
วันที่: 2026-03-16
Version: 1.0
