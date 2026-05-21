// ─────────────────────────────────────────────────────────────────────────────
// Existing types (preserved)
// ─────────────────────────────────────────────────────────────────────────────

export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  brand: string;
  rating: number;
  image_url: string;
  sku: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  // Phase 1 additions — nullable to preserve backward compat with existing rows
  reorder_point?: number;
  reorder_qty?: number;
  barcode?: string | null;
  weight?: number | null;
  dimensions?: string | null;
  // PHASE 7 IMPLEMENTATION START — primary image from product_images table
  primary_image_url?: string | null;
  primary_thumbnail_url?: string | null;
  // PHASE 7 IMPLEMENTATION END
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number | string;
  category: string;
  stock: number | string;
  brand: string;
  rating: number | string;
  image_url: string;
  sku: string;
  status: ProductStatus;
  // Phase 1 additions
  reorder_point?: number | string;
  reorder_qty?: number | string;
  barcode?: string;
  weight?: number | string;
  dimensions?: string;
}

export interface FilterParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatsData {
  totalProducts: number;
  totalValue: number;
  avgPrice: number;
  avgRating: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryCounts: { category: string; count: number }[];
  brandCounts: { brand: string; count: number }[];
  statusCounts: { status: ProductStatus; count: number }[];
  topRated: Product[];
  recentlyAdded: Product[];
  priceRange: { min_price: number; max_price: number };
}

export interface StockMovement {
  id: number;
  product_id: number;
  delta: number;
  reason: string;
  note: string;
  stock_after: number;
  created_at: string;
  product_name: string;
  sku: string;
  brand: string;
  category: string;
  status: ProductStatus;
  // Phase 1 addition — nullable (populated when RBAC is implemented)
  performed_by?: number | null;
}

export interface StockMovementResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  netDelta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: New entity types
// ─────────────────────────────────────────────────────────────────────────────

// ── Suppliers ──────────────────────────────────────────────────────────────

export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  contact_person: string | null;
  rating: number;
  status: SupplierStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  contact_person?: string;
  rating?: number | string;
  status?: SupplierStatus;
  notes?: string;
}

// ── Product–Supplier junction ──────────────────────────────────────────────

export interface ProductSupplier {
  id: number;
  product_id: number;
  supplier_id: number;
  cost_price: number;
  lead_days: number;
  is_primary: boolean;
  min_order_qty: number;
  created_at: string;
  // Joined fields (populated when queried with JOIN)
  supplier_name?: string;
  product_name?: string;
}

export interface ProductSupplierFormData {
  product_id: number;
  supplier_id: number;
  cost_price: number | string;
  lead_days?: number | string;
  is_primary?: boolean;
  min_order_qty?: number | string;
}

// ── Audit Log ─────────────────────────────────────────────────────────────

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "stock_adjust"
  | "bulk_update"
  | "bulk_delete"
  | "import"
  | "receive_po";

export type AuditEntityType = "product" | "supplier" | "purchase_order" | "user";

export interface AuditLog {
  id: number;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: number | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  performed_by: string;
  ip_address: string | null;
  created_at: string;
}

// ── Users ─────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "viewer";

export interface User {
  id: number;
  tenant_id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_url: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

/** Safe user object — password_hash excluded for client-facing usage */
export interface SafeUser {
  id: number;
  tenant_id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  avatar_url?: string;
  is_active?: boolean;
}

// ── Tenants ─────────────────────────────────────────────────────────────────

export interface Tenant {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// ── Sessions ──────────────────────────────────────────────────────────────

export interface UserSession {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

// ── Purchase Orders ───────────────────────────────────────────────────────

export type PurchaseOrderStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined fields (populated when queried with JOIN)
  supplier_name?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  received_qty: number;
  line_total: number; // GENERATED column
  created_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
}

export interface PurchaseOrderFormData {
  supplier_id: number;
  expected_date?: string;
  notes?: string;
  tax?: number | string;
  items: {
    product_id: number;
    quantity: number | string;
    unit_price: number | string;
  }[];
}

export interface PurchaseOrderItemReceive {
  item_id: number;
  received_qty: number;
}

// ── Product Images ────────────────────────────────────────────────────────

// PHASE 7 IMPLEMENTATION START
export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  thumbnail_url: string; // Phase 7: 200×200 WebP thumbnail path
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductImageFormData {
  alt_text?: string;
  sort_order?: number;
  is_primary?: boolean;
}
// PHASE 7 IMPLEMENTATION END

// ── Paginated response generics ───────────────────────────────────────────

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5: Advanced Analytics types
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = "7d" | "14d" | "30d" | "60d" | "90d";

/** One data-point returned by /api/analytics/trends */
export interface TrendDataPoint {
  date:      string; // ISO date "YYYY-MM-DD"
  inbound:   number;
  outbound:  number;
  movements: number;
}

export interface TrendsResponse {
  period:  AnalyticsPeriod;
  groupBy: "day" | "week";
  data:    TrendDataPoint[];
}

/** Top-mover row from /api/analytics/velocity */
export interface VelocityItem {
  id:            number;
  name:          string;
  sku:           string;
  category:      string;
  current_stock: number;
  price:         number;
  movements:     number;
  inbound:       number;
  outbound:      number;
  total_units:   number;
}

/** Dead-stock item — no movement in period */
export interface DeadStockItem {
  id:            number;
  name:          string;
  sku:           string;
  category:      string;
  current_stock: number;
  price:         number;
}

export interface VelocityResponse {
  period:    AnalyticsPeriod;
  limit:     number;
  topMovers: VelocityItem[];
  deadStock: DeadStockItem[];
}

/** One data-point from /api/analytics/value-history */
export interface ValueHistoryPoint {
  date:            string;
  inventory_value: number;
  products_active: number;
}

export interface ValueHistoryResponse {
  period:       AnalyticsPeriod;
  currentValue: number;
  productCount: number;
  data:         ValueHistoryPoint[];
}

/** One row from /api/analytics/category-performance */
export interface CategoryPerformance {
  category:      string;
  product_count: number;
  total_stock:   number;
  total_value:   number;
  avg_price:     number;
  avg_rating:    number;
  movements:     number;
  inbound:       number;
  outbound:      number;
}

export interface CategoryPerformanceResponse {
  period:     AnalyticsPeriod;
  categories: CategoryPerformance[];
  totals: {
    total_value:     number;
    total_products:  number;
    total_movements: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6: Batch Import types
// ─────────────────────────────────────────────────────────────────────────────

/** Validation status of a single parsed CSV row */
export type ImportRowStatus = "valid" | "error" | "warning";

/** A single parsed + validated CSV row from the import preview */
export interface ImportRow {
  /** 1-based row number (excluding header) */
  rowNumber: number;
  status:    ImportRowStatus;
  /** Parsed field values (may be partial on error rows) */
  name:        string;
  price:       string;
  stock:       string;
  sku:         string;
  category:    string;
  brand:       string;
  description: string;
  rating:      string;
  status_val:  string; // renamed to avoid clash with ImportRowStatus.status
  /** Human-readable validation messages */
  errors:   string[];
  warnings: string[];
}

/** Response from POST /api/products/import (parse + validate step) */
export interface ImportPreviewResponse {
  totalRows:    number;
  validRows:    number;
  errorRows:    number;
  warningRows:  number;
  rows:         ImportRow[];
}

/** Response from POST /api/products/import/confirm (execute step) */
export interface ImportConfirmResponse {
  imported:    number;
  skipped:     number;
  errors:      number;
  importedIds: number[];
}
