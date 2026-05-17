import { type NextRequest } from "next/server";
import { query } from "@/lib/db";
// Phase 3: audit logging
import { logAudit } from "@/lib/audit";
// PHASE 8 START: role-based access control
import { requireRole } from "@/lib/auth";
import { productSchema, firstZodError } from "@/lib/validation";
// PHASE 8 END

// GET /api/products - fetch all products (all authenticated roles)
export async function GET(request: NextRequest) {
  // PHASE 8 START: require authenticated session (any role)
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

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
      // FIX: use ILIKE for substring matching so partial SKU searches (e.g. "REG-U")
      // work correctly. plainto_tsquery was splitting on hyphens and breaking SKU search.
      const likePattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
      conditions.push(
        `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR brand ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      values.push(likePattern);
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
    // PHASE 7 IMPLEMENTATION START — include primary image fields via correlated subqueries
    const productsResult = await query(
      `SELECT p.*,
              (SELECT pi.url FROM product_images pi
               WHERE pi.product_id = p.id AND pi.is_primary = true
               ORDER BY pi.sort_order ASC LIMIT 1) AS primary_image_url,
              (SELECT pi.thumbnail_url FROM product_images pi
               WHERE pi.product_id = p.id AND pi.is_primary = true
               ORDER BY pi.sort_order ASC LIMIT 1) AS primary_thumbnail_url
       FROM products p ${whereClause} ORDER BY p.${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );
    // PHASE 7 IMPLEMENTATION END

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

// POST /api/products - create a new product (admin or manager only)
export async function POST(request: NextRequest) {
  // PHASE 8 START: require admin or manager role
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

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
      `INSERT INTO products (name, description, price, category, stock, brand, rating, image_url, sku, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      // PHASE 8: use authenticated user's email for audit trail
      performedBy: auth.user.email,
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
