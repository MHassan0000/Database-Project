// Phase 4 — app/api/reorder-suggestions/route.ts
// GET /api/reorder-suggestions (admin/manager)
// Products where stock <= reorder_point, joined with their primary supplier.
// Used by ReorderSuggestions.tsx on the Orders tab.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
// PHASE 8 FIX START: RBAC guard
import { requireRole } from "@/lib/auth";
// PHASE 8 FIX END

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {

    const sp = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50", 10)));

    const result = await query(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.category,
         p.brand,
         p.stock,
         p.reorder_point,
         p.reorder_qty,
         p.status,
         ps.cost_price,
         ps.lead_days,
         s.id   AS supplier_id,
         s.name AS supplier_name,
         s.email AS supplier_email,
         s.phone AS supplier_phone,
         s.status AS supplier_status
       FROM products p
       LEFT JOIN product_suppliers ps
         ON ps.product_id = p.id AND ps.is_primary = true
       LEFT JOIN suppliers s
         ON s.id = ps.supplier_id
       WHERE p.stock <= p.reorder_point
         AND p.status = 'active'
       ORDER BY (p.reorder_point - p.stock) DESC, p.stock ASC
       LIMIT $1`,
      [limit]
    );

    // Compute suggested order quantity: reorder_qty or (reorder_point - stock + reorder_qty)
    const suggestions = result.rows.map((row) => ({
      ...row,
      deficit: Math.max(0, (row.reorder_point ?? 10) - row.stock),
      suggested_qty: row.reorder_qty ?? 50,
      estimated_cost:
        row.cost_price != null
          ? (Number(row.cost_price) * (row.reorder_qty ?? 50)).toFixed(2)
          : null,
    }));

    return NextResponse.json({
      suggestions,
      total: suggestions.length,
    });
  } catch (error) {
    console.error("GET /api/reorder-suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reorder suggestions" },
      { status: 500 }
    );
  }
}
