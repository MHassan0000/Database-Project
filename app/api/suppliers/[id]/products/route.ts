// Phase 2 — app/api/suppliers/[id]/products/route.ts
// POST /api/suppliers/[id]/products — link a product to this supplier (admin/manager)

import { NextRequest, NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
import { ProductSupplierFormData } from "@/lib/types";
// PHASE 8 FIX START: RBAC guard
import { requireRole } from "@/lib/auth";
// PHASE 8 FIX END

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {
    await initializeDatabase();

    const { id } = await params;
    const supplierId = parseInt(id, 10);
    if (isNaN(supplierId)) {
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    // Confirm supplier exists
    const supplierExists = await query(
      `SELECT id FROM suppliers WHERE id = $1`,
      [supplierId]
    );
    if (supplierExists.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    let body: ProductSupplierFormData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { product_id, cost_price, lead_days, is_primary, min_order_qty } = body;

    // Validation
    if (!product_id || isNaN(Number(product_id))) {
      return NextResponse.json({ error: "Valid product_id is required" }, { status: 400 });
    }
    const costPriceNum = Number(cost_price);
    if (isNaN(costPriceNum) || costPriceNum < 0) {
      return NextResponse.json({ error: "cost_price must be a non-negative number" }, { status: 400 });
    }

    // Confirm product exists
    const productExists = await query(
      `SELECT id FROM products WHERE id = $1`,
      [Number(product_id)]
    );
    if (productExists.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // If setting is_primary=true, unset any existing primary for this product
    if (is_primary) {
      await query(
        `UPDATE product_suppliers SET is_primary = false WHERE product_id = $1`,
        [Number(product_id)]
      );
    }

    // Upsert link (unique constraint on product_id+supplier_id)
    const result = await query(
      `INSERT INTO product_suppliers
         (product_id, supplier_id, cost_price, lead_days, is_primary, min_order_qty)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id, supplier_id) DO UPDATE
         SET cost_price    = EXCLUDED.cost_price,
             lead_days     = EXCLUDED.lead_days,
             is_primary    = EXCLUDED.is_primary,
             min_order_qty = EXCLUDED.min_order_qty
       RETURNING *`,
      [
        Number(product_id),
        supplierId,
        costPriceNum,
        Number(lead_days) || 7,
        is_primary || false,
        Number(min_order_qty) || 1,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/suppliers/[id]/products error:", error);
    return NextResponse.json(
      { error: "Failed to link product to supplier" },
      { status: 500 }
    );
  }
}
