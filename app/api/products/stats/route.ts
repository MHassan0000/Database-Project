import { query, initializeDatabase } from "@/lib/db";

// GET /api/products/stats — fetch statistics and reports
export async function GET() {
  try {
    await initializeDatabase();

    // Total products
    const totalResult = await query("SELECT COUNT(*) as count FROM products");
    const totalProducts = parseInt(totalResult.rows[0].count);

    // Total inventory value
    const valueResult = await query(
      "SELECT COALESCE(SUM(price * stock), 0) as total_value FROM products"
    );
    const totalValue = parseFloat(valueResult.rows[0].total_value);

    // Average price
    const avgPriceResult = await query(
      "SELECT COALESCE(AVG(price), 0) as avg_price FROM products"
    );
    const avgPrice = parseFloat(avgPriceResult.rows[0].avg_price);

    // Average rating
    const avgRatingResult = await query(
      "SELECT COALESCE(AVG(rating), 0) as avg_rating FROM products WHERE rating > 0"
    );
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating);

    // Low stock products (stock <= 10)
    const lowStockResult = await query(
      "SELECT COUNT(*) as count FROM products WHERE stock <= 10 AND stock > 0"
    );
    const lowStockCount = parseInt(lowStockResult.rows[0].count);

    // Out of stock
    const outOfStockResult = await query(
      "SELECT COUNT(*) as count FROM products WHERE stock = 0"
    );
    const outOfStockCount = parseInt(outOfStockResult.rows[0].count);

    // Category distribution
    const categoryResult = await query(
      "SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC"
    );
    const categoryCounts = categoryResult.rows;

    // Brand distribution
    const brandResult = await query(
      "SELECT brand, COUNT(*) as count FROM products WHERE brand != '' GROUP BY brand ORDER BY count DESC LIMIT 10"
    );
    const brandCounts = brandResult.rows;

    // Top rated
    const topRatedResult = await query(
      "SELECT * FROM products WHERE rating > 0 ORDER BY rating DESC LIMIT 5"
    );
    const topRated = topRatedResult.rows;

    // Recently added
    const recentResult = await query(
      "SELECT * FROM products ORDER BY created_at DESC LIMIT 5"
    );
    const recentlyAdded = recentResult.rows;

    // Price range stats
    const priceRangeResult = await query(
      "SELECT MIN(price) as min_price, MAX(price) as max_price FROM products"
    );
    const priceRange = priceRangeResult.rows[0];

    return Response.json({
      totalProducts,
      totalValue,
      avgPrice,
      avgRating,
      lowStockCount,
      outOfStockCount,
      categoryCounts,
      brandCounts,
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
