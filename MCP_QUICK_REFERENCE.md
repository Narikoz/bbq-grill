# 🚀 MCP Quick Reference Guide

Quick reference สำหรับการใช้งาน MCP Servers กับระบบ BBQ Grill

---

## 📋 Phase 1: Critical MCPs

### Supabase MCP - Database
```bash
# ตัวอย่างคำสั่ง
"Query queues วันนี้ที่ status = 'WAITING'"
"หา top 10 customers ที่จองบ่อยที่สุด"
"คำนวณ revenue วันนี้แยกตาม payment method"
"วิเคราะห์ average wait time แต่ละช่วงเวลา"
```

### Postman MCP - API Testing
```bash
# ตัวอย่างคำสั่ง
"Test POST /api/auth/login"
"Create Postman collection สำหรับ queue APIs"
"Test complete queue flow WAITING→FINISHED"
"Load test /api/queues ด้วย 100 requests"
```

### Snyk MCP - Security
```bash
# ตัวอย่างคำสั่ง
"Scan package.json vulnerabilities"
"Check Docker images security"
"Audit payment processing code"
"Generate security report"
```

---

## 🔑 API Keys Required

| MCP | API Key Location | Free Tier |
|-----|------------------|-----------|
| Supabase | DB Password | ✅ Yes |
| Postman | https://postman.com/settings/api-keys | ✅ Yes (limited) |
| Snyk | https://snyk.io/account | ✅ Yes (open source) |
| Slack | https://api.slack.com/apps | ✅ Yes |
| GitHub | https://github.com/settings/tokens | ✅ Yes |

---

## 📊 Common Use Cases

### 1. Debug Payment Issues
```
"ใช้ Supabase query payments ที่ payment_method = 'PROMPTPAY' 
และ payment_time IS NULL (failed payments)"
```

### 2. Test API Endpoint
```
"ใช้ Postman test GET /api/queues?status=active 
และตรวจสอบว่า response มี queues array"
```

### 3. Security Scan
```
"ใช้ Snyk scan bbq_angular/package.json 
และแสดง vulnerabilities ที่เป็น HIGH/CRITICAL"
```

### 4. Generate Report
```
"Query database และสร้าง revenue report:
- Total revenue วันนี้
- จำนวน transactions
- Average bill
- Top payment method
- Peak hour"
```

### 5. Monitor Queue Status
```
"Query queues ที่รอเกิน 30 นาที 
และส่ง Slack alert ไป #alerts channel"
```

---

## 🎯 BBQ Grill API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout  
- `GET /api/auth/me` - Get current user

### Queues
- `GET /api/queues` - List queues
- `POST /api/queues` - Create queue
- `PATCH /api/queues/{id}` - Update queue status

### Tables
- `GET /api/tables` - List tables
- `GET /api/tables?available=1` - Available tables only

### Payments
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/{queue_id}` - Get payment details

### Employees (Admin)
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PATCH /api/employees/{id}` - Update employee

### Reports (Admin)
- `GET /api/reports/today` - Today's statistics

---

## 🗄️ Database Schema

### Key Tables
```sql
queues
├── queue_id (PK)
├── customer_id (FK)
├── pax_amount
├── booking_time
├── queue_status (WAITING|CONFIRMED|SEATED|FINISHED|CANCELLED)
├── table_id (FK)
├── pay_token
└── timestamps (created_at, confirmed_at, seated_at, finished_at)

customers
├── customer_id (PK)
├── customer_name
└── customer_tel (UNIQUE)

payments
├── payment_id (PK)
├── queue_id (FK)
├── subtotal_amount
├── service_amount (10%)
├── vat_amount (7%)
├── total_amount
├── payment_method (CASH|CARD|PROMPTPAY)
└── payment_time

tables
├── table_id (PK)
├── table_number
├── capacity
└── status (AVAILABLE|OCCUPIED)

employees
├── emp_id (PK)
├── emp_name
├── username (UNIQUE)
├── password_hash
├── role (ADMIN|STAFF)
└── is_active
```

---

## 🔍 Useful SQL Queries

