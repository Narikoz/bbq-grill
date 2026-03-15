.PHONY: up down restart logs shell-api shell-db shell-angular reset-db

# ── เริ่ม stack (rebuild ถ้ามีการเปลี่ยนแปลง)
up:
	docker compose up -d --build
	@echo ""
	@echo "  ✓  http://localhost        → Angular UI  (รอ ~2 นาทีครั้งแรก)"
	@echo "  ✓  http://localhost/api    → PHP REST API"
	@echo "  ✓  localhost:3306          → MariaDB (TablePlus / HeidiSQL)"
	@echo ""
	@echo "  ดู Angular log: make logs s=angular"

# ── หยุด stack
down:
	docker compose down

# ── restart service ใดก็ได้  เช่น: make restart s=api
restart:
	docker compose restart $(s)

# ── ดู logs แบบ live  เช่น: make logs s=angular
logs:
	docker compose logs -f $(s)

# ── shell ของ PHP container
shell-api:
	docker compose exec api bash

# ── MariaDB CLI
shell-db:
	docker compose exec db mariadb -u bbq_user -pbbq_pass bbq_queue_db

# ── Angular CLI ใน container
shell-angular:
	docker compose exec angular sh

# ── Reset DB ทั้งหมด (ระวัง: ลบข้อมูล!)
reset-db:
	@echo "⚠️  จะลบข้อมูลใน DB ทั้งหมด (Ctrl+C เพื่อยกเลิก)"
	@sleep 5
	docker compose down -v
	docker compose up -d db
	@echo "DB initialized fresh ✓"
