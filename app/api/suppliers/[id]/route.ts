// Phase 2 — app/api/suppliers/[id]/route.ts
// GET    /api/suppliers/[id] — get single supplier with linked products (admin/manager)
// PUT    /api/suppliers/[id] — update supplier (admin/manager)
// DELETE /api/suppliers/[id] — delete supplier (admin only)
// Phase 3: logAudit integrated into PUT and DELETE

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SupplierFormData } from "@/lib/types";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
import { supplierSchema, firstZodError } from "@/lib/validation";
// PHASE 8 END

// ── GET /api/suppliers/[id] ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    const { id } = await params;
    const supplierId = parseInt(id, 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    // Fetch supplier
    const supplierResult = await query(
      `SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2`,
      [supplierId, auth.user.tenant_id]
    );
    if (supplierResult.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Fetch linked products (via product_suppliers junction)
    const productsResult = await query(
      `SELECT
         ps.id AS link_id,
         ps.cost_price,
         ps.lead_days,
         ps.is_primary,
         ps.min_order_qty,
         ps.created_at AS linked_at,
         p.id,
         p.name,
         p.sku,
         p.category,
         p.stock,
         p.price,
         p.status,
         p.brand
       FROM product_suppliers ps
       JOIN products p ON p.id = ps.product_id AND p.tenant_id = ps.tenant_id
       WHERE ps.supplier_id = $1 AND ps.tenant_id = $2
       ORDER BY ps.is_primary DESC, p.name ASC`,
      [supplierId, auth.user.tenant_id]
    );

    return NextResponse.json({
      ...supplierResult.rows[0],
      linked_products: productsResult.rows,
    });
  } catch (error) {
    console.error("GET /api/suppliers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

// ── PUT /api/suppliers/[id] ───────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    const { id } = await params;
    const supplierId = parseInt(id, 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    // Confirm exists
    const existing = await query(
      `SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2`,
      [supplierId, auth.user.tenant_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

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
      `UPDATE suppliers
       SET name=$1, email=$2, phone=$3, address=$4, website=$5,
           contact_person=$6, rating=$7, status=$8, notes=$9
       WHERE id=$10 AND tenant_id = $11
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
        supplierId,
        auth.user.tenant_id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const updated = result.rows[0];

    // Phase 3: log supplier update
    await logAudit({
      action: "update",
      entityType: "supplier",
      entityId: updated.id,
      entityName: updated.name,
      details: {
        status: updated.status,
        rating: updated.rating,
        email: updated.email,
      },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/suppliers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/suppliers/[id] ────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START: delete is admin-only
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    const { id } = await params;
    const supplierId = parseInt(id, 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    // Confirm exists
    const existing = await query(
      `SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2`,
      [supplierId, auth.user.tenant_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Block deletion if this supplier has any non-cancelled purchase orders
    // TODO: purchase_orders table checked here — populated in Phase 4
    const activePOResult = await query(
      `SELECT COUNT(*) FROM purchase_orders
       WHERE supplier_id = $1 AND tenant_id = $2 AND status NOT IN ('cancelled')`,
      [supplierId, auth.user.tenant_id]
    );
    const activePOCount = parseInt(activePOResult.rows[0].count, 10);
    if (activePOCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete supplier: ${activePOCount} active purchase order(s) exist. Cancel or complete them first.`,
        },
        { status: 409 }
      );
    }

    const deleted = await query(
      `DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [supplierId, auth.user.tenant_id]
    );

    if (deleted.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const deletedSupplier = deleted.rows[0];

    // Phase 3: log supplier deletion
    await logAudit({
      action: "delete",
      entityType: "supplier",
      entityId: deletedSupplier.id,
      entityName: deletedSupplier.name,
      details: {
        email: deletedSupplier.email,
        status: deletedSupplier.status,
      },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return NextResponse.json({ deleted: deletedSupplier });
  } catch (error) {
    console.error("DELETE /api/suppliers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
