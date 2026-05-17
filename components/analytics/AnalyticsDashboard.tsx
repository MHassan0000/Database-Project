"use client";

// Phase 5 — components/analytics/AnalyticsDashboard.tsx
// Top-level Phase 5 analytics page.
// Assembles TrendChart, ValueChart, VelocityTable, and the
// category-performance bar chart + table.
// Replaces the old Reports.tsx content in the "reports" tab.

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { BarChart2, Star, AlertCircle, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type {
  AnalyticsPeriod,
  CategoryPerformance,
  CategoryPerformanceResponse,
} from "@/lib/types";
import TrendChart      from "./TrendChart";
import ValueChart      from "./ValueChart";
import VelocityTable   from "./VelocityTable";
import DateRangePicker from "./DateRangePicker";

// PHASE 5 IMPLEMENTATION START

// ── Category bar tooltip ────────────────────────────────────────────────────
function CatTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { value: number; name: string }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ambient-card rounded-xl px-3 py-2 shadow-xl border border-[#1c2233] text-xs space-y-1">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="text-[#a1a1aa]">Value</span>
          <span className="text-white font-semibold">
            ${Number(p.value).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Category table row ──────────────────────────────────────────────────────
function CategoryRow({ cat, maxValue }: { cat: CategoryPerformance; maxValue: number }) {
  const pct    = maxValue > 0 ? (cat.total_value / maxValue) * 100 : 0;
  const netFlow = cat.inbound - cat.outbound;

  return (
    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-[#0f141c] transition-colors">
      <div className="col-span-3 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{cat.category}</p>
        <p className="text-[10px] text-[#52525b]">{cat.product_count} products</p>
      </div>
      <div className="col-span-3">
        <div className="w-full h-1.5 bg-[#18181b] rounded-full">
          <div
            className="h-full rounded-full bg-linear-to-r from-white to-[#52525b] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-[#52525b] mt-0.5">
          ${cat.total_value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="col-span-2 text-center">
        <p className="text-xs text-white font-semibold">{cat.total_stock.toLocaleString()}</p>
        <p className="text-[10px] text-[#52525b]">units</p>
      </div>
      <div className="col-span-2 text-center">
        <p className="text-xs text-white">${cat.avg_price.toFixed(0)}</p>
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <Star className="w-2.5 h-2.5 fill-white text-white" />
          <span className="text-[10px] text-[#52525b]">{Number(cat.avg_rating).toFixed(1)}</span>
        </div>
      </div>
      <div className="col-span-2 text-right">
        <div className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${
          netFlow > 0 ? "text-emerald-400" : netFlow < 0 ? "text-red-400" : "text-[#52525b]"
        }`}>
          {netFlow > 0
            ? <ArrowUp   className="w-2.5 h-2.5 shrink-0" />
            : netFlow < 0
            ? <ArrowDown className="w-2.5 h-2.5 shrink-0" />
            : <Minus     className="w-2.5 h-2.5 shrink-0" />}
          {Math.abs(netFlow)}
        </div>
        <p className="text-[10px] text-[#52525b]">{cat.movements} moves</p>
      </div>
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [period,     setPeriod]     = useState<AnalyticsPeriod>("30d");
  const [catData,    setCatData]    = useState<CategoryPerformanceResponse | null>(null);
  const [catLoading, setCatLoading] = useState(true);
  const [catError,   setCatError]   = useState<string | null>(null);

  const fetchCategory = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const res = await fetch(`/api/analytics/category-performance?period=${period}`);
      if (!res.ok) throw new Error("Failed to load category data");
      setCatData(await res.json());
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setCatLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchCategory(); }, [fetchCategory]);

  const maxCatValue = catData
    ? Math.max(...catData.categories.map((c) => c.total_value), 1)
    : 1;

  const barData = catData?.categories.slice(0, 8).map((c) => ({
    name:  c.category.length > 12 ? c.category.slice(0, 12) + "…" : c.category,
    value: c.total_value,
  })) ?? [];

  return (
    <div id="analytics-dashboard" className="space-y-6 animate-fade-in">

      {/* ── Row 1: Trend + Value charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart />
        <ValueChart />
      </div>

      {/* ── Row 2: Category performance ── */}
      <div className="ambient-card rounded-3xl p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#a1a1aa]" />
              <h3 className="text-sm font-semibold text-white">Category Performance</h3>
            </div>
            <p className="text-xs text-[#71717a] mt-0.5">
              Value, stock, and movement activity broken down by category
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker value={period} onChange={setPeriod} />
            <button
              id="analytics-cat-refresh"
              onClick={fetchCategory}
              disabled={catLoading}
              className="p-1.5 rounded-lg hover:bg-[#18181b] text-[#71717a] hover:text-white transition-all disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${catLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Summary totals */}
        {catData && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Value",
                value: `$${catData.totals.total_value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
              },
              {
                label: "Products",
                value: catData.totals.total_products.toLocaleString(),
              },
              {
                label: "Movements",
                value: catData.totals.total_movements.toLocaleString(),
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0f141c] rounded-2xl p-3 border border-[#1c2233] text-center">
                <p className="text-[10px] uppercase tracking-wider text-[#52525b] mb-1">{label}</p>
                <p className="text-sm font-bold text-white font-mono">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Bar chart */}
        {catLoading ? (
          <div className="h-44 skeleton rounded-2xl" />
        ) : catError ? (
          <div className="flex items-center gap-2 text-xs text-red-400 py-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {catError}
          </div>
        ) : barData.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#52525b]">No category data yet.</div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2233" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                />
                <Tooltip content={<CatTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={idx === 0 ? "#ffffff" : `rgba(255,255,255,${Math.max(0.15, 0.6 - idx * 0.06)})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        {!catLoading && !catError && catData && catData.categories.length > 0 && (
          <>
            <div className="grid grid-cols-12 gap-2 px-3">
              {[
                { h: "Category",  cls: "col-span-3" },
                { h: "Value",     cls: "col-span-3" },
                { h: "Stock",     cls: "col-span-2 text-center" },
                { h: "Avg Price", cls: "col-span-2 text-center" },
                { h: "Net Flow",  cls: "col-span-2 text-right" },
              ].map(({ h, cls }) => (
                <div key={h} className={`text-[9px] uppercase tracking-wider text-[#52525b] font-semibold ${cls}`}>
                  {h}
                </div>
              ))}
            </div>
            <div className="space-y-0.5">
              {catData.categories.map((cat) => (
                <CategoryRow key={cat.category} cat={cat} maxValue={maxCatValue} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Row 3: Velocity table ── */}
      <VelocityTable />
    </div>
  );
}
// PHASE 5 IMPLEMENTATION END
