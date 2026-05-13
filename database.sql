-- ─────────────────────────────────────────────────────────────────────────────
-- Obsidian Inventory — Full Schema Definition
-- Phase 1: Extended schema with suppliers, audit, RBAC, purchase orders, images
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Existing tables ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    category VARCHAR(100),
    stock INTEGER NOT NULL DEFAULT 0,
    brand VARCHAR(100),
    rating FLOAT DEFAULT 0,
    image_url TEXT,
    sku VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Phase 1 additions
    reorder_point INTEGER DEFAULT 10,
    reorder_qty INTEGER DEFAULT 50,
    barcode VARCHAR(100),
    weight NUMERIC(8,2),
    dimensions VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason VARCHAR(60) NOT NULL DEFAULT 'adjustment',
    note TEXT,
    stock_after INTEGER NOT NULL,
    -- Phase 1 addition (nullable until RBAC is active)
    performed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Trigger functions ─────────────────────────────────────────────────────────

-- For products.updated_at (existing)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- For Phase 1 new tables (suppliers, users, purchase_orders)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── Phase 1: New tables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    contact_person VARCHAR(255),
    rating NUMERIC(2,1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS product_suppliers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    lead_days INTEGER DEFAULT 7,
    is_primary BOOLEAN DEFAULT false,
    min_order_qty INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    entity_name VARCHAR(255),
    details JSONB DEFAULT '{}',
    performed_by VARCHAR(100) DEFAULT 'system',
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer',
    avatar_url VARCHAR(500) DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Requires PostgreSQL 12+ for GENERATED ALWAYS AS ... STORED
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    received_qty INTEGER DEFAULT 0,
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255) DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Core CRUD Operations (existing — products)
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE: Insert a new product
INSERT INTO products (name, description, price, category, stock, brand, rating, sku, image_url)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- READ: Retrieve products (with filtering/search/pagination logic)
SELECT * FROM products
WHERE
    category = 'Electronics'
    AND price >= 0 AND price <= 1000
    AND rating >= 4.0
    AND (name ILIKE '%search%' OR description ILIKE '%search%' OR brand ILIKE '%search%')
ORDER BY created_at DESC
LIMIT 12 OFFSET 0;

-- READ: Retrieve products by status
SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC;

-- READ: Count products for pagination
SELECT COUNT(*) FROM products;

-- READ: Retrieve single product by ID
SELECT * FROM products WHERE id = $1;

-- UPDATE: Modify an existing product
UPDATE products
SET
    name = $1, description = $2, price = $3, category = $4,
    stock = $5, brand = $6, rating = $7, sku = $8, image_url = $9, status = $10
WHERE id = $11
RETURNING *;

-- DELETE: Remove a product
DELETE FROM products WHERE id = $1 RETURNING *;


-- ─────────────────────────────────────────────────────────────────────────────
-- Reporting & Analytics Queries (existing)
-- ─────────────────────────────────────────────────────────────────────────────

-- Get Total Inventory Value
SELECT SUM(price * stock) FROM products;

-- Get Average Product Price & Rating
SELECT AVG(price), AVG(rating) FROM products;

-- Get Low Stock Alerts thresholds
SELECT COUNT(*) FROM products WHERE stock < 10 AND stock > 0;
SELECT COUNT(*) FROM products WHERE stock = 0;

-- Products count by category
SELECT category, COUNT(*) as count
FROM products
GROUP BY category
ORDER BY count DESC;

-- Top 5 brands by inventory count
SELECT brand, COUNT(*) as count
FROM products
WHERE brand IS NOT NULL
GROUP BY brand
ORDER BY count DESC
LIMIT 5;

-- Top 5 Highest Rated Products
SELECT * FROM products ORDER BY rating DESC LIMIT 5;

-- 5 Most Recently Added Products
SELECT * FROM products ORDER BY created_at DESC LIMIT 5;

-- List unique categories for Filter dropdown
SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category;

-- Status distribution
SELECT status, COUNT(*) as count FROM products GROUP BY status;

-- Stock movement ledger
SELECT sm.*, p.name, p.sku, p.brand, p.category, p.status
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
ORDER BY sm.created_at DESC
LIMIT 50;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1: New Analytics Queries (reference)
-- ─────────────────────────────────────────────────────────────────────────────

-- Products below reorder_point (for reorder suggestions — Phase 4)
SELECT p.*, ps.supplier_id, ps.cost_price, s.name AS supplier_name
FROM products p
LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_primary = true
LEFT JOIN suppliers s ON s.id = ps.supplier_id
WHERE p.stock <= p.reorder_point AND p.status = 'active'
ORDER BY p.stock ASC;

-- Audit log with filters
SELECT * FROM audit_log
WHERE entity_type = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
