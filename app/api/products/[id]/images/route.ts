// Phase 7 — app/api/products/[id]/images/route.ts
// GET  /api/products/[id]/images — list all images (all roles)
// POST /api/products/[id]/images — upload a new image (admin/manager)

import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import { query, initializeDatabase } from "@/lib/db";
import { logAudit } from "@/lib/audit";
// PHASE 8 START
import { requireRole } from "@/lib/auth";
// PHASE 8 END

// PHASE 7 IMPLEMENTATION START

const UPLOADS_DIR    = join(process.cwd(), "public", "uploads", "products");
const UPLOADS_PREFIX = "/uploads/products";
const MAX_BYTES      = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png",
  "image/webp", "image/gif", "image/avif",
]);

/** Ensure the uploads directory exists (idempotent). */
async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

// ── GET — list images ────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START: all authenticated roles can view images
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    await initializeDatabase();
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const productCheck = await query("SELECT id FROM products WHERE id = $1", [productId]);
    if (productCheck.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await query(
      `SELECT id, product_id, url, thumbnail_url, alt_text, sort_order, is_primary, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
      [productId]
    );

    return NextResponse.json({ images: result.rows });
  } catch (error) {
    console.error("GET /api/products/[id]/images error:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}

// ── POST — upload image ───────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PHASE 8 START: upload is admin/manager only
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  // PHASE 8 END
  try {
    await initializeDatabase();
    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    // Verify product exists
    const productCheck = await query(
      "SELECT id, name FROM products WHERE id = $1",
      [productId]
    );
    if (productCheck.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const productName = productCheck.rows[0].name as string;

    // Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Request must be multipart/form-data with a 'file' field" },
        { status: 400 }
      );
    }

    const file    = formData.get("file");
    const altText = String(formData.get("alt_text") ?? "");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No image file provided. Include a 'file' field in the form data." },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type '${file.type}'. Accepted: JPEG, PNG, WebP, GIF, AVIF.` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB size limit." },
        { status: 400 }
      );
    }

    // Read as Buffer
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filenames
    const ts            = Date.now();
    const filenameFull  = `${productId}_${ts}.webp`;
    const filenameThumb = `${productId}_${ts}_thumb.webp`;
    const fullUrl       = `${UPLOADS_PREFIX}/${filenameFull}`;
    const thumbUrl      = `${UPLOADS_PREFIX}/${filenameThumb}`;

    await ensureUploadsDir();

    // Process images with sharp
    const sharpBase = sharp(inputBuffer);

    // Full: max 800×800, fit inside (no upscaling), WebP quality 85
    const fullBuffer = await sharpBase
      .clone()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Thumbnail: 200×200 cover crop, WebP quality 80
    const thumbBuffer = await sharpBase
      .clone()
      .resize(200, 200, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    // Write both files in parallel
    await Promise.all([
      fs.writeFile(join(UPLOADS_DIR, filenameFull),  fullBuffer),
      fs.writeFile(join(UPLOADS_DIR, filenameThumb), thumbBuffer),
    ]);

    // Determine if this is the first image (auto-set as primary)
    const countResult = await query(
      "SELECT COUNT(*) FROM product_images WHERE product_id = $1",
      [productId]
    );
    const isPrimary = parseInt(countResult.rows[0].count) === 0;

    // If primary, unset any existing primary first
    if (isPrimary) {
      await query(
        "UPDATE product_images SET is_primary = false WHERE product_id = $1",
        [productId]
      );
    }

    // Compute next sort_order
    const sortResult = await query(
      "SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM product_images WHERE product_id = $1",
      [productId]
    );
    const nextSort = parseInt(sortResult.rows[0].max_sort) + 1;

    // Insert record
    const insertResult = await query(
      `INSERT INTO product_images
         (product_id, url, thumbnail_url, alt_text, sort_order, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [productId, fullUrl, thumbUrl, altText, nextSort, isPrimary]
    );

    const created = insertResult.rows[0];

    // Audit log
    await logAudit({
      action:     "image_upload",
      entityType: "product",
      entityId:   productId,
      entityName: productName,
      details:    { image_id: created.id, filename: filenameFull, is_primary: isPrimary },
    });

    return NextResponse.json({ image: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products/[id]/images error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

// PHASE 7 IMPLEMENTATION END
