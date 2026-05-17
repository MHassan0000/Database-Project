import { type NextRequest } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// GET /api/stock - stock movement ledger (admin/manager/viewer)
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const countResult = await query("SELECT COUNT(*) FROM stock_movements");
    const total = parseInt(countResult.rows[0].count);

    const movementsResult = await query(
      `SELECT sm.*, p.name as product_name, p.sku, p.brand, p.category, p.status
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ORDER BY sm.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const netDeltaResult = await query(
      "SELECT COALESCE(SUM(delta), 0) as net_delta FROM stock_movements"
    );

    return Response.json({
      movements: movementsResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      netDelta: Number(netDeltaResult.rows[0].net_delta),
    });
  } catch (error) {
    console.error("GET /api/stock error:", error);
    return Response.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
