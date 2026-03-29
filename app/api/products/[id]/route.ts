import { type NextRequest } from "next/server";
import { query, initializeDatabase } from "@/lib/db";

// GET /api/products/[id] — fetch a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
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

// PUT /api/products/[id] — update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const body = await request.json();
    const { name, description, price, category, stock, brand, rating, image_url, sku } =
      body;

    if (!name || name.trim() === "") {
      return Response.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return Response.json(
        { error: "Valid price is required" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, category = $4,
           stock = $5, brand = $6, rating = $7, image_url = $8, sku = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        name.trim(),
        description || "",
        Number(price),
        category || "Uncategorized",
        Number(stock) || 0,
        brand || "",
        Number(rating) || 0,
        image_url || "",
        sku || "",
        parseInt(id),
      ]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return Response.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;

    const result = await query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
