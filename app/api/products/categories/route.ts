import { query, initializeDatabase } from "@/lib/db";
import { type NextRequest } from "next/server";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// GET /api/products/categories (all authenticated roles)
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
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
