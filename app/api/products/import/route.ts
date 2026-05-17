// Phase 6 — app/api/products/import/route.ts
// GET  /api/products/import/template — returns a downloadable CSV template file
// POST /api/products/import          — parses + validates a CSV upload, returns preview

import { type NextRequest, NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";

// PHASE 6 IMPLEMENTATION START

// ── CSV template ─────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "name", "price", "stock", "sku", "category",
  "brand", "description", "rating", "status",
];

const TEMPLATE_EXAMPLE_ROWS = [
  ["Wireless Mouse", "29.99", "100", "WM-001", "Electronics", "TechBrand", "Ergonomic wireless mouse with 2.4GHz", "4.5", "active"],
  ["Office Chair", "199.99", "25",  "OC-005", "Furniture",   "ErgoComfort", "Adjustable lumbar support chair",      "4.2", "active"],
  ["USB-C Hub 7-Port", "49.99", "50", "", "Electronics", "", "Multi-port USB-C hub with HDMI", "4.0", "draft"],
];

function buildTemplate(): string {
  const lines = [TEMPLATE_HEADERS.join(",")];
  for (const row of TEMPLATE_EXAMPLE_ROWS) {
    // Quote fields that may contain commas
    lines.push(row.map((f) => (f.includes(",") ? `"${f}"` : f)).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

// ── Lightweight CSV parser ────────────────────────────────────────────────────
// Handles quoted fields, embedded commas, escaped quotes, CRLF + LF line endings.
// Avoids external dependency (csv-parse) for simplicity and zero-dep robustness.

function parseCSVText(text: string): string[][] {
  // Remove UTF-8 BOM if present
  const content = text.startsWith("\uFEFF") ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch   = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped double-quote inside quoted field
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
      } else if (ch === "\r" && next === "\n") {
        row.push(field.trim());
        rows.push(row);
        row   = [];
        field = "";
        i++; // skip \n
      } else if (ch === "\n" || ch === "\r") {
        row.push(field.trim());
        rows.push(row);
        row   = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  // Last field / row
  if (field !== "" || row.length > 0) {
    row.push(field.trim());
    // Skip completely empty trailing rows
    if (row.some((f) => f !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(["active", "draft", "archived"]);

interface ParsedRow {
  rowNumber:   number;
  status:      "valid" | "error" | "warning";
  name:        string;
  price:       string;
  stock:       string;
  sku:         string;
  category:    string;
  brand:       string;
  description: string;
  rating:      string;
  status_val:  string;
  errors:      string[];
  warnings:    string[];
}

function validateRow(
  raw:          Record<string, string>,
  rowNumber:    number,
  existingSkus: Set<string>,
  batchSkus:    Set<string>
): ParsedRow {
  const errors:   string[] = [];
  const warnings: string[] = [];

  const name       = raw["name"]        ?? "";
  const priceStr   = raw["price"]       ?? "";
  const stockStr   = raw["stock"]       ?? "";
  const sku        = raw["sku"]         ?? "";
  const category   = raw["category"]   ?? "";
  const brand      = raw["brand"]       ?? "";
  const description = raw["description"] ?? "";
  const ratingStr  = raw["rating"]      ?? "";
  const statusVal  = raw["status"]      ?? "";

  // name — required, max 255
  if (!name) {
    errors.push("name is required");
  } else if (name.length > 255) {
    errors.push("name must be 255 characters or fewer");
  }

  // price — required, numeric, >= 0
  if (!priceStr) {
    errors.push("price is required");
  } else {
    const price = parseFloat(priceStr);
    if (isNaN(price))        errors.push("price must be a valid number");
    else if (price < 0)      errors.push("price must be >= 0");
  }

  // stock — optional, integer, >= 0
  if (stockStr !== "") {
    const stock = parseInt(stockStr, 10);
    if (isNaN(stock) || String(stock) !== stockStr.trim())
      errors.push("stock must be a whole number");
    else if (stock < 0)
      errors.push("stock must be >= 0");
  }

  // sku — optional, must be unique (within DB + this batch)
  if (sku) {
    if (existingSkus.has(sku.toLowerCase())) {
      errors.push(`sku "${sku}" already exists in the database`);
    } else if (batchSkus.has(sku.toLowerCase())) {
      errors.push(`sku "${sku}" appears more than once in this file`);
    } else {
      batchSkus.add(sku.toLowerCase());
    }
  }

  // rating — optional, 0-5
  if (ratingStr !== "") {
    const rating = parseFloat(ratingStr);
    if (isNaN(rating))      errors.push("rating must be a valid number");
    else if (rating < 0 || rating > 5) errors.push("rating must be between 0 and 5");
  }

  // status — optional, must be valid if provided
  if (statusVal !== "" && !VALID_STATUSES.has(statusVal.toLowerCase())) {
    errors.push(`status must be one of: active, draft, archived (got "${statusVal}")`);
  }

  // Warnings
  if (!category)  warnings.push("category is empty; product will be uncategorised");
  if (!brand)     warnings.push("brand is empty");

  const rowStatus: "valid" | "error" | "warning" =
    errors.length   > 0 ? "error"   :
    warnings.length > 0 ? "warning" : "valid";

  return {
    rowNumber,
    status:      rowStatus,
    name,
    price:       priceStr,
    stock:       stockStr,
    sku,
    category,
    brand,
    description,
    rating:      ratingStr,
    status_val:  statusVal,
    errors,
    warnings,
  };
}

// ── GET — download CSV template ───────────────────────────────────────────────

export async function GET() {
  // PHASE 6: returns a ready-to-fill CSV template
  const csv = buildTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="product_import_template.csv"',
    },
  });
}

// ── POST — parse CSV and return validation preview ────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    // Accept multipart/form-data with field named "file"
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Request must be multipart/form-data with a 'file' field" },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No CSV file provided. Include a 'file' field in the form data." },
        { status: 400 }
      );
    }

    // Size guard: 5 MB max
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 5 MB." },
        { status: 400 }
      );
    }

    const text = await file.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    const allRows = parseCSVText(text);
    if (allRows.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row." },
        { status: 400 }
      );
    }

    // Normalise header names (lowercase, trim)
    const rawHeaders = allRows[0].map((h) => h.toLowerCase().trim());
    const dataRows   = allRows.slice(1);

    // Verify required header columns exist
    const requiredHeaders = ["name", "price"];
    const missingHeaders  = requiredHeaders.filter((h) => !rawHeaders.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `CSV is missing required columns: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    // Load all existing SKUs from DB for uniqueness check
    const skuResult   = await query("SELECT LOWER(sku) AS sku FROM products WHERE sku IS NOT NULL AND sku <> ''");
    const existingSkus = new Set<string>(skuResult.rows.map((r: { sku: string }) => r.sku));
    const batchSkus    = new Set<string>();

    // Parse + validate every row
    const parsedRows: ParsedRow[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i];
      // Map columns to field names by header position
      const raw: Record<string, string> = {};
      for (let j = 0; j < rawHeaders.length; j++) {
        raw[rawHeaders[j]] = cells[j] ?? "";
      }
      // Skip entirely blank rows
      if (Object.values(raw).every((v) => v === "")) continue;

      parsedRows.push(validateRow(raw, i + 1, existingSkus, batchSkus));
    }

    const validRows   = parsedRows.filter((r) => r.status !== "error").length;
    const errorRows   = parsedRows.filter((r) => r.status === "error").length;
    const warningRows = parsedRows.filter((r) => r.status === "warning").length;

    return NextResponse.json({
      totalRows:  parsedRows.length,
      validRows,
      errorRows,
      warningRows,
      rows:       parsedRows,
    });
  } catch (error) {
    console.error("POST /api/products/import error:", error);
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 });
  }
}

// PHASE 6 IMPLEMENTATION END
