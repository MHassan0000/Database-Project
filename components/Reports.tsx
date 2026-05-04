"use client";

import { useEffect, useState } from "react";
import { StatsData, Product } from "@/lib/types";
import { Package, CircleDollarSign, Star, AlertTriangle } from "lucide-react";
import StockLedger from "@/components/StockLedger";

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
    <div className="ambient-card rounded-3xl p-5 hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-[#8b93a7] mt-1">{subtext}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-lg group-hover:scale-110 transition-transform border border-white/5`}
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
    <div className="ambient-card rounded-3xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#8b93a7] truncate max-w-30">
                {item.label}
              </span>
              <span className="text-xs font-semibold text-white">
                {item.value}
              </span>
            </div>
            <div className="w-full bg-[#101624] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-linear-to-r from-[#7dd3fc] via-[#a78bfa] to-[#f4d06f] transition-all duration-700 ease-out"
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
    <div className="ambient-card rounded-3xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-[#8b93a7]">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#111724] transition-colors"
          >
            <span className="text-xs font-bold text-[#8b93a7] w-5">
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {product.name}
              </p>
              <p className="text-xs text-[#8b93a7]">{product.brand}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                ${Number(product.price).toFixed(2)}
              </p>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-[#f4d06f] text-[#f4d06f]" />
                <span className="text-xs text-[#8b93a7]">
                  {Number(product.rating).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-[#8b93a7] text-center py-4">
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
      if (!res.ok) throw new Error(data.error || "Failed to load stats");
      setStats(data);
    } catch {
      console.error("Failed to fetch stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ambient-card rounded-3xl p-5">
              <div className="skeleton w-20 h-3 mb-3" />
              <div className="skeleton w-28 h-8 mb-2" />
              <div className="skeleton w-16 h-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="ambient-card rounded-3xl p-5">
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
        <p className="text-[#8b93a7]">Failed to load reports.</p>
        <button
          onClick={fetchStats}
          className="mt-3 text-sm font-medium text-[#7dd3fc] hover:text-white"
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
          icon={<Package className="w-5 h-5 text-[#7dd3fc]" />}
          color="bg-[#0f141c]"
          subtext={`${stats.categoryCounts.length} categories`}
        />
        <StatCard
          label="Inventory Value"
          value={`$${stats.totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          icon={<CircleDollarSign className="w-5 h-5 text-[#34d399]" />}
          color="bg-[#0f141c]"
          subtext={`Avg $${stats.avgPrice.toFixed(2)} per item`}
        />
        <StatCard
          label="Average Rating"
          value={stats.avgRating.toFixed(1)}
          icon={<Star className="w-5 h-5 text-[#f4d06f]" />}
          color="bg-[#0f141c]"
          subtext="Across all rated products"
        />
        <StatCard
          label="Stock Alerts"
          value={`${stats.lowStockCount + stats.outOfStockCount}`}
          icon={<AlertTriangle className="w-5 h-5 text-[#f87171]" />}
          color="bg-[#0f141c]"
          subtext={`${stats.outOfStockCount} out of stock, ${stats.lowStockCount} low`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart
          title="Products by Category"
          data={stats.categoryCounts.map((c) => ({
            label: c.category,
            value: Number(c.count),
          }))}
        />
        <BarChart
          title="Top Brands"
          data={stats.brandCounts.map((b) => ({
            label: b.brand,
            value: Number(b.count),
          }))}
        />
      </div>

      {/* Status + Stock ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart
          title="Product Status Mix"
          data={stats.statusCounts.map((s) => ({
            label: s.status,
            value: Number(s.count),
          }))}
        />
        <StockLedger />
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
