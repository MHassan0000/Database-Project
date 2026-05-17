"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import {
  Star,
  Laptop,
  Shirt,
  Home,
  Armchair,
  Trophy,
  Pizza,
  Book,
  Gamepad2,
  Sparkles,
  CarFront,
  Package,
  Truck,
} from "lucide-react";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onSelectChange?: (ids: number[]) => void;
  onAdjustStock?: (product: Product) => void;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className="w-3.5 h-3.5 fill-white text-white" />);
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative">
          <Star className="w-3.5 h-3.5 text-[#2a3040]" />
          <div className="absolute inset-0 overflow-hidden w-[50%]">
            <Star className="w-3.5 h-3.5 fill-white text-white" />
          </div>
        </div>
      );
    } else {
      stars.push(<Star key={i} className="w-3.5 h-3.5 text-[#2a3040]" />);
    }
  }
  return <span className="flex items-center gap-0.5">{stars}</span>;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-200 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Out of Stock
      </span>
    );
  if (stock <= 10)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-400/10 text-amber-100 border border-amber-400/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse-soft" />
        Low: {stock}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
      {stock}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Electronics: "bg-sky-400/10 text-sky-200 border-sky-400/30",
    Clothing: "bg-rose-400/10 text-rose-200 border-rose-400/30",
    Home: "bg-amber-400/10 text-amber-100 border-amber-400/30",
    Furniture: "bg-violet-400/10 text-violet-200 border-violet-400/30",
    Sports: "bg-emerald-400/10 text-emerald-200 border-emerald-400/30",
    Food: "bg-yellow-400/10 text-yellow-100 border-yellow-400/30",
    Books: "bg-indigo-400/10 text-indigo-200 border-indigo-400/30",
    Toys: "bg-cyan-400/10 text-cyan-200 border-cyan-400/30",
    Beauty: "bg-pink-400/10 text-pink-200 border-pink-400/30",
    Automotive: "bg-slate-400/10 text-slate-200 border-slate-400/30",
  };
  const defaultColor = "bg-slate-400/10 text-slate-200 border-slate-400/30";

  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
        colors[category] || defaultColor
      }`}
    >
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-400/10 text-emerald-200 border-emerald-400/30",
    draft: "bg-amber-400/10 text-amber-100 border-amber-400/30",
    archived: "bg-slate-400/10 text-slate-200 border-slate-400/30",
  };
  const label = status?.charAt(0).toUpperCase() + status?.slice(1);
  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
        map[status] || "bg-slate-400/10 text-slate-200 border-slate-400/30"
      }`}
    >
      {label || "Unknown"}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1c2233]">
      <td className="px-4 py-4">
        <div className="w-4 h-4 skeleton rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 skeleton rounded-xl" />
          <div className="space-y-2">
            <div className="w-32 h-4 skeleton" />
            <div className="w-20 h-3 skeleton" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell"><div className="w-16 h-6 skeleton rounded-lg" /></td>
      <td className="px-4 py-4"><div className="w-16 h-4 skeleton" /></td>
      <td className="px-4 py-4 hidden md:table-cell"><div className="w-20 h-6 skeleton rounded-lg" /></td>
      <td className="px-4 py-4 hidden lg:table-cell"><div className="w-16 h-4 skeleton" /></td>
      <td className="px-4 py-4 hidden lg:table-cell"><div className="w-16 h-6 skeleton rounded-lg" /></td>
      {/* Phase 2: supplier skeleton cell */}
      <td className="px-4 py-4 hidden xl:table-cell"><div className="w-24 h-4 skeleton rounded" /></td>
      <td className="px-4 py-4"><div className="w-20 h-8 skeleton rounded-lg" /></td>
    </tr>
  );
}

