// Phase 3 — app/api/audit/stats/route.ts
// GET /api/audit/stats — action-type counts, top actors (admin/manager)

import { NextRequest, NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {
    await initializeDatabase();

    // Action counts by type
    const actionCounts = await query(
      `SELECT action, COUNT(*) AS count
       FROM audit_log
       GROUP BY action
       ORDER BY count DESC`
    );

    // Entity type breakdown
    const entityCounts = await query(
      `SELECT entity_type, COUNT(*) AS count
       FROM audit_log
       GROUP BY entity_type
       ORDER BY count DESC`
    );

    // Recent 10 log entries for the activity feed
    const recent = await query(
      `SELECT id, action, entity_type, entity_id, entity_name, performed_by, created_at
       FROM audit_log
       ORDER BY created_at DESC
       LIMIT 10`
    );

    // Total entries
    const totalResult = await query("SELECT COUNT(*) FROM audit_log");
    const total = parseInt(totalResult.rows[0].count, 10);

    // Entries in last 24h
    const last24hResult = await query(
      `SELECT COUNT(*) FROM audit_log
       WHERE created_at >= NOW() - INTERVAL '24 hours'`
    );
    const last24h = parseInt(last24hResult.rows[0].count, 10);

    // Entries in last 7 days
    const last7dResult = await query(
      `SELECT COUNT(*) FROM audit_log
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );
    const last7d = parseInt(last7dResult.rows[0].count, 10);

    // Top performer (most actions)
    const topActorResult = await query(
      `SELECT performed_by, COUNT(*) AS count
       FROM audit_log
       GROUP BY performed_by
       ORDER BY count DESC
       LIMIT 1`
    );

    return NextResponse.json({
      total,
      last24h,
      last7d,
      actionCounts: actionCounts.rows,
      entityCounts: entityCounts.rows,
      recentActivity: recent.rows,
      topActor: topActorResult.rows[0] ?? null,
    });
  } catch (error) {
    console.error("GET /api/audit/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit stats" },
      { status: 500 }
    );
  }
}
