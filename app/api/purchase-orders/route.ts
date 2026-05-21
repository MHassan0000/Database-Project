// Phase 4 — app/api/purchase-orders/route.ts
// GET  /api/purchase-orders — paginated list with filters (admin/manager)
// POST /api/purchase-orders — create PO with line items (admin/manager)

import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { PurchaseOrderFormData } from "@/lib/types";
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// ── GET /api/purchase-orders ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    const sp = request.nextUrl.searchParams;

    // Pagination
    const page   = Math.max(1, parseInt(sp.get("page")  || "1",  10));
    const limit  = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Filters
    const status     = sp.get("status")      || "all";
    const supplierId = sp.get("supplier_id") || "";
    const dateFrom   = sp.get("date_from")   || "";
    const dateTo     = sp.get("date_to")     || "";
    const search     = sp.get("search")      || "";

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (status !== "all") {
      conditions.push(`po.status = $${idx}`);
      params.push(status);
      idx++;
    }

    if (supplierId) {
      conditions.push(`po.supplier_id = $${idx}`);
      params.push(parseInt(supplierId, 10));
      idx++;
    }

    if (dateFrom) {
      conditions.push(`po.order_date >= $${idx}::date`);
      params.push(dateFrom);
      idx++;
    }

    if (dateTo) {
      conditions.push(`po.order_date <= $${idx}::date`);
      params.push(dateTo);
      idx++;
    }

    if (search) {
      conditions.push(`(s.name ILIKE $${idx} OR po.notes ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
    const tenantClause = whereClause
      ? `${whereClause} AND po.tenant_id = $${idx}`
      : `WHERE po.tenant_id = $${idx}`;

    const countResult = await query(
      `SELECT COUNT(*) FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       ${tenantClause}`,
      [...params, auth.user.tenant_id]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT
         po.*,
         s.name AS supplier_name,
         COUNT(poi.id) AS item_count
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       LEFT JOIN purchase_order_items poi ON poi.order_id = po.id AND poi.tenant_id = po.tenant_id
       ${tenantClause}
       GROUP BY po.id, s.name
       ORDER BY po.created_at DESC
       LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...params, auth.user.tenant_id, limit, offset]
    );

    return NextResponse.json({
      orders: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/purchase-orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

// ── POST /api/purchase-orders ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    let body: PurchaseOrderFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { supplier_id, expected_date, notes, tax, items } = body;

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!supplier_id || isNaN(Number(supplier_id))) {
      return NextResponse.json({ error: "supplier_id is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    for (const item of items) {
      if (!item.product_id || isNaN(Number(item.product_id))) {
        return NextResponse.json({ error: "Each item must have a valid product_id" }, { status: 400 });
      }
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      if (isNaN(qty) || qty < 1) {
        return NextResponse.json({ error: "Item quantity must be at least 1" }, { status: 400 });
      }
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Item unit_price must be >= 0" }, { status: 400 });
      }
    }

    // Verify supplier exists
    const supplierCheck = await query(
      `SELECT id, name FROM suppliers WHERE id = $1 AND tenant_id = $2`,
      [Number(supplier_id), auth.user.tenant_id]
    );
    if (supplierCheck.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const productIds = Array.from(
      new Set(items.map((item) => Number(item.product_id)))
    );
    const productCheck = await query(
      "SELECT id FROM products WHERE tenant_id = $1 AND id = ANY($2::int[])",
      [auth.user.tenant_id, productIds]
    );
    if (productCheck.rows.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found." }, { status: 404 });
    }

    // Compute totals
    const taxNum = Math.max(0, Number(tax ?? 0));
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0
    );
    const total = subtotal + taxNum;

    // ── Transactional insert ───────────────────────────────────────────────────
    const newPO = await withTransaction(async (client) => {
      // Insert PO header
      const poResult = await client.query(
        `INSERT INTO purchase_orders
           (tenant_id, supplier_id, status, expected_date, notes, subtotal, tax, total)
         VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          auth.user.tenant_id,
          Number(supplier_id),
          expected_date || null,
          notes || "",
          subtotal.toFixed(2),
          taxNum.toFixed(2),
          total.toFixed(2),
        ]
      );
      const po = poResult.rows[0];

      // Insert line items
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items
             (tenant_id, order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            auth.user.tenant_id,
            po.id,
            Number(item.product_id),
            Number(item.quantity),
            Number(item.unit_price).toFixed(2),
          ]
        );
      }

      return po;
    });

    // Audit
    await logAudit({
      action: "create",
      entityType: "purchase_order",
      entityId: newPO.id,
      entityName: `PO #${newPO.id} — ${supplierCheck.rows[0].name}`,
      details: {
        supplier_id: Number(supplier_id),
        supplier_name: supplierCheck.rows[0].name,
        item_count: items.length,
        subtotal,
        tax: taxNum,
        total,
      },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return NextResponse.json(newPO, { status: 201 });
  } catch (error) {
    console.error("POST /api/purchase-orders error:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
