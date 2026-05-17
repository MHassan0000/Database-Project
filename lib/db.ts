import { Pool, type PoolClient } from "pg";

const pool = new Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "product_db",
  password: process.env.PG_PASSWORD || "postgres",
  port: parseInt(process.env.PG_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false,
  },

  // ── Performance tuning for remote Supabase pooler ────────────────────────
  max: 5,                       // Supabase transaction-mode pooler works best with fewer connections
  idleTimeoutMillis: 30_000,    // Release idle connections after 30s (prevents stale connections)
  connectionTimeoutMillis: 10_000, // Fail fast if connection takes >10s
  keepAlive: true,              // Prevent TCP connection drops on idle
  keepAliveInitialDelayMillis: 10_000, // Start keepalive probes after 10s idle
  statement_timeout: 30_000,    // Kill queries running longer than 30s (safety net)
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

export default pool;
