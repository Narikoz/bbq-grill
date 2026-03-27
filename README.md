# 🔥 BBQ GRILL — Thermal Noir

**Angular 19 Zoneless · TailwindCSS v4 · TanStack Query v5 · Zod · PHP 8.2 · MariaDB · Docker**

---

## 📂 โครงสร้างโปรเจค

```
bbq-grill/
├── 📁 bbq_api/              ← PHP 8.2 REST API + Obsidian Hearth UI
│   ├── index.php            ← หน้าจอง (ลูกค้า)
│   ├── login.php            ← เข้าสู่ระบบพนักงาน
│   ├── staff_queue.php      ← จัดการคิว
│   ├── admin.php            ← Admin dashboard
│   ├── pay.php              ← ชำระ PromptPay QR
│   ├── receipt_public.php   ← ใบเสร็จลูกค้า
│   ├── receipt.php          ← ใบเสร็จพนักงาน
│   ├── db.php               ← DB connection (Docker env vars)
│   ├── auth.php             ← Session guard
│   ├── logout.php
│   ├── theme.css            ← Obsidian Hearth design system
│   └── .htaccess            ← URL rewriting
│
├── 📁 bbq_angular/          ← Angular 19 SPA (Thermal Noir)
│   ├── src/
│   │   ├── styles.css       ← TailwindCSS v4 + design tokens
│   │   ├── main.ts          ← Zoneless bootstrap
│   │   └── app/
│   │       ├── app.config.ts          ← provideAngularQuery
│   │       ├── app.routes.ts          ← lazy routes
│   │       ├── core/
│   │       │   ├── models/index.ts    ← Zod schemas
│   │       │   ├── services/          ← ApiService + AuthService
│   │       │   ├── guards/            ← authGuard + adminGuard
│   │       │   └── interceptors/      ← error 401 redirect
│   │       └── features/
│   │           ├── booking/           ← Customer booking page
│   │           ├── auth/              ← Staff login
│   │           ├── staff/             ← Queue dashboard (heat-encoded)
│   │           ├── admin/             ← Reports + employee CRUD
│   │           ├── pay/               ← PromptPay QR countdown
│   │           └── receipt/           ← Unified receipt
│   ├── angular.json
│   ├── package.json         ← Angular 19 + Tailwind v4 + TanStack + Zod
│   ├── tsconfig.json
│   └── proxy.conf.json      ← /api → PHP in Docker
│
├── 📁 docker/
│   ├── php/Dockerfile       ← PHP 8.2 + Apache + mysqli
│   ├── nginx/
│   │   ├── default.conf     ← dev proxy (Angular + API)
│   │   └── prod.conf        ← production (HTTPS)
│   └── mysql/init/
│       └── 01_schema.sql    ← schema + seed (admin/staff accounts)
│
├── 📁 .vscode/              ← Extensions + settings + debug config
├── docker-compose.yml       ← dev stack (4 containers)
├── Makefile                 ← shortcuts: make up / logs / shell-db
├── .env                     ← DB passwords (อย่า commit!)
└── .env.example
```

---

## 🚀 เริ่มใช้งาน

### ข้อกำหนด
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- VS Code (optional แต่แนะนำ)

### 3 คำสั่ง

```bash
# 1. เข้าโฟลเดอร์
cd bbq-grill

# 2. เริ่ม (ครั้งแรกใช้เวลา ~3 นาที download images + npm install)
docker compose up -d --build

# 3. ดู Angular compile progress
docker compose logs -f angular
```

รอจนขึ้น `Application bundle generation complete` แล้วเปิด browser ครับ

### URL

| URL | หน้า |
|-----|------|
| `http://localhost` | 🔥 จองโต๊ะ (ลูกค้า) |
| `http://localhost/#/login` | 🔐 เข้าสู่ระบบพนักงาน |
| `http://localhost/#/staff` | 📋 จัดการคิว |
| `http://localhost/#/admin` | 👑 Admin Dashboard |
| `http://localhost/api/auth/me` | 🔌 PHP REST API test |

> **PHP UI** (ไม่ผ่าน Angular): `http://localhost/api/index.php`

### บัญชีเริ่มต้น

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `admin1234`| ADMIN |
| `staff`  | `staff1234`| STAFF |

---

## ⌨️ คำสั่งที่ใช้บ่อย

