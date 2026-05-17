// Phase 5 — app/api/analytics/velocity/route.ts
// GET /api/analytics/velocity?period=30d&limit=10 (all authenticated roles)

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
    const period = searchParams.get("period") ?? "30d";
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);
    const days   = PERIOD_MAP[period] ?? 30;

    // Top movers: products with most movement in period
    const moversResult = await query(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.category,
         p.stock                                                AS current_stock,
         p.price,
         COUNT(sm.id)                                          AS movements,
         SUM(CASE WHEN sm.delta > 0 THEN sm.delta ELSE 0 END)  AS inbound,
         SUM(CASE WHEN sm.delta < 0 THEN ABS(sm.delta) ELSE 0 END) AS outbound,
         SUM(ABS(sm.delta))                                    AS total_units
       FROM products p
       JOIN stock_movements sm ON sm.product_id = p.id
       WHERE sm.created_at >= NOW() - ($1 || ' days')::INTERVAL
         AND p.status = 'active'
       GROUP BY p.id, p.name, p.sku, p.category, p.stock, p.price
       ORDER BY total_units DESC
       LIMIT $2`,
      [days, limit]
    );

    // Dead stock: stocked products with no movement in period
    const deadResult = await query(
      `SELECT
         p.id, p.name, p.sku, p.category,
         p.stock AS current_stock, p.price
       FROM products p
       WHERE p.status = 'active'
         AND p.stock > 0
         AND p.id NOT IN (
           SELECT DISTINCT product_id FROM stock_movements
           WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
         )
       ORDER BY p.stock DESC
       LIMIT 10`,
      [days]
    );

    return NextResponse.json({
      period,
      limit,
      topMovers: moversResult.rows.map((r) => ({
        id:            Number(r.id),
        name:          r.name,
        sku:           r.sku ?? "",
        category:      r.category ?? "",
        current_stock: Number(r.current_stock),
        price:         Number(r.price),
        movements:     Number(r.movements),
        inbound:       Number(r.inbound),
        outbound:      Number(r.outbound),
        total_units:   Number(r.total_units),
      })),
      deadStock: deadResult.rows.map((r) => ({
        id:            Number(r.id),
        name:          r.name,
        sku:           r.sku ?? "",
        category:      r.category ?? "",
        current_stock: Number(r.current_stock),
        price:         Number(r.price),
      })),
    });
  } catch (error) {
    console.error("GET /api/analytics/velocity error:", error);
    return NextResponse.json({ error: "Failed to load velocity data" }, { status: 500 });
  }
}
// PHASE 5 IMPLEMENTATION END
