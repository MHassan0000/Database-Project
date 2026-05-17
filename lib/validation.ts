// ─────────────────────────────────────────────────────────────────────────────
// lib/validation.ts — Centralized Zod schemas for all forms & API routes
// Shared across client (form validation) and server (API request validation).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Coerce a string-or-number field to a number, defaulting to fallback. */
const coerceNum = (fallback: number) =>
  z.union([z.string(), z.number()])
    .transform((v) => (v === "" || v === undefined ? fallback : Number(v)))
    .pipe(z.number());

const optionalString = (maxLen = 500) =>
  z.string().max(maxLen, `Must be ${maxLen} characters or fewer`).optional().or(z.literal(""));

// ── Product Schema ───────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(255, "Name must be 255 characters or fewer"),
  description: z.string().max(5000, "Description must be 5,000 characters or fewer").optional().default(""),
  price: coerceNum(0).pipe(
    z.number().min(0, "Price cannot be negative").max(9_999_999.99, "Price cannot exceed $9,999,999.99")
  ),
  category: z.string().max(100, "Category must be 100 characters or fewer").optional().default("Uncategorized"),
  stock: coerceNum(0).pipe(
    z.number().int("Stock must be a whole number").min(0, "Stock cannot be negative").max(9_999_999, "Stock cannot exceed 9,999,999")
  ),
  brand: z.string().max(100, "Brand must be 100 characters or fewer").optional().default(""),
  rating: coerceNum(0).pipe(
    z.number().min(0, "Rating cannot be negative").max(5, "Rating cannot exceed 5")
  ),
  image_url: z.string().optional().default(""),
  sku: z.string().max(50, "SKU must be 50 characters or fewer").optional().default(""),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  // Phase 1 additions
  reorder_point: coerceNum(10).pipe(z.number().int().min(0).max(999_999)).optional(),
  reorder_qty: coerceNum(50).pipe(z.number().int().min(0).max(999_999)).optional(),
  barcode: z.string().max(100, "Barcode must be 100 characters or fewer").optional().default(""),
  weight: coerceNum(0).pipe(z.number().min(0).max(99_999)).optional(),
  dimensions: z.string().max(100).optional().default(""),
});

export type ProductInput = z.infer<typeof productSchema>;

// ── Supplier Schema ──────────────────────────────────────────────────────────

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Supplier name is required")
    .max(255, "Name must be 255 characters or fewer"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .optional()
    .or(z.literal("")),
  phone: optionalString(50),
  address: optionalString(2000),
  website: optionalString(255),
  contact_person: optionalString(255),
  rating: coerceNum(0).pipe(
    z.number().min(0, "Rating cannot be negative").max(5, "Rating cannot exceed 5")
  ),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: optionalString(5000),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

// ── Purchase Order Schema ────────────────────────────────────────────────────

const poItemSchema = z.object({
  product_id: z.number().int().positive("Product is required"),
  quantity: coerceNum(1).pipe(
    z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(999_999, "Quantity too large")
  ),
  unit_price: coerceNum(0).pipe(
    z.number().min(0, "Unit price cannot be negative").max(9_999_999.99, "Unit price too large")
  ),
});

export const purchaseOrderSchema = z.object({
  supplier_id: z.number().int().positive("Supplier is required"),
  expected_date: z.string().optional().or(z.literal("")),
  notes: optionalString(5000),
  tax: coerceNum(0).pipe(z.number().min(0, "Tax cannot be negative").max(9_999_999.99)),
  items: z.array(poItemSchema).min(1, "At least one line item is required"),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

// ── User Schema ──────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["admin", "manager", "viewer"]).default("viewer"),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128).optional(),
  role: z.enum(["admin", "manager", "viewer"]).optional(),
  is_active: z.boolean().optional(),
});

// ── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

// ── Stock Adjustment Schema ──────────────────────────────────────────────────

export const stockAdjustSchema = z.object({
  product_id: z.number().int().positive("Product is required"),
  delta: z.number().int("Adjustment must be a whole number").refine((v) => v !== 0, "Adjustment cannot be zero"),
  reason: z.enum(["adjustment", "recount", "damage", "return", "received", "sold"]).default("adjustment"),
  note: optionalString(1000),
});

// ── Product Supplier Link Schema ─────────────────────────────────────────────

export const productSupplierSchema = z.object({
  product_id: z.number().int().positive(),
  cost_price: coerceNum(0).pipe(z.number().min(0).max(9_999_999.99)),
  lead_days: coerceNum(7).pipe(z.number().int().min(0).max(365)),
  is_primary: z.boolean().default(false),
  min_order_qty: coerceNum(1).pipe(z.number().int().min(1).max(999_999)).optional(),
});

// ── Utility: format Zod errors for API responses ─────────────────────────────

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

/** Return the first error message from a ZodError. */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation failed";
}
