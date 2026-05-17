// Phase 5 — app/api/analytics/trends/route.ts
// GET /api/analytics/trends?period=30d&groupBy=day (all authenticated roles)

import { NextRequest, NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
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
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const period  = searchParams.get("period")  ?? "30d";
    const groupBy = searchParams.get("groupBy") ?? "day";
    const days    = PERIOD_MAP[period] ?? 30;

    if (groupBy === "week") {
      const result = await query(
        `SELECT
           DATE_TRUNC('week', created_at)::DATE               AS date,
           SUM(CASE WHEN delta > 0 THEN delta  ELSE 0   END)  AS inbound,
           SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END) AS outbound,
           COUNT(*)                                            AS movements
         FROM stock_movements
         WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY DATE_TRUNC('week', created_at)
         ORDER BY date ASC`,
        [days]
      );
      return NextResponse.json({ period, groupBy: "week", data: result.rows });
    }

    // Daily aggregation
    const result = await query(
      `SELECT
         DATE(created_at)                                      AS date,
         SUM(CASE WHEN delta > 0 THEN delta  ELSE 0   END)    AS inbound,
         SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END)  AS outbound,
         COUNT(*)                                              AS movements
       FROM stock_movements
       WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    // Fill missing dates with zeros for a continuous chart
    const rowMap = new Map<string, { inbound: number; outbound: number; movements: number }>();
    for (const row of result.rows) {
      const key = row.date instanceof Date
        ? row.date.toISOString().split("T")[0]
        : String(row.date).split("T")[0];
      rowMap.set(key, {
        inbound:   Number(row.inbound),
        outbound:  Number(row.outbound),
        movements: Number(row.movements),
      });
    }

    const filled: { date: string; inbound: number; outbound: number; movements: number }[] = [];
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = cursor.toISOString().split("T")[0];
      filled.push({ date: key, ...(rowMap.get(key) ?? { inbound: 0, outbound: 0, movements: 0 }) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({ period, groupBy: "day", data: filled });
  } catch (error) {
    console.error("GET /api/analytics/trends error:", error);
    return NextResponse.json({ error: "Failed to load trend data" }, { status: 500 });
  }
}
// PHASE 5 IMPLEMENTATION END
