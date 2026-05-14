import { type NextRequest } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";

// PATCH /api/products/bulk - update status for multiple products
export async function PATCH(request: NextRequest) {
  try {
    await initializeDatabase();
    const body = await request.json();
    const { ids, status } = body as { ids?: number[]; status?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No product ids provided" }, { status: 400 });
    }

    if (!status || !["active", "draft", "archived"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await query(
      "UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::int[])",
      [status, ids]
    );

    // Phase 3: log bulk status update
    await logAudit({
      action: "bulk_update",
      entityType: "product",
      details: { ids, status, count: result.rowCount },
      performedBy: "system",
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

// DELETE /api/products/bulk - delete multiple products
export async function DELETE(request: NextRequest) {
  try {
    await initializeDatabase();
    const body = await request.json();
    const { ids } = body as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No product ids provided" }, { status: 400 });
    }

    const result = await query(
      "DELETE FROM products WHERE id = ANY($1::int[])",
      [ids]
    );

    // Phase 3: log bulk deletion
    await logAudit({
      action: "bulk_delete",
      entityType: "product",
      details: { ids, count: result.rowCount },
      performedBy: "system",
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
