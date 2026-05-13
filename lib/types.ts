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

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
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

// ── Paginated response generics ───────────────────────────────────────────

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
