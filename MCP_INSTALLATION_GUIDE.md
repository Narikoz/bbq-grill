# 🔌 MCP Installation Guide for BBQ Grill POS System

คู่มือติดตั้งและใช้งาน MCP Servers สำหรับระบบ BBQ Grill POS/Queue Management

---

## 📋 Phase 1: Critical MCPs (ติดตั้งทันที)

### 1. Supabase MCP - Database Management

**ประโยชน์:**
- Query database โดยตรง (queues, payments, customers, employees, tables)
- Inspect schema และ relationships
- Execute SQL queries
- Analyze data และ generate reports

**วิธีติดตั้ง:**
1. เปิด Windsurf
2. กด `Ctrl+Shift+P` → พิมพ์ "MCP Marketplace"
3. ค้นหา "Supabase" (Official badge)
4. คลิก **Install**
5. Restart Windsurf

**Configuration:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "http://localhost:3306",
        "SUPABASE_KEY": "your-db-password"
      }
    }
  }
}
```

**Use Cases สำหรับ BBQ Grill:**
```
ตัวอย่างคำสั่งที่ใช้กับ Cascade:

1. "Query ข้อมูล queues วันนี้ที่ยังไม่จบ"
2. "หา payment transactions ที่มีปัญหา"
3. "วิเคราะห์ queue wait time เฉลี่ย"
4. "ดู customers ที่จองบ่อยที่สุด"
5. "Generate revenue report สัปดาห์นี้"
```

---

### 2. Postman MCP - API Testing

**ประโยชน์:**
- Test REST API endpoints ทั้งหมด
- Manage API collections
- Automate API testing
- Debug API issues

**วิธีติดตั้ง:**
1. เปิด Windsurf
2. กด `Ctrl+Shift+P` → "MCP Marketplace"
3. ค้นหา "Postman" (Official)
4. คลิก **Install**
5. ต้องการ Postman API Key:
   - ไป https://postman.com → Sign in
   - Settings → API Keys → Generate API Key
   - Copy key มาใส่ใน configuration
6. Restart Windsurf

**Configuration:**
```json
{
  "mcpServers": {
    "postman": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postman"],
      "env": {
        "POSTMAN_API_KEY": "your-postman-api-key"
      }
    }
  }
}
```

**Use Cases สำหรับ BBQ Grill:**
```
ตัวอย่างคำสั่งที่ใช้กับ Cascade:

1. "Test POST /auth/login endpoint"
2. "Create Postman collection สำหรับ queue management APIs"
3. "Test payment flow ทั้งหมด (WAITING → CONFIRMED → SEATED → FINISHED)"
4. "Debug ทำไม /queues endpoint return 404"
5. "Load test /queues endpoint ด้วย 100 concurrent requests"
```

**BBQ Grill API Endpoints ที่ควร test:**
```
Authentication:
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me

Queues:
- GET    /api/queues
- POST   /api/queues
- PATCH  /api/queues/{id}

Tables:
- GET    /api/tables

Payments:
- POST   /api/payments/confirm
- GET    /api/payments/{queue_id}

Employees (Admin):
- GET    /api/employees
- POST   /api/employees
- PATCH  /api/employees/{id}

Reports:
- GET    /api/reports/today
```

---

### 3. Snyk MCP - Security Scanning

**ประโยชน์:**
- Scan dependencies สำหรับ vulnerabilities
- Check Docker containers security
- Audit code สำหรับ security issues
- Monitor CVEs

**วิธีติดตั้ง:**
1. เปิด Windsurf
2. กด `Ctrl+Shift+P` → "MCP Marketplace"
3. ค้นหา "Snyk" (Official)
4. คลิก **Install**
5. ต้องการ Snyk API Token:
   - ไป https://snyk.io → Sign up/Login
   - Account Settings → API Token
   - Copy token มาใส่
6. Restart Windsurf

**Configuration:**
```json
{
  "mcpServers": {
    "snyk": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-snyk"],
      "env": {
        "SNYK_TOKEN": "your-snyk-token"
      }
    }
  }
}
```

**Use Cases สำหรับ BBQ Grill:**
```
ตัวอย่างคำสั่งที่ใช้กับ Cascade:

