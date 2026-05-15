"use client";

// Phase 4 — components/POStats.tsx
// KPI cards for the Purchase Orders tab header row.
// Fetches from GET /api/purchase-orders/stats

import { useState, useEffect } from "react";
import { ShoppingCart, Clock, CheckCircle2, CircleDollarSign, AlertCircle } from "lucide-react";

interface POStatsData {
  total: number;
  pending: number;
  totalValue: number;
  receivedThisMonth: number;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="ambient-card rounded-2xl p-5 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#71717a] uppercase tracking-wider font-medium mb-1">
          {label}
        </p>
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

export default function POStats() {
  const [stats, setStats] = useState<POStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/purchase-orders/stats");
        if (!res.ok) throw new Error("Failed to load PO stats");
        const data: POStatsData = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
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
      <div className="ambient-card rounded-2xl p-5 flex items-center gap-2 text-sm text-[#8b93a7]">
        <AlertCircle className="w-4 h-4" />
        {error || "Could not load stats"}
      </div>
    );
  }

  const formatValue = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : v >= 1_000
      ? `$${(v / 1_000).toFixed(1)}K`
      : `$${v.toFixed(0)}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<ShoppingCart className="w-5 h-5" />}
        label="Total Orders"
        value={stats.total}
        sub="All time"
        color="bg-[#18181b] border-[#27272a] text-[#a1a1aa]"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label="Pending"
        value={stats.pending}
        sub="Draft + Sent + Partial"
        color="bg-amber-500/10 border-amber-500/20 text-amber-300"
      />
      <StatCard
        icon={<CircleDollarSign className="w-5 h-5" />}
        label="Total PO Value"
        value={formatValue(stats.totalValue)}
        sub="Non-cancelled orders"
        color="bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
      />
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        label="Received This Month"
        value={stats.receivedThisMonth}
        sub="Fully received POs"
        color="bg-blue-500/10 border-blue-500/20 text-blue-300"
      />
    </div>
  );
}
