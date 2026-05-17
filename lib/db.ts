import { Pool, type PoolClient } from "pg";

const pool = new Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "product_db",
  password: process.env.PG_PASSWORD || "Ilvn1304@",
  port: parseInt(process.env.PG_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function query(text: string, params?: (string | number | null | boolean | undefined | number[] | string[])[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

let initialized = false;
export async function initializeDatabase() {
  if (initialized) return;
  initialized = true;

  // ── Existing tables ──────────────────────────────────────────────────────────

  const createProductsTable = `
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Idempotent column guards for original products columns
  const ensureProductsBaseColumns = `
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `;

  const createUpdateUpdatedAtFn = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;

  const createProductsTrigger = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at'
      ) THEN
        CREATE TRIGGER update_products_updated_at
          BEFORE UPDATE ON products
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END;
    $$;
  `;

  const createStockMovementsTable = `
    CREATE TABLE IF NOT EXISTS stock_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason VARCHAR(60) NOT NULL DEFAULT 'adjustment',
      note TEXT,
      stock_after INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const existingIndexStatements = [
    `CREATE INDEX IF NOT EXISTS products_search_idx
      ON products USING GIN (
        to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(sku, ''))
      )`,
    "CREATE INDEX IF NOT EXISTS products_category_idx ON products(category)",
    "CREATE INDEX IF NOT EXISTS products_status_idx ON products(status)",
    "CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements(product_id)",
    "CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON stock_movements(created_at DESC)",
  ];

  // ── Phase 1: New tables ───────────────────────────────────────────────────────

  // Shared trigger function for updated_at on new tables
  const createUpdateTimestampFn = `
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  // suppliers
  const createSuppliersTable = `
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
  `;

  const createSuppliersTrigger = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_suppliers_updated'
      ) THEN
        CREATE TRIGGER trg_suppliers_updated
          BEFORE UPDATE ON suppliers
          FOR EACH ROW EXECUTE FUNCTION update_timestamp();
      END IF;
    END;
    $$;
  `;

  // product_suppliers (many-to-many junction)
  const createProductSuppliersTable = `
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
  `;

  // audit_log
  const createAuditLogTable = `
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
  `;

  const createAuditLogIndexes = [
    "CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)",
    "CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC)",
  ];

  // users (for RBAC — Phase 8, table created here as Phase 1 foundation)
  const createUsersTable = `
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
  `;

  const createUsersTrigger = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated'
      ) THEN
        CREATE TRIGGER trg_users_updated
          BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_timestamp();
      END IF;
    END;
    $$;
  `;

  // sessions
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // purchase_orders
  const createPurchaseOrdersTable = `
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
  `;

  const createPurchaseOrdersTrigger = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_purchase_orders_updated'
      ) THEN
        CREATE TRIGGER trg_purchase_orders_updated
          BEFORE UPDATE ON purchase_orders
          FOR EACH ROW EXECUTE FUNCTION update_timestamp();
      END IF;
    END;
    $$;
  `;

  // purchase_order_items
  // Note: GENERATED ALWAYS AS requires PostgreSQL 12+.
  // line_total is calculated as (quantity * unit_price) STORED.
  const createPurchaseOrderItemsTable = `
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
  `;

  // product_images
  const createProductImagesTable = `
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url VARCHAR(500) NOT NULL,
      alt_text VARCHAR(255) DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // ── Phase 1: ALTER existing tables ───────────────────────────────────────────

  // products — new columns for reorder system, barcode, and physical attributes
  const alterProductsColumns = `
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS reorder_qty INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
      ADD COLUMN IF NOT EXISTS weight NUMERIC(8,2),
      ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);
  `;

  // stock_movements — add stock_after (may be missing if table predates Phase 1)
  // and link to users for audit trail (FK nullable, future RBAC)
  const alterStockMovementsColumns = `
    ALTER TABLE stock_movements
      ADD COLUMN IF NOT EXISTS stock_after INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS performed_by INTEGER REFERENCES users(id);
  `;

  // ── Execute in dependency order ───────────────────────────────────────────────

  // 1. Core existing tables
  await query(createProductsTable);
  await query(ensureProductsBaseColumns);
  await query(createUpdateUpdatedAtFn);
  await query(createProductsTrigger);
  await query(createStockMovementsTable);

  for (const stmt of existingIndexStatements) {
    try {
      await query(stmt);
    } catch (error) {
      console.warn("Index creation failed (may already exist):", error);
    }
  }

  // 2. Phase 1: shared trigger function (must precede tables that use it)
  await query(createUpdateTimestampFn);

  // 3. Phase 1: independent tables (no cross-dependencies beyond products)
  await query(createSuppliersTable);
  await query(createSuppliersTrigger);
  await query(createAuditLogTable);

  for (const stmt of createAuditLogIndexes) {
    try {
      await query(stmt);
    } catch (error) {
      console.warn("Audit log index creation failed (may already exist):", error);
    }
  }

  await query(createUsersTable);
  await query(createUsersTrigger);
  await query(createSessionsTable);

  // 4. Phase 1: junction / dependent tables
  await query(createProductSuppliersTable);
  await query(createPurchaseOrdersTable);
  await query(createPurchaseOrdersTrigger);
  await query(createPurchaseOrderItemsTable);
  await query(createProductImagesTable);

  // 5. Phase 1: ALTER existing tables (after new tables exist for FK references)
  await query(alterProductsColumns);
  await query(alterStockMovementsColumns);

  // PHASE 7 IMPLEMENTATION START
  // Add thumbnail_url column to product_images (idempotent)
  await query(`
    ALTER TABLE product_images
      ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500) DEFAULT '';
  `);
  // PHASE 7 IMPLEMENTATION END
}

export default pool;
