import { query, initializeDatabase } from "@/lib/db";

// GET /api/products/categories — fetch all unique categories
export async function GET() {
  try {
    await initializeDatabase();

    const result = await query(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC"
    );

    const categories = result.rows.map(
      (row: { category: string }) => row.category
    );

    return Response.json(categories);
  } catch (error) {
    console.error("GET /api/products/categories error:", error);
    return Response.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
