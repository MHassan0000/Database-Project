// Phase 4 — app/api/purchase-orders/stats/route.ts
// GET /api/purchase-orders/stats (admin/manager/viewer)

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
// PHASE 8 FIX START: RBAC guard
import { requireRole } from "@/lib/auth";
// PHASE 8 FIX END

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {

    // Total PO count
    const totalResult = await query("SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = $1", [auth.user.tenant_id]);
    const total = parseInt(totalResult.rows[0].count, 10);

    // Pending (draft + sent + partial)
    const pendingResult = await query(
      `SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = $1 AND status IN ('draft','sent','partial')`,
      [auth.user.tenant_id]
    );
    const pending = parseInt(pendingResult.rows[0].count, 10);

    // Total value of all non-cancelled POs
    const valueResult = await query(
      `SELECT COALESCE(SUM(total), 0) AS total_value
       FROM purchase_orders WHERE tenant_id = $1 AND status != 'cancelled'`,
      [auth.user.tenant_id]
    );
    const totalValue = parseFloat(valueResult.rows[0].total_value);

    // Received this calendar month
    const receivedThisMonthResult = await query(
      `SELECT COUNT(*) FROM purchase_orders
       WHERE tenant_id = $1 AND status = 'received'
         AND DATE_TRUNC('month', received_date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [auth.user.tenant_id]
    );
    const receivedThisMonth = parseInt(receivedThisMonthResult.rows[0].count, 10);

    // By-status breakdown
    const statusBreakdown = await query(
      `SELECT status, COUNT(*) AS count
       FROM purchase_orders WHERE tenant_id = $1 GROUP BY status ORDER BY count DESC`,
      [auth.user.tenant_id]
    );

    // Top supplier by PO count
    const topSupplierResult = await query(
      `SELECT s.name AS supplier_name, COUNT(*) AS po_count
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       WHERE po.tenant_id = $1
       GROUP BY s.id, s.name
       ORDER BY po_count DESC
       LIMIT 5`,
      [auth.user.tenant_id]
    );

    // Recent 5 POs
    const recentResult = await query(
      `SELECT po.id, po.status, po.total, po.order_date, s.name AS supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
       WHERE po.tenant_id = $1
       ORDER BY po.created_at DESC
       LIMIT 5`,
      [auth.user.tenant_id]
    );

    return NextResponse.json({
      total,
      pending,
      totalValue,
      receivedThisMonth,
      statusBreakdown: statusBreakdown.rows,
      topSuppliers: topSupplierResult.rows,
      recentOrders: recentResult.rows,
    });
  } catch (error) {
    console.error("GET /api/purchase-orders/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order stats" },
      { status: 500 }
    );
  }
}
