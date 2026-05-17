// Phase 3 — app/api/audit/route.ts
// GET /api/audit — paginated, filterable audit log (admin and manager only)

import { NextRequest, NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
// PHASE 8 START: audit log is restricted to admin and manager
import { requireRole } from "@/lib/auth";
// PHASE 8 END

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {
    await initializeDatabase();

    const sp = request.nextUrl.searchParams;

    // ── Pagination
    const page   = Math.max(1, parseInt(sp.get("page")  || "1",  10));
    const limit  = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // ── Filters
    const entityType = sp.get("entity_type") || "all";   // product | supplier | purchase_order | all
    const action     = sp.get("action")      || "all";   // create | update | delete | stock_adjust | bulk_update | all
    const search     = sp.get("search")      || "";      // free-text on entity_name / performed_by
    const dateFrom   = sp.get("date_from")   || "";      // ISO date string
    const dateTo     = sp.get("date_to")     || "";      // ISO date string

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (entityType !== "all") {
      conditions.push(`entity_type = $${idx}`);
      params.push(entityType);
      idx++;
    }

    if (action !== "all") {
      conditions.push(`action = $${idx}`);
      params.push(action);
      idx++;
    }

    if (search) {
      conditions.push(
        `(entity_name ILIKE $${idx} OR performed_by ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (dateFrom) {
      conditions.push(`created_at >= $${idx}::timestamptz`);
      params.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      conditions.push(`created_at <= $${idx}::timestamptz`);
      params.push(dateTo);
      idx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_log ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT * FROM audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      logs: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
