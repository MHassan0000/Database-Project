// Phase 5 — app/api/analytics/value-history/route.ts
// GET /api/analytics/value-history?period=90d (all authenticated roles)

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
// PHASE 8 FIX START: RBAC guard
import { requireRole } from "@/lib/auth";
// PHASE 8 FIX END

const PERIOD_MAP: Record<string, number> = {
  "7d": 7, "14d": 14, "30d": 30, "60d": 60, "90d": 90,
};

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "90d";
    const days   = PERIOD_MAP[period] ?? 90;

    // Per-day value snapshot: last stock_after × price per product per day
    const histResult = await query(
      `WITH ranked AS (
         SELECT
           DATE(sm.created_at)                                 AS snap_date,
           sm.product_id,
           sm.stock_after,
           p.price,
           ROW_NUMBER() OVER (
             PARTITION BY DATE(sm.created_at), sm.product_id
             ORDER BY sm.created_at DESC
           )                                                   AS rn
         FROM stock_movements sm
         JOIN products p ON p.id = sm.product_id AND p.tenant_id = sm.tenant_id
         WHERE sm.tenant_id = $1
           AND sm.created_at >= NOW() - ($2 || ' days')::INTERVAL
       )
       SELECT
         snap_date                                             AS date,
         ROUND(SUM(stock_after * price)::NUMERIC, 2)          AS inventory_value,
         COUNT(DISTINCT product_id)                           AS products_active
       FROM ranked
       WHERE rn = 1
       GROUP BY snap_date
       ORDER BY snap_date ASC`,
      [auth.user.tenant_id, days]
    );

    // Current live total value
    const liveResult = await query(
      `SELECT
         ROUND(SUM(stock * price)::NUMERIC, 2) AS current_value,
         COUNT(*)                               AS product_count
       FROM products
       WHERE tenant_id = $1 AND status = 'active'`,
      [auth.user.tenant_id]
    );

    return NextResponse.json({
      period,
      currentValue: Number(liveResult.rows[0]?.current_value ?? 0),
      productCount: Number(liveResult.rows[0]?.product_count ?? 0),
      data: histResult.rows.map((r) => ({
        // PHASE 5: pg driver returns DATE columns as JS Date objects; use toISOString()
        date: r.date instanceof Date
          ? r.date.toISOString().split("T")[0]
          : String(r.date).split("T")[0],
        inventory_value: Number(r.inventory_value),
        products_active: Number(r.products_active),
      })),
    });
  } catch (error) {
    console.error("GET /api/analytics/value-history error:", error);
    return NextResponse.json({ error: "Failed to load value history" }, { status: 500 });
  }
}
// PHASE 5 IMPLEMENTATION END
