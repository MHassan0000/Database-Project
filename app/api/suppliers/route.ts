// Phase 2 — app/api/suppliers/route.ts
// GET  /api/suppliers  — paginated list with search, sort, filter
// POST /api/suppliers  — create a new supplier
// Phase 3: logAudit integrated into POST

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initializeDatabase } from "@/lib/db";
import { SupplierFormData } from "@/lib/types";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";

// ── GET /api/suppliers ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

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

    // Count query for pagination
    const countResult = await query(
      `SELECT COUNT(*) FROM suppliers s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query — also fetch linked product count per supplier
    const dataResult = await query(
      `SELECT
         s.*,
         COUNT(DISTINCT ps.product_id) AS linked_products
       FROM suppliers s
       LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

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
  try {
    await initializeDatabase();

    let body: SupplierFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, email, phone, address, website, contact_person, rating, status, notes } = body;

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }
    if (name.trim().length > 255) {
      return NextResponse.json({ error: "Supplier name must be 255 characters or fewer" }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    const ratingNum = rating !== undefined && rating !== "" ? Number(rating) : 0;
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      return NextResponse.json({ error: "Rating must be between 0 and 5" }, { status: 400 });
    }
    const allowedStatuses = ["active", "inactive"];
    const safeStatus = allowedStatuses.includes(status || "") ? status : "active";

    const result = await query(
      `INSERT INTO suppliers
         (name, email, phone, address, website, contact_person, rating, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name.trim(),
        email    || null,
        phone    || null,
        address  || null,
        website  || null,
        contact_person || null,
        ratingNum,
        safeStatus,
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
      performedBy: "system",
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
