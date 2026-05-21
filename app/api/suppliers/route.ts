// Phase 2 — app/api/suppliers/route.ts
// GET  /api/suppliers  — paginated list with search, sort, filter (admin/manager)
// POST /api/suppliers  — create a new supplier (admin/manager)
// Phase 3: logAudit integrated into POST

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SupplierFormData } from "@/lib/types";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
import { supplierSchema, firstZodError } from "@/lib/validation";
// PHASE 8 END

// ── GET /api/suppliers ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search")   || "";
    const status   = searchParams.get("status")   || "all";
    const sortBy   = searchParams.get("sortBy")   || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1", 10));
    const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset   = (page - 1) * limit;

    // Whitelist sortable columns to prevent SQL injection
    const allowedSortBy = ["name", "rating", "status", "created_at", "updated_at"];
    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    // Build WHERE clauses dynamically
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(
        `(s.name ILIKE $${paramIdx} OR s.email ILIKE $${paramIdx} OR s.contact_person ILIKE $${paramIdx} OR s.phone ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status !== "all") {
      conditions.push(`s.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const tenantClause = whereClause
      ? `${whereClause} AND s.tenant_id = $${paramIdx}`
      : `WHERE s.tenant_id = $${paramIdx}`;

    // Run count + data queries in PARALLEL
    const [countResult, dataResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM suppliers s ${tenantClause}`,
        [...params, auth.user.tenant_id]
      ),
      query(
        `SELECT
           s.*,
           COUNT(DISTINCT ps.product_id) AS linked_products
         FROM suppliers s
         LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id AND ps.tenant_id = s.tenant_id
         ${tenantClause}
         GROUP BY s.id
         ORDER BY s.${safeSortBy} ${safeSortOrder}
         LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
        [...params, auth.user.tenant_id, limit, offset]
      ),
    ]);
    const total = parseInt(countResult.rows[0].count, 10);

    return NextResponse.json({
      suppliers: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

// ── POST /api/suppliers ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Zod validation
    const parsed = supplierSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { name, email, phone, address, website, contact_person, rating, status, notes } = parsed.data;

    const result = await query(
      `INSERT INTO suppliers
         (tenant_id, name, email, phone, address, website, contact_person, rating, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        auth.user.tenant_id,
        name,
        email    || null,
        phone    || null,
        address  || null,
        website  || null,
        contact_person || null,
        rating,
        status,
        notes || "",
      ]
    );

    const newSupplier = result.rows[0];

    // Phase 3: log supplier creation
    await logAudit({
      action: "create",
      entityType: "supplier",
      entityId: newSupplier.id,
      entityName: newSupplier.name,
      details: {
        email: newSupplier.email,
        status: newSupplier.status,
        rating: newSupplier.rating,
      },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error("POST /api/suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
