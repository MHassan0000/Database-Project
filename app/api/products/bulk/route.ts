import { type NextRequest } from "next/server";
import { query } from "@/lib/db";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";
// PHASE 8 START: bulk operations are admin-only
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// PATCH /api/products/bulk - bulk status update (admin only)
export async function PATCH(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    const body = await request.json();
    const { ids, status } = body as { ids?: number[]; status?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No product ids provided" }, { status: 400 });
    }

    if (!status || !["active", "draft", "archived"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await query(
      "UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = ANY($3::int[])",
      [status, auth.user.tenant_id, ids]
    );

    // Phase 3: log bulk status update
    await logAudit({
      action: "bulk_update",
      entityType: "product",
      details: { ids, status, count: result.rowCount },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return Response.json({ updated: result.rowCount });
  } catch (error) {
    console.error("PATCH /api/products/bulk error:", error);
    return Response.json(
      { error: "Failed to update products" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/bulk - admin only
export async function DELETE(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    const body = await request.json();
    const { ids } = body as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No product ids provided" }, { status: 400 });
    }

    const result = await query(
      "DELETE FROM products WHERE tenant_id = $1 AND id = ANY($2::int[])",
      [auth.user.tenant_id, ids]
    );

    // Phase 3: log bulk deletion
    await logAudit({
      action: "bulk_delete",
      entityType: "product",
      details: { ids, count: result.rowCount },
      performedBy: auth.user.email,
      tenantId: auth.user.tenant_id,
    });

    return Response.json({ deleted: result.rowCount });
  } catch (error) {
    console.error("DELETE /api/products/bulk error:", error);
    return Response.json(
      { error: "Failed to delete products" },
      { status: 500 }
    );
  }
}
