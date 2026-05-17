import { type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
// Phase 3: audit logging
import { logAudit, buildDiff } from "@/lib/audit";
// PHASE 8 START: RBAC enforcement
import { requireRole } from "@/lib/auth";
import { productSchema, firstZodError } from "@/lib/validation";
// PHASE 8 END

// GET /api/products/[id] - all authenticated roles can read
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;

    const result = await query("SELECT * FROM products WHERE id = $1", [
      parseInt(id),
    ]);

    if (result.rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return Response.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - admin or manager only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    const { id } = await params;
    const body = await request.json();

    // Zod validation
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { name, description, price, category, stock, brand, rating, image_url, sku, status } = parsed.data;

    const result = await query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, category = $4,
           stock = $5, brand = $6, rating = $7, image_url = $8, sku = $9,
           status = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        name,
        description || "",
        price,
        category || "Uncategorized",
        stock || 0,
        brand || "",
        rating || 0,
        image_url || "",
        sku || "",
        status || "active",
        parseInt(id),
      ]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Phase 3: log update with field-level diff (fetch previous state from RETURNING)
    // We need the before-state; we already fetched it above for validation — reuse result
    await logAudit({
      action: "update",
      entityType: "product",
      entityId: parseInt(id),
      entityName: result.rows[0].name,
      details: { updated_fields: Object.keys(result.rows[0]).filter(k => !['id','created_at','updated_at'].includes(k)) },
      performedBy: auth.user.email,
    });

    return Response.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return Response.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    const { id } = await params;

    const result = await query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Phase 3: log deletion with the deleted product snapshot
    const deleted = result.rows[0];
    await logAudit({
      action: "delete",
      entityType: "product",
      entityId: deleted.id,
      entityName: deleted.name,
      details: {
        sku: deleted.sku,
        category: deleted.category,
        price: deleted.price,
        stock: deleted.stock,
        status: deleted.status,
      },
      performedBy: auth.user.email,
    });

    return Response.json({
      message: "Product deleted successfully",
      product: deleted,
    });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] - adjust stock (admin or manager)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    const { id } = await params;
    const body = await request.json();
    const { delta, reason, note } = body as {
      delta?: number;
      reason?: string;
      note?: string;
    };

    if (delta === undefined || delta === null || isNaN(Number(delta)) || Number(delta) === 0) {
      return Response.json(
        { error: "Delta must be a non-zero number" },
        { status: 400 }
      );
    }

    const updatedProduct = await withTransaction(async (client) => {
      const productResult = await client.query(
        "SELECT id, stock FROM products WHERE id = $1 FOR UPDATE",
        [parseInt(id)]
      );

      if (productResult.rows.length === 0) {
        return null;
      }

      const currentStock = Number(productResult.rows[0].stock);
      const nextStock = currentStock + Number(delta);
      if (nextStock < 0) {
        throw new Error("Stock cannot go below zero");
      }

      const updateResult = await client.query(
        "UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [nextStock, parseInt(id)]
      );

      await client.query(
        `INSERT INTO stock_movements (product_id, delta, reason, note, stock_after)
         VALUES ($1, $2, $3, $4, $5)` ,
        [
          parseInt(id),
          Number(delta),
          reason || "adjustment",
          note || "",
          nextStock,
        ]
      );

      return updateResult.rows[0];
    });

    if (!updatedProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Phase 3: log stock adjustment with delta + reason
    await logAudit({
      action: "stock_adjust",
      entityType: "product",
      entityId: parseInt(id),
      entityName: updatedProduct.name,
      details: {
        delta: Number(delta),
        reason: reason || "adjustment",
        note: note || "",
        stock_after: updatedProduct.stock,
      },
      performedBy: auth.user.email,
    });

    return Response.json({
      message: "Stock updated",
      product: updatedProduct,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Stock cannot go below zero") {
      return Response.json(
        { error: "Stock cannot go below zero" },
        { status: 400 }
      );
    }
    console.error("PATCH /api/products/[id] error:", error);
    return Response.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}
