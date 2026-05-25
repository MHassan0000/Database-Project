import { type NextRequest } from "next/server";
import { query } from "@/lib/db";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// GET /api/products/alerts (all authenticated roles)
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = parseInt(searchParams.get("limit") || "5", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 5;

    const lowStockResult = await query(
      "SELECT * FROM products WHERE tenant_id = $1 AND stock > 0 AND stock <= COALESCE(reorder_point, 10) ORDER BY stock ASC, id DESC LIMIT $2",
      [auth.user.tenant_id, limit]
    );

    const outOfStockResult = await query(
      "SELECT * FROM products WHERE tenant_id = $1 AND stock = 0 ORDER BY id DESC LIMIT $2",
      [auth.user.tenant_id, limit]
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
