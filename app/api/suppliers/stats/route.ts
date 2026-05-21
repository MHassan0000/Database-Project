// Phase 2 — app/api/suppliers/stats/route.ts
// GET /api/suppliers/stats — supplier KPI metrics (admin/manager)

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
// PHASE 8 FIX START: RBAC guard
import { requireRole } from "@/lib/auth";
// PHASE 8 FIX END

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {

    // Total supplier count by status
    const countResult = await query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'active')   AS active,
         COUNT(*) FILTER (WHERE status = 'inactive') AS inactive
       FROM suppliers
       WHERE tenant_id = $1`,
      [auth.user.tenant_id]
    );

    // Average lead time across all product-supplier links
    const leadTimeResult = await query(
      `SELECT ROUND(AVG(lead_days), 1) AS avg_lead_days
       FROM product_suppliers
       WHERE tenant_id = $1`,
      [auth.user.tenant_id]
    );

    // Top 5 suppliers by number of linked products
    const topSuppliersResult = await query(
      `SELECT
         s.id,
         s.name,
         s.status,
         s.rating,
         COUNT(ps.product_id) AS linked_products
       FROM suppliers s
       LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id AND ps.tenant_id = s.tenant_id
       WHERE s.tenant_id = $1
       GROUP BY s.id
       ORDER BY linked_products DESC
       LIMIT 5`,
      [auth.user.tenant_id]
    );

    // Average supplier rating
    const ratingResult = await query(
      `SELECT ROUND(AVG(rating), 2) AS avg_rating FROM suppliers WHERE tenant_id = $1`,
      [auth.user.tenant_id]
    );

    const stats = countResult.rows[0];

    return NextResponse.json({
      total:          parseInt(stats.total, 10),
      active:         parseInt(stats.active, 10),
      inactive:       parseInt(stats.inactive, 10),
      avgLeadDays:    parseFloat(leadTimeResult.rows[0]?.avg_lead_days) || 0,
      avgRating:      parseFloat(ratingResult.rows[0]?.avg_rating) || 0,
      topSuppliers:   topSuppliersResult.rows,
    });
  } catch (error) {
    console.error("GET /api/suppliers/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier stats" },
      { status: 500 }
    );
  }
}
