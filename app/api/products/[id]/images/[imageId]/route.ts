// Phase 7 — app/api/products/[id]/images/[imageId]/route.ts
// PATCH  — update alt_text / sort_order / is_primary
// DELETE — remove image record + physical files from disk

import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { promises as fs } from "fs";
import { query, initializeDatabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// PHASE 7 IMPLEMENTATION START

const UPLOADS_DIR = join(process.cwd(), "public", "uploads", "products");

/** Silently delete a file — non-fatal if already gone. */
async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // file may already be deleted — intentionally non-fatal
  }
}

/** Extract filename from a URL like /uploads/products/42_1234567890.webp */
function filenameFromUrl(url: string): string | null {
  const parts = url.split("/");
  return parts[parts.length - 1] || null;
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    await initializeDatabase();
    const { id, imageId } = await params;
    const productId = parseInt(id);
    const imgId     = parseInt(imageId);

    if (isNaN(productId) || isNaN(imgId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Verify image belongs to product
    const imgCheck = await query(
      "SELECT * FROM product_images WHERE id = $1 AND product_id = $2",
      [imgId, productId]
    );
    if (imgCheck.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const current = imgCheck.rows[0];

    const altText   = body.alt_text   !== undefined ? String(body.alt_text)        : current.alt_text;
    const sortOrder = body.sort_order !== undefined ? Number(body.sort_order)       : current.sort_order;
    const isPrimary = body.is_primary !== undefined ? Boolean(body.is_primary)      : current.is_primary;

    // If promoting to primary, clear existing primary first
    if (isPrimary && !current.is_primary) {
      await query(
        "UPDATE product_images SET is_primary = false WHERE product_id = $1",
        [productId]
      );
    }

    const result = await query(
      `UPDATE product_images
       SET alt_text = $1, sort_order = $2, is_primary = $3
       WHERE id = $4 AND product_id = $5
       RETURNING *`,
      [altText, sortOrder, isPrimary, imgId, productId]
    );

    // Audit
    const prodRow = await query("SELECT name FROM products WHERE id = $1", [productId]);
    await logAudit({
      action:     "image_update",
      entityType: "product",
      entityId:   productId,
      entityName: prodRow.rows[0]?.name ?? "Unknown",
      details:    { image_id: imgId, alt_text: altText, sort_order: sortOrder, is_primary: isPrimary },
    });

    return NextResponse.json({ image: result.rows[0] });
  } catch (error) {
    console.error("PATCH /api/products/[id]/images/[imageId] error:", error);
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    await initializeDatabase();
    const { id, imageId } = await params;
    const productId = parseInt(id);
    const imgId     = parseInt(imageId);

    if (isNaN(productId) || isNaN(imgId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    // Fetch image record
    const imgResult = await query(
      "SELECT * FROM product_images WHERE id = $1 AND product_id = $2",
      [imgId, productId]
    );
    if (imgResult.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const img        = imgResult.rows[0];
    const wasPrimary = Boolean(img.is_primary);

    // Delete DB record
    await query("DELETE FROM product_images WHERE id = $1", [imgId]);

    // Delete physical files (non-fatal)
    if (img.url) {
      const fn = filenameFromUrl(img.url);
      if (fn) await safeUnlink(join(UPLOADS_DIR, fn));
    }
    if (img.thumbnail_url) {
      const fn = filenameFromUrl(img.thumbnail_url);
      if (fn) await safeUnlink(join(UPLOADS_DIR, fn));
    }

    // If deleted was primary, auto-promote next image
    if (wasPrimary) {
      const remaining = await query(
        `SELECT id FROM product_images WHERE product_id = $1
         ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
        [productId]
      );
      if (remaining.rows.length > 0) {
        await query(
          "UPDATE product_images SET is_primary = true WHERE id = $1",
          [remaining.rows[0].id]
        );
      }
    }

    // Audit
    const prodRow = await query("SELECT name FROM products WHERE id = $1", [productId]);
    await logAudit({
      action:     "image_delete",
      entityType: "product",
      entityId:   productId,
      entityName: prodRow.rows[0]?.name ?? "Unknown",
      details:    { image_id: imgId, was_primary: wasPrimary },
    });

    return NextResponse.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/products/[id]/images/[imageId] error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}

// PHASE 7 IMPLEMENTATION END
