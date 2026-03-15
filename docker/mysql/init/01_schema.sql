-- ═══════════════════════════════════════════════════════════
--  BBQ GRILL — Database schema
--  Auto-runs when the MariaDB container starts for the first time
-- ═══════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- ── Customers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    customer_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_name VARCHAR(120) NOT NULL,
    customer_tel  VARCHAR(20)  NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id),
    UNIQUE KEY uk_tel (customer_tel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tables (dining tables in the restaurant) ─────────────────
CREATE TABLE IF NOT EXISTS tables (
    table_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_number INT UNSIGNED NOT NULL,
    capacity     INT UNSIGNED NOT NULL DEFAULT 4,
    status       ENUM('AVAILABLE','OCCUPIED','RESERVED') NOT NULL DEFAULT 'AVAILABLE',
    PRIMARY KEY (table_id),
    UNIQUE KEY uk_table_number (table_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Queues ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queues (
    queue_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_id       INT UNSIGNED NOT NULL,
    table_id          INT UNSIGNED          DEFAULT NULL,
    pax_amount        INT UNSIGNED NOT NULL DEFAULT 1,
    booking_time      DATETIME     NOT NULL,
    queue_status      ENUM('WAITING','CONFIRMED','SEATED','FINISHED','CANCELLED')
                                   NOT NULL DEFAULT 'WAITING',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at      DATETIME              DEFAULT NULL,
    seated_at         DATETIME              DEFAULT NULL,
    finished_at       DATETIME              DEFAULT NULL,
    cancelled_at      DATETIME              DEFAULT NULL,
    pay_token         VARCHAR(64)           DEFAULT NULL,
    pay_token_expires DATETIME              DEFAULT NULL,
    PRIMARY KEY (queue_id),
    KEY idx_status      (queue_status),
    KEY idx_created     (created_at),
    KEY idx_customer    (customer_id),
    CONSTRAINT fk_queue_customer FOREIGN KEY (customer_id)
        REFERENCES customers (customer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_queue_table FOREIGN KEY (table_id)
        REFERENCES tables (table_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    payment_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    queue_id        INT UNSIGNED NOT NULL,
    subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    vat_amount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method  VARCHAR(30)   NOT NULL DEFAULT 'CASH',
    payment_time    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    KEY idx_queue       (queue_id),
    KEY idx_pay_time    (payment_time),
    CONSTRAINT fk_payment_queue FOREIGN KEY (queue_id)
        REFERENCES queues (queue_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    emp_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    emp_name      VARCHAR(120) NOT NULL,
    username      VARCHAR(60)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('ADMIN','STAFF') NOT NULL DEFAULT 'STAFF',
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (emp_id),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════
--  SEED DATA
-- ═══════════════════════════════════════════════════════════

-- Dining tables (10 tables, mixed sizes)
INSERT IGNORE INTO tables (table_number, capacity) VALUES
    (1, 2),(2, 2),(3, 4),(4, 4),(5, 4),
    (6, 4),(7, 6),(8, 6),(9, 8),(10, 10);

-- Default admin account  (password: admin1234)
-- Hash generated with:  php -r "echo password_hash('admin1234', PASSWORD_DEFAULT);"
INSERT IGNORE INTO employees (emp_name, username, password_hash, role) VALUES
    ('ผู้ดูแลระบบ', 'admin',
     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'ADMIN');

-- Default staff account  (password: staff1234)
INSERT IGNORE INTO employees (emp_name, username, password_hash, role) VALUES
    ('พนักงานทั่วไป', 'staff',
     '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B83L.QK',
     'STAFF');

-- ═══════════════════════════════════════════════════════════
--  Grant bbq_user full access to bbq_queue_db
--  (MariaDB official image handles MARIADB_USER/PASSWORD,
--   this just makes sure the grant is explicit)
-- ═══════════════════════════════════════════════════════════
GRANT ALL PRIVILEGES ON bbq_queue_db.* TO 'bbq_user'@'%';
FLUSH PRIVILEGES;