export default function ProductTable({
  products,
  loading,
  onEdit,
  onDelete,
  onSelectChange,
  onAdjustStock,
}: ProductTableProps) {
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    setSelected([]);
    onSelectChange?.([]);
  }, [products, onSelectChange]);

  const toggleAll = (checked: boolean) => {
    const next = checked ? products.map((product) => product.id) : [];
    setSelected(next);
    onSelectChange?.(next);
  };

  const toggleOne = (id: number) => {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    setSelected(next);
    onSelectChange?.(next);
  };
  if (loading) {
    return (
      <div className="ambient-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1c2233] bg-[#0f141c]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selected.length === products.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="accent-white"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden md:table-cell">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden lg:table-cell">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden lg:table-cell">Status</th>
                {/* Phase 2: supplier column header in skeleton */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden xl:table-cell">Supplier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="ambient-card rounded-3xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#0f141c] flex items-center justify-center border border-[#1c2333]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No products found</h3>
        <p className="text-sm text-[#8b93a7]">
          Try adjusting your filters or add your first product.
        </p>
      </div>
    );
  }

  return (
    <div className="ambient-card rounded-3xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c2233] bg-[#0f141c]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selected.length === products.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="accent-white"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                Product
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden sm:table-cell">
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                Price
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden md:table-cell">
                Stock
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden lg:table-cell">
                Rating
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden lg:table-cell">
                Status
              </th>
              {/* Phase 2: Primary supplier column */}
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider hidden xl:table-cell">
                Supplier
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="stagger-children">
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-[#141a26] hover:bg-[#111724] transition-colors group"
              >
                {/* Select */}
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(product.id)}
                    onChange={() => toggleOne(product.id)}
                    className="accent-white"
                  />
                </td>

                {/* Product */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#18181b] flex items-center justify-center text-white shrink-0 overflow-hidden border border-[#27272a]">
                      {/* PHASE 7 IMPLEMENTATION START — prefer uploaded thumbnail, then image_url, then icon */}
                      {product.primary_thumbnail_url ? (
                        <img
                          src={product.primary_thumbnail_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <CategoryIcon category={product.category} />
                      )}
                      {/* PHASE 7 IMPLEMENTATION END */}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-50">
                        {product.name}
                      </p>
                      <p className="text-xs text-[#8b93a7] truncate max-w-50">
                        {product.brand && `${product.brand} - `}
                        {product.sku || "No SKU"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <CategoryBadge category={product.category} />
                </td>

                {/* Price */}
                <td className="px-4 py-3.5">
                  <span className="text-sm font-bold text-white">
                    ${Number(product.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </td>

                {/* Stock */}
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <StockBadge stock={product.stock} />
                </td>

                {/* Rating */}
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={Number(product.rating)} />
                    <span className="text-xs text-[#8b93a7] font-medium">
                      {Number(product.rating).toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <StatusBadge status={product.status || "active"} />
                </td>

                {/* Phase 2: Primary Supplier */}
                <td className="px-4 py-3.5 hidden xl:table-cell">
                  {(product as Product & { primary_supplier_name?: string }).primary_supplier_name ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                      <Truck className="w-3 h-3 text-[#71717a]" />
                      {(product as Product & { primary_supplier_name?: string }).primary_supplier_name}
                    </span>
                  ) : (
                    <span className="text-xs text-[#52525b]">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onAdjustStock && (
                      <button
                        onClick={() => onAdjustStock(product)}
                        className="p-2 rounded-lg hover:bg-[#141a26] text-[#8b93a7] hover:text-white transition-all"
                        title="Adjust Stock"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12h18" />
                          <path d="M12 3v18" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 rounded-lg hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-all"
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(product)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[#8b93a7] hover:text-red-300 transition-all"
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const map: Record<string, React.ReactNode> = {
    Electronics: <Laptop className="w-5 h-5" />,
    Clothing: <Shirt className="w-5 h-5" />,
    Home: <Home className="w-5 h-5" />,
    Furniture: <Armchair className="w-5 h-5" />,
    Sports: <Trophy className="w-5 h-5" />,
    Food: <Pizza className="w-5 h-5" />,
    Books: <Book className="w-5 h-5" />,
    Toys: <Gamepad2 className="w-5 h-5" />,
    Beauty: <Sparkles className="w-5 h-5" />,
    Automotive: <CarFront className="w-5 h-5" />,
  };
  return map[category] || <Package className="w-5 h-5" />;
}
