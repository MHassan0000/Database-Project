// Phase 4 — app/api/purchase-orders/[id]/status/route.ts
// PATCH /api/purchase-orders/[id]/status (admin/manager)
// Allowed transitions:
//   draft      → sent | cancelled
//   sent       → cancelled
//   partial    → cancelled
//   received   → (no transitions; terminal state)
//   cancelled  → (no transitions; terminal state)

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PurchaseOrderStatus } from "@/lib/types";
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_TRANSITIONS: Record<string, PurchaseOrderStatus[]> = {
  draft:     ["sent", "cancelled"],
  sent:      ["cancelled"],
  partial:   ["cancelled"],
  received:  [],
  cancelled: [],
};

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

    let body: { status: PurchaseOrderStatus };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { status: newStatus } = body;

    const allowed: PurchaseOrderStatus[] = ["draft", "sent", "partial", "received", "cancelled"];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch existing PO
    const existing = await query(
      `SELECT id, status FROM purchase_orders WHERE id = $1`,
      [poId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const currentStatus = existing.rows[0].status as PurchaseOrderStatus;

    // Validate transition
    const validNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!validNext.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${currentStatus}' to '${newStatus}'.${
            validNext.length ? ` Allowed: ${validNext.join(", ")}` : " No further transitions allowed."
          }`,
        },
        { status: 409 }
      );
    }

    const updated = await query(
      `UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, poId]
    );

    await logAudit({
      action: "update",
      entityType: "purchase_order",
      entityId: poId,
      entityName: `PO #${poId}`,
      details: { old_status: currentStatus, new_status: newStatus },
      performedBy: auth.user.email,
    });

    return NextResponse.json(updated.rows[0]);
  } catch (error) {
    console.error("PATCH /api/purchase-orders/[id]/status error:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order status" },
      { status: 500 }
    );
  }
}