```bash
make up                # เริ่ม + rebuild
make down              # หยุด
make logs s=angular    # ดู Angular logs live
make logs s=api        # ดู PHP logs
make logs s=db         # ดู MariaDB logs
make shell-api         # เข้า bash ใน PHP container
make shell-db          # เข้า MariaDB CLI
make shell-angular     # เข้า Alpine shell ใน Angular container
make reset-db          # ล้าง DB + reinit (⚠️ ลบข้อมูลทั้งหมด)
```

หรือใช้ Docker โดยตรง:
```bash
docker compose ps                  # ดูสถานะ containers
docker compose restart api         # restart PHP
docker compose exec api bash       # shell PHP
docker compose exec db mariadb -u bbq_user -pbbq_pass bbq_queue_db
```

---

## ⚙️ Configuration

### เปลี่ยนเบอร์ PromptPay
```typescript
// bbq_angular/src/app/features/pay/pay.page.ts  บรรทัดที่ 1
const PROMPTPAY_PHONE = '0812345678'  // ← เปลี่ยนที่นี่
```

### เปลี่ยน DB password
แก้ใน `.env` แล้ว `make reset-db`

### เชื่อม DB จาก TablePlus / HeidiSQL / DBeaver
```
Host:     localhost
Port:     3306
User:     bbq_user
Password: ค่าจาก .env → DB_PASSWORD
Database: bbq_queue_db
```

---

## 🏗️ Stack ที่ใช้

| | Tech | Version | เหตุผล |
|--|------|---------|--------|
| Frontend | Angular | 19 | Zoneless Signals, ไม่มี Zone.js |
| Styling | TailwindCSS | v4 | CSS-first config, Oxide engine (Rust) |
| Server State | TanStack Angular Query | v5 | SWR + auto-refetch + mutations |
| Validation | Zod | v3 | Type-safe schema ตรงกับ PHP API |
| Backend | PHP | 8.2 | เดิม + Docker env vars |
| Database | MariaDB | 11.3 | แก้ปัญหา HY000/1130 ทันที |
| Proxy | Nginx | 1.27 | Single entrypoint |

### Heat-encoded queue urgency
Queue cards เปลี่ยนสีตามเวลารอจริง:
```
< 5 นาที  → neutral (เทา)
5–15 นาที → amber  (เหลือง)
15–30 นาที → lava  (ส้ม)
30+ นาที  → crimson + pulse animation (แดง)
```

---

## � MCP Servers (Model Context Protocol)

ระบบนี้รองรับ MCP servers เพื่อเพิ่มความสามารถให้ AI Assistant (Cascade) ในการจัดการระบบ

### MCPs ที่แนะนำสำหรับ POS System

**Phase 1: Critical**
- 🔲 **Supabase** - Database management & queries
- 🔲 **Postman** - API testing & automation
- 🔲 **Snyk** - Security scanning & vulnerability detection

**Phase 2: Important**
- 🔲 **Slack** - Notifications & alerts
- 🔲 **MercadoPago/PayPal** - Payment gateway integration
- 🔲 **SonarQube** - Code quality analysis

**Phase 3: Nice to Have**
- 🔲 **Notion/Asana** - Project management
- 🔲 **Vercel/Netlify** - Deployment automation
- 🔲 **Terraform** - Infrastructure as Code

### เอกสาร MCP

- 📖 [Installation Guide](./MCP_INSTALLATION_GUIDE.md) - วิธีติดตั้งและ config
- 🎯 [Usage Examples](./MCP_USAGE_EXAMPLES.md) - ตัวอย่างการใช้งาน
- ⚡ [Quick Reference](./MCP_QUICK_REFERENCE.md) - คำสั่งที่ใช้บ่อย
- ⚙️ [Config Template](./.windsurf/mcp-config-template.json) - Template configuration

### ตัวอย่างการใช้งาน

```bash
# Database Query
"Query queues วันนี้ที่ status = 'WAITING'"

# API Testing
"Test POST /api/auth/login endpoint"

# Security Scan
"Scan package.json vulnerabilities"

# Generate Report
"สร้าง revenue report วันนี้"
```

---

## �🚢 Deploy บน VPS

```bash
# บน server (Ubuntu)
apt install docker.io docker-compose-plugin -y
git clone <your-repo> bbq-grill
cd bbq-grill
cp .env.example .env && nano .env   # ใส่ password จริง

# Build Angular
docker compose exec angular npx ng build --base-href /

# Production stack (HTTPS)
docker compose -f docker-compose.prod.yml up -d
```
