-- ============================================================================
-- Inventory Management System — Database Schema
-- PostgreSQL Script
-- ============================================================================
-- This script creates the complete database schema for a multi-tenant
-- inventory management system with support for:
--   • Multi-tenancy (tenant isolation)
--   • Products, Suppliers, and Product-Supplier relationships
--   • Purchase Orders and Purchase Order Items
--   • Stock Movement tracking
--   • User management with role-based access (admin, manager, viewer)
--   • Session management
--   • Full audit logging
-- ============================================================================


-- ============================================================================
-- 1. TRIGGER FUNCTIONS
-- ============================================================================

-- Automatically updates the updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Alternative trigger function for the same purpose (used by products table)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Tenants — Workspace / organization isolation
-- ----------------------------------------------------------------------------
CREATE TABLE tenants (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.2 Users — System users with roles
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  DEFAULT 'viewer',
    avatar_url    VARCHAR(500) DEFAULT '',
    is_active     BOOLEAN      DEFAULT TRUE,
    last_login    TIMESTAMP,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    tenant_id     INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.3 Sessions — Authentication tokens
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2.4 Products — Inventory items
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255)   NOT NULL,
    description   TEXT,
    price         NUMERIC(10,2)  DEFAULT 0 NOT NULL,
    category      VARCHAR(100),
    stock         INTEGER        DEFAULT 0 NOT NULL,
    brand         VARCHAR(100),
    rating        DOUBLE PRECISION DEFAULT 0,
    image_url     TEXT,
    sku           VARCHAR(50),
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    status        VARCHAR(20)    DEFAULT 'active' NOT NULL,
    reorder_point INTEGER        DEFAULT 10,
    reorder_qty   INTEGER        DEFAULT 50,
    barcode       VARCHAR(100),
    weight        NUMERIC(8,2),
    dimensions    VARCHAR(100),
    tenant_id     INTEGER        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.5 Product Images — Multiple images per product
-- ----------------------------------------------------------------------------
CREATE TABLE product_images (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url           VARCHAR(500) NOT NULL,
    alt_text      VARCHAR(255) DEFAULT '',
    sort_order    INTEGER      DEFAULT 0,
    is_primary    BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    thumbnail_url VARCHAR(500) DEFAULT '',
    tenant_id     INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.6 Suppliers — Vendor / supplier records
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255),
    phone          VARCHAR(50),
    address        TEXT,
    website        VARCHAR(255),
    contact_person VARCHAR(255),
    rating         NUMERIC(2,1) DEFAULT 0,
    status         VARCHAR(20)  DEFAULT 'active',
    notes          TEXT         DEFAULT '',
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    tenant_id      INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.7 Product Suppliers — Many-to-many link between products and suppliers
-- ----------------------------------------------------------------------------
CREATE TABLE product_suppliers (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id   INTEGER       NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    cost_price    NUMERIC(10,2) DEFAULT 0 NOT NULL,
    lead_days     INTEGER       DEFAULT 7,
    is_primary    BOOLEAN       DEFAULT FALSE,
    min_order_qty INTEGER       DEFAULT 1,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    tenant_id     INTEGER       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE (product_id, supplier_id)
);

