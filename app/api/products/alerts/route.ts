import { type NextRequest } from "next/server";
import { query, initializeDatabase } from "@/lib/db";

// GET /api/products/alerts - low stock and out of stock lists
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = parseInt(searchParams.get("limit") || "5", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 5;

    const lowStockResult = await query(
      "SELECT * FROM products WHERE stock > 0 AND stock <= 10 ORDER BY stock ASC, id DESC LIMIT $1",
      [limit]
    );

    const outOfStockResult = await query(
      "SELECT * FROM products WHERE stock = 0 ORDER BY id DESC LIMIT $1",
      [limit]
    );

    return Response.json({
      lowStock: lowStockResult.rows,
      outOfStock: outOfStockResult.rows,
    });
  } catch (error) {
    console.error("GET /api/products/alerts error:", error);
    return Response.json(
      { error: "Failed to fetch stock alerts" },
      { status: 500 }
    );
  }
}
