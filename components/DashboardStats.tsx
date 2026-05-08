"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, AlertTriangle, Layers, Star } from "lucide-react";
import type { StatsData } from "@/lib/types";

function StatCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="ambient-card rounded-3xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          <p className="text-xs text-[#8b93a7] mt-1">{subtext}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#18181b] flex items-center justify-center border border-[#27272a] text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats() {
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
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="ambient-card rounded-3xl p-5">
            <div className="skeleton w-20 h-3 mb-3" />
            <div className="skeleton w-28 h-8 mb-2" />
            <div className="skeleton w-16 h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="ambient-card rounded-3xl p-5">
        <p className="text-sm text-[#8b93a7]">Stats unavailable.</p>
      </div>
    );
  }

  const statusCounts = Array.isArray(stats.statusCounts) ? stats.statusCounts : [];
  const statusMap = statusCounts.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    },
    {}
  );

  const totalAlerts = stats.lowStockCount + stats.outOfStockCount;
  const avgPrice = stats.avgPrice.toFixed(2);
  const minPrice = Number(stats.priceRange?.min_price ?? 0).toFixed(2);
  const maxPrice = Number(stats.priceRange?.max_price ?? 0).toFixed(2);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Inventory Value"
        value={`$${stats.totalValue.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`}
        subtext={`Avg price $${avgPrice}`}
        icon={<CircleDollarSign className="w-5 h-5 text-[#34d399]" />}
      />
      <StatCard
        label="Stock Alerts"
        value={totalAlerts.toString()}
        subtext={`${stats.outOfStockCount} out of stock`}
        icon={<AlertTriangle className="w-5 h-5 text-[#f87171]" />}
      />
      <StatCard
        label="Active SKUs"
        value={(statusMap.active ?? 0).toString()}
        subtext={`Draft ${statusMap.draft ?? 0} | Archived ${statusMap.archived ?? 0}`}
        icon={<Layers className="w-5 h-5 text-white" />}
      />
      <StatCard
        label="Price Range"
        value={`$${minPrice} - $${maxPrice}`}
        subtext={`Avg rating ${stats.avgRating.toFixed(1)}`}
        icon={<Star className="w-5 h-5 text-white" />}
      />
    </div>
  );
}