-- ----------------------------------------------------------------------------
-- 2.8 Purchase Orders — Orders placed to suppliers
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    id            SERIAL PRIMARY KEY,
    supplier_id   INTEGER       NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status        VARCHAR(20)   DEFAULT 'draft',
    order_date    DATE          DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    subtotal      NUMERIC(12,2) DEFAULT 0,
    tax           NUMERIC(12,2) DEFAULT 0,
    total         NUMERIC(12,2) DEFAULT 0,
    notes         TEXT          DEFAULT '',
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    tenant_id     INTEGER       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.9 Purchase Order Items — Line items within a purchase order
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER       NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id   INTEGER       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity     INTEGER       DEFAULT 1 NOT NULL,
    unit_price   NUMERIC(10,2) DEFAULT 0 NOT NULL,
    received_qty INTEGER       DEFAULT 0,
    line_total   NUMERIC(12,2) GENERATED ALWAYS AS (quantity::NUMERIC * unit_price) STORED,
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    tenant_id    INTEGER       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.10 Stock Movements — Track every inventory change
-- ----------------------------------------------------------------------------
CREATE TABLE stock_movements (
    id           SERIAL PRIMARY KEY,
    product_id   INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta        INTEGER     NOT NULL,
    reason       VARCHAR(60) DEFAULT 'adjustment' NOT NULL,
    note         TEXT,
    stock_after  INTEGER     NOT NULL,
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    performed_by INTEGER     REFERENCES users(id),
    tenant_id    INTEGER     NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2.11 Audit Log — Records all significant system actions
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id           SERIAL PRIMARY KEY,
    action       VARCHAR(50)  NOT NULL,
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    INTEGER,
    entity_name  VARCHAR(255),
    details      JSONB        DEFAULT '{}',
    performed_by VARCHAR(100) DEFAULT 'system',
    ip_address   VARCHAR(45),
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    tenant_id    INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Tenant isolation indexes (for efficient tenant-scoped queries)
CREATE INDEX idx_users_tenant_id                ON users (tenant_id);
CREATE INDEX idx_products_tenant_id             ON products (tenant_id);
CREATE INDEX idx_product_images_tenant_id       ON product_images (tenant_id);
CREATE INDEX idx_suppliers_tenant_id            ON suppliers (tenant_id);
CREATE INDEX idx_product_suppliers_tenant_id    ON product_suppliers (tenant_id);
CREATE INDEX idx_purchase_orders_tenant_id      ON purchase_orders (tenant_id);
CREATE INDEX idx_purchase_order_items_tenant_id ON purchase_order_items (tenant_id);
CREATE INDEX idx_stock_movements_tenant_id      ON stock_movements (tenant_id);
CREATE INDEX idx_audit_log_tenant_id            ON audit_log (tenant_id);

-- Product search and filtering
CREATE INDEX products_category_idx   ON products (category);
CREATE INDEX products_status_idx     ON products (status);
CREATE INDEX products_created_at_idx ON products (created_at DESC);
CREATE INDEX products_search_idx     ON products USING gin (
    to_tsvector('simple',
        COALESCE(name, '')::TEXT || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(brand, '')::TEXT || ' ' ||
        COALESCE(sku, '')::TEXT
    )
);

-- Stock movement lookups
CREATE INDEX stock_movements_product_idx    ON stock_movements (product_id);
CREATE INDEX stock_movements_created_at_idx ON stock_movements (created_at DESC);

-- Audit log lookups
CREATE INDEX idx_audit_log_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);


-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_tenants_updated
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_suppliers_updated
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_purchase_orders_updated
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- ============================================================================
-- 5. SAMPLE DATA
-- ============================================================================

-- 5.1 Tenants
INSERT INTO tenants (id, name, created_at, updated_at) VALUES
    (1, 'Default Workspace',       '2026-05-21 13:16:28', '2026-05-21 13:16:28'),
    (2, 'alex Jhons Workspace',    '2026-05-21 16:43:10', '2026-05-21 16:43:10'),
    (3, 'jeffary Workspace',       '2026-05-21 17:07:34', '2026-05-21 17:07:34');

SELECT setval('tenants_id_seq', 3, true);

