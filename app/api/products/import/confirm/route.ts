// Phase 6 — app/api/products/import/confirm/route.ts
// POST /api/products/import/confirm
//
// Receives the validated import rows (from the preview step) and inserts
// every non-error row into the products table inside a single transaction.
// Logs one "import" audit entry summarising the entire batch.

import { type NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { ImportRow } from "@/lib/types";
import type { PoolClient } from "pg";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// PHASE 6 IMPLEMENTATION START

export async function POST(request: NextRequest) {
  // PHASE 8 START: import is admin/manager only
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {

    let body: { rows?: ImportRow[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rows = body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided. Send { rows: [...] } from the preview step." },
        { status: 400 }
      );
    }

    // Only import rows that passed validation
    const importable = rows.filter((r) => r.status !== "error");
    if (importable.length === 0) {
      return NextResponse.json(
        { error: "All rows have validation errors. Fix them and re-upload." },
        { status: 422 }
      );
    }

    const importedIds: number[] = [];
    let   skipped = 0;

    await withTransaction(async (client: PoolClient) => {
      for (const row of importable) {
        try {
          const name        = row.name.trim();
          const price       = parseFloat(row.price)       || 0;
          const stock       = row.stock !== "" ? parseInt(row.stock, 10) : 0;
          const sku         = row.sku.trim()              || null;
          const category    = row.category.trim()         || null;
          const brand       = row.brand.trim()            || null;
          const description = row.description.trim()      || null;
          const rating      = row.rating !== "" ? parseFloat(row.rating) : 0;
          const statusVal   = row.status_val.trim().toLowerCase();
          const productStatus =
            ["active", "draft", "archived"].includes(statusVal) ? statusVal : "active";

          const result = await client.query(
            `INSERT INTO products
               (name, price, stock, sku, category, brand, description, rating, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [name, price, stock, sku, category, brand, description, rating, productStatus]
          );

          importedIds.push(Number(result.rows[0].id));
        } catch (rowErr) {
          // PHASE 6: Row-level failure — skip and count (e.g. unique constraint on SKU)
          console.warn(`[import/confirm] Row ${row.rowNumber} skipped:`, rowErr);
          skipped++;
        }
      }
    });

    const imported = importedIds.length;

    // Audit the entire import batch as one entry
    await logAudit({
      action:     "import",
      entityType: "product",
      entityName: `Batch import (${imported} products)`,
      details: {
        imported,
        skipped,
        errorRows: rows.length - importable.length,
        importedIds,
      },
    });

    return NextResponse.json({
      imported,
      skipped,
      errors: rows.length - importable.length,
      importedIds,
    });
  } catch (error) {
    console.error("POST /api/products/import/confirm error:", error);
    return NextResponse.json({ error: "Failed to execute import" }, { status: 500 });
  }
}

// PHASE 6 IMPLEMENTATION END
