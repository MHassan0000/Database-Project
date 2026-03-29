"use client";

import { useEffect, useState } from "react";
import { StatsData, Product } from "@/lib/types";
import { Package, CircleDollarSign, Star, AlertTriangle, Trophy, Clock } from "lucide-react";

function StatCard({
  label,
  value,
  icon,
  color,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-slate-400 mt-1">{subtext}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-lg group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 truncate max-w-30">
                {item.label}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {item.value}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-linear-to-r from-indigo-400 to-purple-500 transition-all duration-700 ease-out"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductListCard({
  products,
  title,
  subtitle,
}: {
  products: Product[];
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-slate-400 w-5">
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {product.name}
              </p>
              <p className="text-xs text-slate-400">{product.brand}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">
                ${Number(product.price).toFixed(2)}
              </p>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs text-slate-500">
                  {Number(product.rating).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            No products yet
          </p>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      console.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="skeleton w-20 h-3 mb-3" />
              <div className="skeleton w-28 h-8 mb-2" />
              <div className="skeleton w-16 h-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="skeleton w-32 h-5 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j}>
                    <div className="skeleton w-full h-3 mb-2" />
                    <div className="skeleton w-full h-2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Failed to load reports.</p>
        <button
          onClick={fetchStats}
          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={stats.totalProducts.toString()}
          icon={<Package className="w-5 h-5 text-indigo-600" />}
          color="bg-indigo-50"
          subtext={`${stats.categoryCounts.length} categories`}
        />
        <StatCard
          label="Inventory Value"
          value={`$${stats.totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          icon={<CircleDollarSign className="w-5 h-5 text-emerald-600" />}
          color="bg-emerald-50"
          subtext={`Avg $${stats.avgPrice.toFixed(2)} per item`}
        />
        <StatCard
          label="Average Rating"
          value={stats.avgRating.toFixed(1)}
          icon={<Star className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50"
          subtext="Across all rated products"
        />
        <StatCard
          label="Stock Alerts"
          value={`${stats.lowStockCount + stats.outOfStockCount}`}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          color="bg-red-50"
          subtext={`${stats.outOfStockCount} out of stock, ${stats.lowStockCount} low`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart
          title="Products by Category"
          data={stats.categoryCounts.map(
            (c: { category: string; count: number }) => ({
              label: c.category,
              value: Number(c.count),
            })
          )}
        />
        <BarChart
          title="Top Brands"
          data={stats.brandCounts.map(
            (b: { brand: string; count: number }) => ({
              label: b.brand,
              value: Number(b.count),
            })
          )}
        />
      </div>

      {/* Product lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProductListCard
          title="Top Rated Products"
          subtitle="Highest rated items in your catalog"
          products={stats.topRated}
        />
        <ProductListCard
          title="Recently Added"
          subtitle="Latest products added to inventory"
          products={stats.recentlyAdded}
        />
      </div>
    </div>
  );
}
