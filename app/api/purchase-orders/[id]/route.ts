// Phase 4 — app/api/purchase-orders/[id]/route.ts
// GET    /api/purchase-orders/[id] — single PO with items + supplier (admin/manager)
// PUT    /api/purchase-orders/[id] — update draft PO (admin/manager)
// DELETE /api/purchase-orders/[id] — delete draft PO only (admin only)

import { NextRequest, NextResponse } from "next/server";
import { query, initializeDatabase, withTransaction } from "@/lib/db";
import { PurchaseOrderFormData } from "@/lib/types";
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/purchase-orders/[id] ────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    await initializeDatabase();

    const { id } = await params;
    const poId = parseInt(id, 10);
    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    // PO header with supplier name
    const poResult = await query(
      `SELECT po.*, s.name AS supplier_name, s.email AS supplier_email,
              s.phone AS supplier_phone, s.contact_person AS supplier_contact
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [poId]
    );
    if (poResult.rows.length === 0) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // Line items with product details
    const itemsResult = await query(
      `SELECT poi.*,
              p.name AS product_name,
              p.sku  AS product_sku,
              p.stock AS current_stock,
              p.category AS product_category
       FROM purchase_order_items poi
       JOIN products p ON p.id = poi.product_id
       WHERE poi.order_id = $1
       ORDER BY poi.id ASC`,
      [poId]
    );

    return NextResponse.json({
      ...poResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("GET /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}

// ── PUT /api/purchase-orders/[id] ────────────────────────────────────────────
// Only draft POs may be edited.
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    await initializeDatabase();

    const { id } = await params;
    const poId = parseInt(id, 10);
    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    // Confirm exists and is draft
    const existing = await query(
      `SELECT id, status FROM purchase_orders WHERE id = $1`,
      [poId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    if (existing.rows[0].status !== "draft") {
      return NextResponse.json(
        { error: `Only draft POs can be edited. Current status: ${existing.rows[0].status}` },
        { status: 409 }
      );
    }

    let body: PurchaseOrderFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { supplier_id, expected_date, notes, tax, items } = body;

    // Validation
    if (!supplier_id || isNaN(Number(supplier_id))) {
      return NextResponse.json({ error: "supplier_id is required" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      if (isNaN(qty) || qty < 1) {
        return NextResponse.json({ error: "Item quantity must be at least 1" }, { status: 400 });
      }
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Item unit_price must be >= 0" }, { status: 400 });
      }
    }

    const taxNum = Math.max(0, Number(tax ?? 0));
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0
    );
    const total = subtotal + taxNum;

    const updatedPO = await withTransaction(async (client) => {
      // Update PO header
      const poResult = await client.query(
        `UPDATE purchase_orders
         SET supplier_id=$1, expected_date=$2, notes=$3,
             subtotal=$4, tax=$5, total=$6
         WHERE id=$7
         RETURNING *`,
        [
          Number(supplier_id),
          expected_date || null,
          notes || "",
          subtotal.toFixed(2),
          taxNum.toFixed(2),
          total.toFixed(2),
          poId,
        ]
      );

      // Replace line items
      await client.query(
        `DELETE FROM purchase_order_items WHERE order_id = $1`,
        [poId]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [
            poId,
            Number(item.product_id),
            Number(item.quantity),
            Number(item.unit_price).toFixed(2),
          ]
        );
      }

      return poResult.rows[0];
    });

    await logAudit({
      action: "update",
      entityType: "purchase_order",
      entityId: poId,
      entityName: `PO #${poId}`,
      details: { supplier_id: Number(supplier_id), item_count: items.length, total },
      performedBy: "system",
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error("PUT /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/purchase-orders/[id] ─────────────────────────────────────────
// Only draft POs may be deleted.
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  // PHASE 8 START: delete is admin-only
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    await initializeDatabase();

    const { id } = await params;
    const poId = parseInt(id, 10);
    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    const existing = await query(
      `SELECT id, status FROM purchase_orders WHERE id = $1`,
      [poId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    if (existing.rows[0].status !== "draft") {
      return NextResponse.json(
        { error: `Only draft POs can be deleted. Current status: ${existing.rows[0].status}` },
        { status: 409 }
      );
    }

    const deleted = await query(
      `DELETE FROM purchase_orders WHERE id = $1 RETURNING *`,
      [poId]
    );

    await logAudit({
      action: "delete",
      entityType: "purchase_order",
      entityId: poId,
      entityName: `PO #${poId}`,
      details: { status: "draft" },
      performedBy: "system",
    });

    return NextResponse.json({ deleted: deleted.rows[0] });
  } catch (error) {
    console.error("DELETE /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
