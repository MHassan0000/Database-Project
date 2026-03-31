"use client";

import { Product } from "@/lib/types";
import { 
  Star, 
  StarHalf, 
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
  Package 
} from "lucide-react";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />);
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative">
          <Star className="w-3.5 h-3.5 text-slate-200" />
          <div className="absolute inset-0 overflow-hidden w-[50%]">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </div>
        </div>
      );
    } else {
      stars.push(<Star key={i} className="w-3.5 h-3.5 text-slate-200" />);
    }
  }
  return <span className="flex items-center gap-0.5">{stars}</span>;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  if (stock <= 10)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-soft" />
        Low: {stock}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {stock}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Electronics: "bg-blue-50 text-blue-600 border-blue-100",
    Clothing: "bg-pink-50 text-pink-600 border-pink-100",
    Home: "bg-orange-50 text-orange-600 border-orange-100",
    Furniture: "bg-purple-50 text-purple-600 border-purple-100",
    Sports: "bg-green-50 text-green-600 border-green-100",
    Food: "bg-yellow-50 text-yellow-700 border-yellow-100",
    Books: "bg-indigo-50 text-indigo-600 border-indigo-100",
    Toys: "bg-cyan-50 text-cyan-600 border-cyan-100",
    Beauty: "bg-rose-50 text-rose-600 border-rose-100",
    Automotive: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const defaultColor = "bg-slate-50 text-slate-600 border-slate-200";

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

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 skeleton rounded-xl" />
          <div className="space-y-2">
            <div className="w-32 h-4 skeleton" />
            <div className="w-20 h-3 skeleton" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><div className="w-16 h-6 skeleton rounded-lg" /></td>
      <td className="px-4 py-4"><div className="w-16 h-4 skeleton" /></td>
      <td className="px-4 py-4"><div className="w-20 h-6 skeleton rounded-lg" /></td>
      <td className="px-4 py-4"><div className="w-16 h-4 skeleton" /></td>
      <td className="px-4 py-4"><div className="w-20 h-8 skeleton rounded-lg" /></td>
    </tr>
  );
}

export default function ProductTable({
  products,
  loading,
  onEdit,
  onDelete,
}: ProductTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-1">No products found</h3>
        <p className="text-sm text-slate-400">
          Try adjusting your filters or add your first product.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Product
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Price
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Stock
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Rating
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="stagger-children">
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group"
              >
                {/* Product */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-500 shrink-0 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <CategoryIcon category={product.category} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-50">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-50">
                        {product.brand && `${product.brand} • `}
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
                  <span className="text-sm font-bold text-slate-800">
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
                    <span className="text-xs text-slate-400 font-medium">
                      {Number(product.rating).toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(product)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
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
