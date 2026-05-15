// Phase 4 — app/api/purchase-orders/stats/route.ts
// GET /api/purchase-orders/stats
// Returns KPI summary: pending count, total PO value, received this month, top supplier

import { NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();

    // Total PO count
    const totalResult = await query("SELECT COUNT(*) FROM purchase_orders");
    const total = parseInt(totalResult.rows[0].count, 10);

    // Pending (draft + sent + partial)
    const pendingResult = await query(
      `SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft','sent','partial')`
    );
    const pending = parseInt(pendingResult.rows[0].count, 10);

    // Total value of all non-cancelled POs
    const valueResult = await query(
      `SELECT COALESCE(SUM(total), 0) AS total_value
       FROM purchase_orders WHERE status != 'cancelled'`
    );
    const totalValue = parseFloat(valueResult.rows[0].total_value);

    // Received this calendar month
    const receivedThisMonthResult = await query(
      `SELECT COUNT(*) FROM purchase_orders
       WHERE status = 'received'
         AND DATE_TRUNC('month', received_date) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    const receivedThisMonth = parseInt(receivedThisMonthResult.rows[0].count, 10);

    // By-status breakdown
    const statusBreakdown = await query(
      `SELECT status, COUNT(*) AS count
       FROM purchase_orders GROUP BY status ORDER BY count DESC`
    );

    // Top supplier by PO count
    const topSupplierResult = await query(
      `SELECT s.name AS supplier_name, COUNT(*) AS po_count
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       GROUP BY s.id, s.name
       ORDER BY po_count DESC
       LIMIT 5`
    );

    // Recent 5 POs
    const recentResult = await query(
      `SELECT po.id, po.status, po.total, po.order_date, s.name AS supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       ORDER BY po.created_at DESC
       LIMIT 5`
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