-- 5.2 Users
INSERT INTO users (id, name, email, password_hash, role, avatar_url, is_active, last_login, created_at, updated_at, tenant_id) VALUES
    (1, 'real',        'realtalk@gmail.com',    '$2b$12$sfPwAKAWirN.ucQOYws2Cu1wZV8aowBAa3vX8Aq6ZQH/rB2/LqyMi', 'admin',   '', TRUE, '2026-05-21 20:04:26', '2026-05-17 16:17:20', '2026-05-21 20:04:26', 1),
    (2, 'Joe',         'real@gmail.com',        '$2b$12$KIf/kaGdtTV.rHV1wH.wYemOp3T.rgq/kAOY/xI7yW7j6RdoxhhK.', 'viewer',  '', TRUE, '2026-05-20 12:51:14', '2026-05-20 12:51:14', '2026-05-21 13:16:28', 1),
    (6, 'alex Jhons',  'alex@invent.com',       '$2b$12$EiFdW42krSiDnzROdi3B.uhWTOBv2sQEA1J8.rz5srzR0XiQv49Bi', 'admin',   '', TRUE, '2026-05-22 10:36:57', '2026-05-21 16:43:10', '2026-05-22 10:36:57', 2),
    (7, 'jeffary',     'jeffery@obsidian.com',  '$2b$12$OabowLTAQ7vcFIOjM.TiaOTG1m056rNpD8FEtBkxTdrtCt5oT001m', 'admin',   '', TRUE, '2026-05-21 17:07:35', '2026-05-21 17:07:34', '2026-05-21 17:07:35', 3),
    (8, 'Robert',      'robert@gmail.com',      '$2b$12$cqgkH8igg9t4/C1jyT/Xn.UlwS9gQYmwh3hGGz7FAGSixVhVG.pNG', 'manager', '', TRUE, '2026-05-22 10:09:07', '2026-05-21 17:59:59', '2026-05-22 10:09:07', 2);

SELECT setval('users_id_seq', 9, true);

-- 5.3 Suppliers
INSERT INTO suppliers (id, name, email, phone, address, website, contact_person, rating, status, notes, created_at, updated_at, tenant_id) VALUES
    (1, 'Smith Jhons',        'smith@gmail.com',   '0333 12345678',          '56 Mall Road , Lahore, Pakistan', NULL, NULL,                4.0, 'active', 'Provide us with electronic stuff',  '2026-05-21 17:16:00', '2026-05-21 17:16:00', 2),
    (2, 'Rasheed Furnitures',  'rasheed@gmail.com', '0333 4567890123445667', NULL,                              NULL, 'Rasheed Chaudhary', 4.0, 'active', '',                                  '2026-05-21 19:44:35', '2026-05-21 19:44:35', 2);

SELECT setval('suppliers_id_seq', 2, true);

-- 5.4 Purchase Orders
INSERT INTO purchase_orders (id, supplier_id, status, order_date, expected_date, received_date, subtotal, tax, total, notes, created_at, updated_at, tenant_id) VALUES
    (1, 1, 'received', '2026-05-21', '2026-05-23', '2026-05-21',   0.00, 20.00,  20.00, 'urgently needed', '2026-05-21 19:05:30', '2026-05-21 19:07:09', 2),
    (2, 1, 'received', '2026-05-21', '2026-05-24', '2026-05-21', 500.00,  0.00, 500.00, '',                 '2026-05-21 19:30:21', '2026-05-21 19:32:36', 2),
    (3, 1, 'received', '2026-05-21', '2026-05-25', '2026-05-21',  50.00,  0.00,  50.00, '',                 '2026-05-21 19:40:50', '2026-05-21 19:41:12', 2),
    (4, 1, 'received', '2026-05-21', '2026-05-27', '2026-05-21',  50.00,  0.00,  50.00, '',                 '2026-05-21 19:42:19', '2026-05-21 19:42:35', 2);

SELECT setval('purchase_orders_id_seq', 4, true);

-- 5.5 Sessions
INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES
    (5,  1, '879bc57cbeeba39300dd3bef999684710d8ecfafe96d6063cdf65d05c6b2793f', '2026-05-28 07:13:41', '2026-05-21 07:13:41'),
    (17, 6, 'ab5e03ec91a1be3e36d009ba1aa9f811e3d5bd97cbf5edbc7528caa8d0f84d9d', '2026-05-29 10:14:41', '2026-05-22 10:14:41'),
    (18, 6, 'a7f7dbfc2945a8ffe50025dcf9689a254400c33820fbc6b5aaf109a7e9dde7c2', '2026-05-29 10:19:58', '2026-05-22 10:19:58'),
    (19, 6, '96d6bed995199c08ad324e3137ca007db91b57c4fe60cbf5750a983659e165f7', '2026-05-29 10:27:46', '2026-05-22 10:27:46'),
    (20, 6, 'c36797ef2deb9af582f78e476d59b00beb65318ef6c502a354c84b7f1ed9cf4b', '2026-05-29 10:36:57', '2026-05-22 10:36:57');

