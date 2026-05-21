// Phase 5 — app/api/analytics/category-performance/route.ts
// GET /api/analytics/category-performance?period=30d (all authenticated roles)

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
    const days   = PERIOD_MAP[period] ?? 30;

    // Static snapshot per category
    const snapshotResult = await query(
      `SELECT
         COALESCE(p.category, 'Uncategorised')                AS category,
         COUNT(p.id)                                          AS product_count,
         SUM(p.stock)                                         AS total_stock,
         ROUND(SUM(p.stock * p.price)::NUMERIC, 2)           AS total_value,
         ROUND(AVG(p.price)::NUMERIC, 2)                     AS avg_price,
         ROUND(AVG(p.rating)::NUMERIC, 2)                    AS avg_rating
       FROM products p
       WHERE p.tenant_id = $1
         AND p.status = 'active'
       GROUP BY COALESCE(p.category, 'Uncategorised')
       ORDER BY total_value DESC`,
      [auth.user.tenant_id]
    );

    // Movement stats per category for the period
    const movementResult = await query(
      `SELECT
         COALESCE(p.category, 'Uncategorised')                AS category,
         COUNT(sm.id)                                         AS movements,
         SUM(CASE WHEN sm.delta > 0 THEN sm.delta ELSE 0 END) AS inbound,
         SUM(CASE WHEN sm.delta < 0 THEN ABS(sm.delta) ELSE 0 END) AS outbound
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id AND p.tenant_id = sm.tenant_id
       WHERE sm.tenant_id = $1
         AND sm.created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY COALESCE(p.category, 'Uncategorised')`,
      [auth.user.tenant_id, days]
    );

    const mvMap = new Map<string, { movements: number; inbound: number; outbound: number }>();
    for (const row of movementResult.rows) {
      mvMap.set(row.category, {
        movements: Number(row.movements),
        inbound:   Number(row.inbound),
        outbound:  Number(row.outbound),
      });
    }

    const categories = snapshotResult.rows.map((r) => {
      const mv = mvMap.get(r.category) ?? { movements: 0, inbound: 0, outbound: 0 };
      return {
        category:      r.category as string,
        product_count: Number(r.product_count),
        total_stock:   Number(r.total_stock),
        total_value:   Number(r.total_value),
        avg_price:     Number(r.avg_price),
        avg_rating:    Number(r.avg_rating),
        ...mv,
      };
    });

    return NextResponse.json({
      period,
      categories,
      totals: {
        total_value:     categories.reduce((s, c) => s + c.total_value, 0),
        total_products:  categories.reduce((s, c) => s + c.product_count, 0),
        total_movements: categories.reduce((s, c) => s + c.movements, 0),
      },
    });
  } catch (error) {
    console.error("GET /api/analytics/category-performance error:", error);
    return NextResponse.json({ error: "Failed to load category performance" }, { status: 500 });
  }
}
// PHASE 5 IMPLEMENTATION END
