import { type NextRequest } from "next/server";
import { query } from "@/lib/db";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

const exportColumns = [
  "id",
  "name",
  "description",
  "price",
  "category",
  "stock",
  "brand",
  "rating",
  "image_url",
  "sku",
  "status",
  "created_at",
  "updated_at",
];

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

// GET /api/products/export - export filtered products as CSV (admin/manager only)
export async function GET(request: NextRequest) {
  // PHASE 8 START
  const auth = await requireRole(request, ["admin", "manager"]);
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

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (category && category !== "all") {
      conditions.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    if (status && status !== "all") {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
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

    if (search) {
      conditions.push(
        `to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(sku, '')) @@ plainto_tsquery('simple', $${paramIndex})`
      );
      values.push(search);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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

    const productsResult = await query(
      `SELECT * FROM products ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder}`,
      values
    );

    const rows = productsResult.rows.map((row) =>
      exportColumns.map((col) => escapeCsv(row[col])).join(",")
    );

    const csv = [exportColumns.join(","), ...rows].join("\n");
    const fileName = `products-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    console.error("GET /api/products/export error:", error);
    return Response.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
}
