import { query } from "@/lib/db";
import { type NextRequest } from "next/server";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// GET /api/products/stats (all authenticated roles)
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {

    // Run ALL stats queries in PARALLEL — turns 10 round trips into 1
    const [
      totalResult,
      valueResult,
      avgPriceResult,
      avgRatingResult,
      lowStockResult,
      outOfStockResult,
      categoryResult,
      brandResult,
      statusResult,
      topRatedResult,
      recentResult,
      priceRangeResult,
    ] = await Promise.all([
      query("SELECT COUNT(*) as count FROM products"),
      query("SELECT COALESCE(SUM(price * stock), 0) as total_value FROM products"),
      query("SELECT COALESCE(AVG(price), 0) as avg_price FROM products"),
      query("SELECT COALESCE(AVG(rating), 0) as avg_rating FROM products WHERE rating > 0"),
      query("SELECT COUNT(*) as count FROM products WHERE stock <= 10 AND stock > 0"),
      query("SELECT COUNT(*) as count FROM products WHERE stock = 0"),
      query("SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC"),
      query("SELECT brand, COUNT(*) as count FROM products WHERE brand != '' GROUP BY brand ORDER BY count DESC LIMIT 10"),
      query("SELECT status, COUNT(*) as count FROM products GROUP BY status ORDER BY count DESC"),
      query("SELECT * FROM products WHERE rating > 0 ORDER BY rating DESC LIMIT 5"),
      query("SELECT * FROM products ORDER BY created_at DESC LIMIT 5"),
      query("SELECT MIN(price) as min_price, MAX(price) as max_price FROM products"),
    ]);

    const totalProducts = parseInt(totalResult.rows[0].count);
    const totalValue = parseFloat(valueResult.rows[0].total_value);
    const avgPrice = parseFloat(avgPriceResult.rows[0].avg_price);
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating);
    const lowStockCount = parseInt(lowStockResult.rows[0].count);
    const outOfStockCount = parseInt(outOfStockResult.rows[0].count);
    const categoryCounts = categoryResult.rows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    }));
    const brandCounts = brandResult.rows.map((row) => ({
      brand: row.brand,
      count: Number(row.count),
    }));
    const statusCounts = statusResult.rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
    const topRated = topRatedResult.rows;
    const recentlyAdded = recentResult.rows;
    const priceRange = {
      min_price: parseFloat(priceRangeResult.rows[0].min_price) || 0,
      max_price: parseFloat(priceRangeResult.rows[0].max_price) || 0,
    };

    return Response.json({
      totalProducts,
      totalValue,
      avgPrice,
      avgRating,
      lowStockCount,
      outOfStockCount,
      categoryCounts,
      brandCounts,
      statusCounts,
      topRated,
      recentlyAdded,
      priceRange,
    });
  } catch (error) {
    console.error("GET /api/products/stats error:", error);
    return Response.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
