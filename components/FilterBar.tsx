"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  minPrice: string;
  onMinPriceChange: (value: string) => void;
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  minRating: string;
  onMinRatingChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
  onClearFilters: () => void;
  onAddProduct: () => void;
  onStockAdjust: () => void;
  totalProducts: number;
}

export default function FilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters,
  onAddProduct,
  onStockAdjust,
  totalProducts,
}: FilterBarProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch("/api/products/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const hasActiveFilters =
    category !== "all" || status !== "all" || minPrice || maxPrice || minRating || search;

  const exportParams = new URLSearchParams();
  if (category !== "all") exportParams.set("category", category);
  if (status !== "all") exportParams.set("status", status);
  if (minPrice) exportParams.set("minPrice", minPrice);
  if (maxPrice) exportParams.set("maxPrice", maxPrice);
  if (minRating) exportParams.set("minRating", minRating);
  if (search) exportParams.set("search", search);
  exportParams.set("sortBy", sortBy);
  exportParams.set("sortOrder", sortOrder);
  const exportQuery = exportParams.toString();
  const exportUrl = exportQuery
    ? `/api/products/export?${exportQuery}`
    : "/api/products/export";

  return (
    <div className="space-y-4">
      {/* Top bar: Search + Add */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products by name, brand, SKU..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#1c2333] text-sm bg-[#0f141c] text-white placeholder:text-[#667085] transition-all hover:border-[#2a344a]"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-all ${
              showFilters || hasActiveFilters
                ? "bg-[#27272a] border-[#3f3f46] text-white"
                : "bg-[#111113] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white" />
            )}
          </button>

          <button
            onClick={onStockAdjust}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white border border-[#1c2333] bg-[#0f141c] hover:bg-[#141a26] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18" />
              <path d="M12 3v18" />
            </svg>
            <span className="hidden sm:inline">Adjust Stock</span>
          </button>
          <a
            href={exportUrl}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white border border-[#1c2333] bg-[#0f141c] hover:bg-[#141a26] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12" />
              <path d="M8 11l4 4 4-4" />
              <path d="M4 21h16" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
          </a>
          <button
            onClick={onAddProduct}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 shadow-lg shadow-black/30 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="ambient-card glow-border rounded-3xl p-5 animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a7] uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a7] uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a7] uppercase tracking-wider mb-1.5">
                Min Price
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
                placeholder="$0"
                className="w-full px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a7] uppercase tracking-wider mb-1.5">
                Max Price
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="$9999"
                className="w-full px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white"
              />
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a7] uppercase tracking-wider mb-1.5">
                Min Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => onMinRatingChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white appearance-none cursor-pointer"
              >
                <option value="">Any Rating</option>
                <option value="1">1+ Stars</option>
                <option value="2">2+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a7] uppercase tracking-wider mb-1.5">
                Sort By
              </label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => onSortByChange(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white appearance-none cursor-pointer"
                >
                  <option value="created_at">Date Added</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                  <option value="stock">Stock</option>
                </select>
                <button
                  onClick={() =>
                    onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="px-2.5 py-2 rounded-xl border border-[#1c2333] hover:bg-[#141a26] transition-colors text-white"
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1c2333]">
              <p className="text-xs text-[#8b93a7]">
                Showing {totalProducts} result{totalProducts !== 1 ? "s" : ""}
              </p>
              <button
                onClick={onClearFilters}
                className="text-xs font-medium text-white hover:text-zinc-300 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
