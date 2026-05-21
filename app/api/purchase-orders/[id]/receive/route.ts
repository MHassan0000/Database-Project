// Phase 4 — app/api/purchase-orders/[id]/receive/route.ts
// PATCH /api/purchase-orders/[id]/receive
//
// Critical transactional receive flow:
//   1. Validate PO is in 'sent' or 'partial' state
//   2. Validate each received_qty
//   3. withTransaction():
//      a. UPDATE purchase_order_items.received_qty
//      b. UPDATE products.stock += received_qty
//      c. INSERT stock_movements (reason='purchase_order')
//   4. Recompute PO status: if all items fully received → 'received', else → 'partial'
//   5. UPDATE purchase_orders.status (and received_date if fully received)
//   6. Log to audit_log

import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { PurchaseOrderItemReceive } from "@/lib/types";
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    const { id } = await params;
    const poId = parseInt(id, 10);
    if (isNaN(poId)) {
      return NextResponse.json({ error: "Invalid PO ID" }, { status: 400 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: { items: PurchaseOrderItemReceive[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { items } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required with at least one entry" },
        { status: 400 }
      );
    }

    // ── Validate PO status ────────────────────────────────────────────────────
    const poResult = await query(
      `SELECT po.*, s.name AS supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       WHERE po.id = $1 AND po.tenant_id = $2`,
      [poId, auth.user.tenant_id]
    );
    if (poResult.rows.length === 0) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const po = poResult.rows[0];
    if (!["sent", "partial"].includes(po.status)) {
      return NextResponse.json(
        {
          error: `Can only receive a 'sent' or 'partial' PO. Current status: ${po.status}`,
        },
        { status: 409 }
      );
    }

    // ── Validate all item_ids belong to this PO ───────────────────────────────
    const existingItems = await query(
      `SELECT poi.*, p.name AS product_name, p.stock AS current_stock
       FROM purchase_order_items poi
       JOIN products p ON p.id = poi.product_id AND p.tenant_id = poi.tenant_id
       WHERE poi.order_id = $1 AND poi.tenant_id = $2`,
      [poId, auth.user.tenant_id]
    );
    const existingMap = new Map(existingItems.rows.map((r) => [r.id, r]));

    for (const recv of items) {
      if (!existingMap.has(recv.item_id)) {
        return NextResponse.json(
          { error: `Item ID ${recv.item_id} does not belong to PO #${poId}` },
          { status: 400 }
        );
      }
      const existing = existingMap.get(recv.item_id)!;
      const remaining = existing.quantity - existing.received_qty;
      if (isNaN(recv.received_qty) || recv.received_qty < 0) {
        return NextResponse.json(
          { error: `received_qty must be >= 0 for item ${recv.item_id}` },
          { status: 400 }
        );
      }
      if (recv.received_qty > remaining) {
        return NextResponse.json(
          {
            error: `Cannot receive ${recv.received_qty} for item ${recv.item_id} — only ${remaining} remaining (ordered ${existing.quantity}, already received ${existing.received_qty})`,
          },
          { status: 400 }
        );
      }
    }

    // ── Execute transaction ───────────────────────────────────────────────────
    await withTransaction(async (client) => {
      for (const recv of items) {
        if (recv.received_qty === 0) continue;

        const item = existingMap.get(recv.item_id)!;

        // 1. Update received_qty on item
        await client.query(
          `UPDATE purchase_order_items
           SET received_qty = received_qty + $1
           WHERE id = $2 AND tenant_id = $3`,
          [recv.received_qty, recv.item_id, auth.user.tenant_id]
        );

        // 2. Update product stock
        const stockResult = await client.query(
          `UPDATE products
           SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND tenant_id = $3
           RETURNING stock`,
          [recv.received_qty, item.product_id, auth.user.tenant_id]
        );
        const newStock = stockResult.rows[0]?.stock ?? 0;

        // 3. Insert stock movement
        await client.query(
          `INSERT INTO stock_movements
             (tenant_id, product_id, delta, reason, note, stock_after)
           VALUES ($1, $2, $3, 'purchase_order', $4, $5)`,
          [
            auth.user.tenant_id,
            item.product_id,
            recv.received_qty,
            `PO #${poId} — ${po.supplier_name}`,
            newStock,
          ]
        );
      }

      // 4. Recompute PO status
      const itemsCheck = await client.query(
        `SELECT quantity, received_qty FROM purchase_order_items WHERE order_id = $1 AND tenant_id = $2`,
        [poId, auth.user.tenant_id]
      );

      const allReceived = itemsCheck.rows.every(
        (r) => Number(r.received_qty) >= Number(r.quantity)
      );
      const anyReceived = itemsCheck.rows.some(
        (r) => Number(r.received_qty) > 0
      );

      const newStatus = allReceived ? "received" : anyReceived ? "partial" : po.status;

      // 5. Update PO status and received_date.
      // Split into two separate queries to avoid PostgreSQL error 42P08
      // ($1 cannot be used as both character varying and text in the same statement).
      if (newStatus === "received") {
          await client.query(
            `UPDATE purchase_orders
             SET status = $1, received_date = CURRENT_DATE
             WHERE id = $2 AND tenant_id = $3`,
            [newStatus, poId, auth.user.tenant_id]
          );
      } else {
        await client.query(
          `UPDATE purchase_orders SET status = $1 WHERE id = $2 AND tenant_id = $3`,
          [newStatus, poId, auth.user.tenant_id]
        );
      }
    });

    // 6. Fetch final state of PO to return
    const finalPO = await query(
      `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       WHERE po.id = $1 AND po.tenant_id = $2`,
      [poId, auth.user.tenant_id]
    );

    // Audit log
    const totalReceived = items.reduce((sum, r) => sum + r.received_qty, 0);
    await logAudit({
      action: "receive_po",
      entityType: "purchase_order",
      entityId: poId,
      entityName: `PO #${poId} — ${po.supplier_name}`,
      details: {
        items_received: items.length,
        total_units_received: totalReceived,
        new_status: finalPO.rows[0].status,
      },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return NextResponse.json({
      message: "Stock received successfully",
      order: finalPO.rows[0],
    });
  } catch (error) {
    console.error("PATCH /api/purchase-orders/[id]/receive error:", error);
    return NextResponse.json(
      { error: "Failed to receive purchase order" },
      { status: 500 }
    );
  }
}
