import { Pool, type PoolClient } from "pg";

const pool = new Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "product_db",
  password: process.env.PG_PASSWORD || "Ilvn1304@",
  port: parseInt(process.env.PG_PORT || "5432"),
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
  if (initialized) return;  // ← ADD THIS LINE
  initialized = true;  
  const createTableQuery = `
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

  const ensureStatusColumn = `
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
  `;

  const ensureCreatedAtColumn = `
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `;

  const ensureUpdatedAtColumn = `
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `;

  const createTriggerFn = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;

  const createTrigger = `
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

  const indexStatements = [
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

  await query(createTableQuery);
  await query(ensureStatusColumn);
  await query(ensureCreatedAtColumn);
  await query(ensureUpdatedAtColumn);
  await query(createTriggerFn);
  await query(createTrigger);
  await query(createStockMovementsTable);
  for (const statement of indexStatements) {
    try {
      await query(statement);
    } catch (error) {
      console.warn("Index creation failed:", statement, error);
    }
  }
}

export default pool;