1. "Scan package.json สำหรับ vulnerabilities"
2. "Check Docker images security (node:22-alpine, mariadb:11.3, nginx:1.27)"
3. "Audit PHP dependencies"
4. "Find security issues ใน payment processing code"
5. "Generate security report สำหรับทั้งโปรเจค"
```

---

## 📋 Phase 2: Important MCPs (ติดตั้งในสัปดาห์แรก)

### 4. Slack MCP - Notifications & Alerts

**ประโยชน์:**
- แจ้งเตือนเมื่อ payment failed
- Alert เมื่อ queue overflow
- Daily revenue reports
- System health monitoring

**วิธีติดตั้ง:**
1. MCP Marketplace → ค้นหา "Slack"
2. Install
3. ต้องการ Slack Bot Token:
   - ไป https://api.slack.com/apps
   - Create New App → From scratch
   - Add Bot Token Scopes: `chat:write`, `channels:read`
   - Install to Workspace
   - Copy Bot User OAuth Token
4. Restart Windsurf

**Use Cases:**
```
1. "ส่ง Slack message เมื่อ payment failed"
2. "แจ้งเตือนเมื่อ queue รอเกิน 30 นาที"
3. "ส่ง daily revenue report ทุกเที่ยงคืน"
4. "Alert เมื่อ database connection ล้มเหลว"
```

---

### 5. MercadoPago/PayPal MCP - Payment Integration

**ประโยชน์:**
- รองรับ payment gateway เพิ่มเติม
- Process credit card payments
- Handle refunds
- Transaction reconciliation

**Use Cases:**
```
1. "เพิ่ม credit card payment option"
2. "Process refund สำหรับ queue_id 123"
3. "Generate payment reconciliation report"
4. "Test payment gateway integration"
```

---

### 6. SonarQube MCP - Code Quality

**ประโยชน์:**
- Analyze code quality (PHP + TypeScript)
- Find bugs และ code smells
- Track technical debt
- Enforce coding standards

**Use Cases:**
```
1. "Analyze bbq_api/index.php code quality"
2. "Find code smells ใน Angular components"
3. "Generate technical debt report"
4. "Check coding standards compliance"
```

---

## 📋 Phase 3: Nice to Have MCPs

### 7. Notion/Asana MCP - Project Management
- Track features, bugs, improvements
- Sprint planning
- Documentation

### 8. Vercel/Netlify MCP - Deployment
- Deploy Angular frontend
- Preview deployments
- CI/CD integration

### 9. Terraform MCP - Infrastructure
- Provision VPS
- Configure load balancers
- Manage DNS

### 10. Pinecone MCP - Documentation Search
- Semantic search
- Knowledge base
- Find similar code patterns

---

## 🧪 การทดสอบหลังติดตั้ง

### Test Supabase MCP:
```
พิมพ์ใน Cascade chat:
"Query ตาราง queues ทั้งหมดที่ queue_status = 'WAITING'"
```

### Test Postman MCP:
```
พิมพ์ใน Cascade chat:
"Test POST /api/auth/login endpoint ด้วย username: admin, password: admin1234"
```

### Test Snyk MCP:
```
พิมพ์ใน Cascade chat:
"Scan bbq_angular/package.json สำหรับ security vulnerabilities"
```

---

## ⚠️ หมายเหตุสำคัญ

1. **API Keys:** MCP ส่วนใหญ่ต้องการ API keys/tokens
   - Postman: ฟรี tier มี rate limits
   - Snyk: ฟรี tier สำหรับ open source
   - Slack: ฟรี (ต้องสร้าง app)

2. **Configuration File:**
   - Windows: `%APPDATA%\Windsurf\mcp-settings.json`
   - macOS: `~/Library/Application Support/Windsurf/mcp-settings.json`

3. **Restart Required:**
   - ทุกครั้งที่ติดตั้ง MCP ใหม่ต้อง restart Windsurf

4. **Testing:**
   - ทดสอบทีละตัวก่อนติดตั้งตัวถัดไป
   - ตรวจสอบว่า MCP ทำงานได้จริง

---

## 🎯 ลำดับการติดตั้งที่แนะนำ

**Day 1:**
1. ติดตั้ง Supabase MCP
2. ทดสอบ query database
3. ติดตั้ง Postman MCP
4. ทดสอบ API endpoints

**Day 2:**
5. ติดตั้ง Snyk MCP
6. Scan vulnerabilities
7. Fix critical issues ที่พบ

**Week 1:**
8. ติดตั้ง Slack MCP
9. Setup notifications
10. ติดตั้ง Payment MCP (ถ้าต้องการ)

**Week 2+:**
11. ติดตั้ง MCPs อื่นๆ ตามความต้องการ

---

## 📚 Resources

- MCP Documentation: https://modelcontextprotocol.io/
- Windsurf MCP Guide: https://docs.codeium.com/windsurf/mcp
- Supabase MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/supabase
- Postman API: https://learning.postman.com/docs/developer/postman-api/intro-api/
- Snyk Docs: https://docs.snyk.io/

---

## 🆘 Troubleshooting

**MCP ไม่ทำงาน:**
1. ตรวจสอบ API key ถูกต้อง
2. Restart Windsurf
3. ดู logs: Windsurf → Help → Toggle Developer Tools → Console

**Connection Error:**
1. ตรวจสอบ network/firewall
2. ตรวจสอบ credentials
3. ลอง reinstall MCP

**Rate Limit:**
1. รอ rate limit reset
2. Upgrade เป็น paid tier
3. ใช้ alternative MCP

---

สร้างโดย: Cascade AI
วันที่: 2026-03-16
Version: 1.0
