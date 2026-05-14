import { type NextRequest } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";

// GET /api/products - fetch all products with optional filters, search, sort, pagination
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minRating = searchParams.get("minRating");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (category && category !== "all") {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    if (minPrice) {
      conditions.push(`price >= $${paramIndex}`);
      values.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      conditions.push(`price <= $${paramIndex}`);
      values.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (minRating) {
      conditions.push(`rating >= $${paramIndex}`);
      values.push(parseFloat(minRating));
      paramIndex++;
    }

    if (status && status !== "all") {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(
        `to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(sku, '')) @@ plainto_tsquery('simple', $${paramIndex})`
      );
      values.push(search);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Whitelist sort columns
    const allowedSortColumns = [
      "name",
      "price",
      "category",
      "stock",
      "brand",
      "rating",
      "status",
      "created_at",
      "updated_at",
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch products
    const productsResult = await query(
      `SELECT * FROM products ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return Response.json({
      products: productsResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return Response.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products - create a new product
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const { name, description, price, category, stock, brand, rating, image_url, sku, status } =
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

    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
      return Response.json(
        { error: "Stock must be a non-negative number" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO products (name, description, price, category, stock, brand, rating, image_url, sku, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        status || "active",
      ]
    );

    // Phase 3: log product creation to audit trail
    await logAudit({
      action: "create",
      entityType: "product",
      entityId: result.rows[0].id,
      entityName: result.rows[0].name,
      details: {
        sku: result.rows[0].sku,
        price: result.rows[0].price,
        stock: result.rows[0].stock,
        category: result.rows[0].category,
        status: result.rows[0].status,
      },
      performedBy: "system",
    });

    return Response.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return Response.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
