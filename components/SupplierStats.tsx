"use client";

// Phase 2 — components/SupplierStats.tsx
// Displays KPI cards for supplier metrics: total, active, avg lead time, avg rating

import { useEffect, useState } from "react";
import { Truck, CheckCircle, Clock, Star } from "lucide-react";

interface SupplierStatsData {
  total: number;
  active: number;
  inactive: number;
  avgLeadDays: number;
  avgRating: number;
  topSuppliers: { id: number; name: string; linked_products: number; status: string }[];
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="ambient-card rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0 text-[#a1a1aa]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#71717a] uppercase tracking-wider font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-[#71717a] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="ambient-card rounded-2xl p-5 flex items-start gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-3 skeleton w-20 rounded" />
        <div className="h-7 skeleton w-16 rounded" />
      </div>
    </div>
  );
}

export default function SupplierStats() {
  const [stats, setStats] = useState<SupplierStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/suppliers/stats");
        if (!res.ok) throw new Error("Failed to load supplier stats");
        const data: SupplierStatsData = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="ambient-card rounded-2xl p-5 text-center text-[#8b93a7] text-sm">
        {error || "Could not load supplier stats"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Truck className="w-5 h-5" />}
        label="Total Suppliers"
        value={stats.total}
        sub={`${stats.inactive} inactive`}
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" />}
        label="Active Suppliers"
        value={stats.active}
        sub={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of total` : undefined}
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label="Avg Lead Time"
        value={`${stats.avgLeadDays || 0}d`}
        sub="across all products"
      />
      <StatCard
        icon={<Star className="w-5 h-5" />}
        label="Avg Rating"
        value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
        sub="supplier quality score"
      />
    </div>
  );
}