SELECT setval('sessions_id_seq', 20, true);

-- 5.6 Audit Log (sample entries)
INSERT INTO audit_log (id, action, entity_type, entity_id, entity_name, details, performed_by, ip_address, created_at, tenant_id) VALUES
    (1,  'create', 'user',           1,  'realtalk@gmail.com',          '{"role": "admin"}',                                                                                     'system',              '::1',            '2026-05-17 16:17:21', 1),
    (2,  'create', 'product',        24, 'test',                        '{"sku": "real", "price": "100.00", "stock": 500, "status": "active", "category": "Electronics"}',         'realtalk@gmail.com',  NULL,             '2026-05-17 12:53:52', 1),
    (7,  'create', 'user',           2,  'real@gmail.com',              '{"role": "viewer"}',                                                                                     'system',              '39.45.52.62',    '2026-05-20 12:51:15', 1),
    (8,  'create', 'user',           6,  'alex@invent.com',             '{"role": "admin"}',                                                                                      'alex@invent.com',     '154.81.238.3',   '2026-05-21 16:43:11', 2),
    (9,  'create', 'product',        29, 'Laptops',                     '{"sku": "LAP-001", "price": "200.00", "stock": 50, "status": "active", "category": "Electronics"}',       'alex@invent.com',     NULL,             '2026-05-21 17:02:52', 2),
    (10, 'create', 'user',           7,  'jeffery@obsidian.com',        '{"role": "admin"}',                                                                                      'jeffery@obsidian.com','154.81.238.3',   '2026-05-21 17:07:36', 3),
    (11, 'create', 'supplier',       1,  'Smith Jhons',                 '{"email": "smith@gmail.com", "rating": "4.0", "status": "active"}',                                      'alex@invent.com',     NULL,             '2026-05-21 17:16:00', 2),
    (13, 'create', 'product',        30, 'KeyBoard',                    '{"sku": "KB-002", "price": "50.00", "stock": 50, "status": "active", "category": "Electronics"}',         'alex@invent.com',     NULL,             '2026-05-21 17:21:47', 2),
    (15, 'create', 'user',           8,  'robert@gmail.com',            '{"role": "manager", "createdBy": "alex@invent.com"}',                                                    'alex@invent.com',     '154.81.238.3',   '2026-05-21 17:59:59', 2),
    (23, 'stock_adjust', 'product',  29, 'Laptops',                     '{"note": "", "delta": -1, "reason": "sale", "stock_after": 0}',                                          'alex@invent.com',     NULL,             '2026-05-21 18:37:33', 2),
    (24, 'create', 'purchase_order', 1,  'PO #1 — Smith Jhons',        '{"tax": 20, "total": 20, "subtotal": 0, "item_count": 1, "supplier_id": 1, "supplier_name": "Smith Jhons"}', 'alex@invent.com',  NULL,             '2026-05-21 19:05:31', 2),
    (26, 'receive_po', 'purchase_order', 1, 'PO #1 — Smith Jhons',     '{"new_status": "received", "items_received": 1, "total_units_received": 50}',                             'alex@invent.com',     NULL,             '2026-05-21 19:07:11', 2),
    (41, 'create', 'supplier',       2,  'Rasheed Furnitures',          '{"email": "rasheed@gmail.com", "rating": "4.0", "status": "active"}',                                     'robert@gmail.com',    NULL,             '2026-05-21 19:44:35', 2);

SELECT setval('audit_log_id_seq', 59, true);


-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
