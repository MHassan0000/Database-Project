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
}

export interface StockMovementResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  netDelta: number;
}