### Active Queues Today
```sql
SELECT q.*, c.customer_name, c.customer_tel, t.table_number
FROM queues q
JOIN customers c ON q.customer_id = c.customer_id
LEFT JOIN tables t ON q.table_id = t.table_id
WHERE DATE(q.created_at) = CURDATE()
  AND q.queue_status IN ('WAITING','CONFIRMED','SEATED')
ORDER BY q.created_at ASC;
```

### Revenue Today
```sql
SELECT 
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_bill,
  COUNT(*) as transactions,
  payment_method
FROM payments
WHERE DATE(payment_time) = CURDATE()
GROUP BY payment_method;
```

### Queue Wait Time Analysis
```sql
SELECT 
  AVG(TIMESTAMPDIFF(MINUTE, confirmed_at, seated_at)) as avg_wait_min,
  AVG(TIMESTAMPDIFF(MINUTE, seated_at, finished_at)) as avg_dine_min
FROM queues
WHERE DATE(created_at) = CURDATE()
  AND confirmed_at IS NOT NULL
  AND seated_at IS NOT NULL;
```

### Top Customers
```sql
SELECT 
  c.customer_name,
  c.customer_tel,
  COUNT(q.queue_id) as visit_count,
  SUM(p.total_amount) as total_spent
FROM customers c
JOIN queues q ON c.customer_id = q.customer_id
LEFT JOIN payments p ON q.queue_id = p.queue_id
GROUP BY c.customer_id
ORDER BY visit_count DESC
LIMIT 10;
```

---

## ⚡ Quick Commands

### Check MCP Status
```
"List all installed MCPs และ status"
```

### Test All APIs
```
"Run Postman collection 'BBQ Grill API Tests' 
และรายงาน pass/fail rate"
```

### Daily Health Check
```
"1. Query database connection
2. Test API endpoints
3. Check for security vulnerabilities
4. Generate summary report"
```

### Emergency Debug
```
"1. Check error logs
2. Query failed payments
3. Find stuck queues (status ไม่เปลี่ยนนาน)
4. Alert via Slack"
```

---

## 🚨 Troubleshooting

### MCP Not Working
1. Check API key valid
2. Restart Windsurf
3. Check logs: `Help → Toggle Developer Tools → Console`

### Database Connection Failed
1. Check Docker containers: `docker compose ps`
2. Check DB credentials in `.env`
3. Restart DB: `docker compose restart db`

### API Test Failed
1. Check API server running: `docker compose logs api`
2. Verify endpoint URL correct
3. Check authentication token

### Security Scan Issues
1. Update Snyk CLI: `npm install -g snyk`
2. Re-authenticate: `snyk auth`
3. Check rate limits

---

## 📚 Resources

- **MCP Docs**: https://modelcontextprotocol.io/
- **Windsurf MCP**: https://docs.codeium.com/windsurf/mcp
- **BBQ Grill Repo**: d:\เว็บ\bbq-grill-fixed\bbq-grill
- **API Docs**: See `bbq_api/index.php` comments
- **Database Schema**: `docker/mysql/init/01_schema.sql`

---

## 💡 Pro Tips

1. **Batch Operations**: ใช้ MCP ทำหลายอย่างพร้อมกัน
   ```
   "1. Query revenue today
    2. Test payment API
    3. Scan security
    4. Send report to Slack"
   ```

2. **Scheduled Tasks**: ตั้ง cron jobs สำหรับ recurring tasks
   ```
   "Setup daily 00:00 task:
    - Generate revenue report
    - Send to Slack #reports
    - Archive old queues"
   ```

3. **Custom Alerts**: สร้าง alert rules
   ```
   "Alert when:
    - Payment fails
    - Queue wait > 30 min
    - Database error
    - Security vulnerability found"
   ```

4. **Performance Monitoring**: Track metrics
   ```
   "Monitor:
    - API response time
    - Database query time
    - Queue throughput
    - Payment success rate"
   ```

---

สร้างโดย: Cascade AI  
วันที่: 2026-03-16  
Version: 1.0
