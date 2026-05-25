import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/products/[id]/suppliers/primary - remove primary supplier link (admin/manager)
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    await query(
      `UPDATE product_suppliers
       SET is_primary = false
       WHERE product_id = $1 AND tenant_id = $2` ,
      [productId, auth.user.tenant_id]
    );

    return NextResponse.json({ message: "Primary supplier removed" });
  } catch (error) {
    console.error("DELETE /api/products/[id]/suppliers/primary error:", error);
    return NextResponse.json(
      { error: "Failed to remove primary supplier" },
      { status: 500 }
    );
  }
}
