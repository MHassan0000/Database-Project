// Phase 2 — app/api/suppliers/[id]/products/[productId]/route.ts
// DELETE /api/suppliers/[id]/products/[productId] — unlink product from supplier

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {

    const { id, productId } = await params;
    const supplierId = parseInt(id, 10);
    const productIdNum = parseInt(productId, 10);

    if (isNaN(supplierId) || isNaN(productIdNum)) {
      return NextResponse.json(
        { error: "Invalid supplier ID or product ID" },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM product_suppliers
       WHERE supplier_id = $1 AND product_id = $2 AND tenant_id = $3
       RETURNING *`,
      [supplierId, productIdNum, auth.user.tenant_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Product-supplier link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: result.rows[0] });
  } catch (error) {
    console.error("DELETE /api/suppliers/[id]/products/[productId] error:", error);
    return NextResponse.json(
      { error: "Failed to unlink product from supplier" },
      { status: 500 }
    );
  }
}
