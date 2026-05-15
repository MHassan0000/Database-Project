"use client";

// Phase 5 — components/analytics/VelocityTable.tsx
// Two-tab table: "Top Movers" (fastest-moving products by stock volume)
// and "Dead Stock" (stocked products with zero movement in the period).
// Data: /api/analytics/velocity

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Flame, Package, ArrowUp, ArrowDown } from "lucide-react";
import type { AnalyticsPeriod, VelocityItem, DeadStockItem } from "@/lib/types";
import DateRangePicker from "./DateRangePicker";

// PHASE 5 IMPLEMENTATION START

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-[#18181b] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-linear-to-r from-white to-[#71717a] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type VelocityTab = "movers" | "dead";

export default function VelocityTable() {
  const [period,    setPeriod]    = useState<AnalyticsPeriod>("30d");
  const [movers,    setMovers]    = useState<VelocityItem[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<VelocityTab>("movers");

  const fetchVelocity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/velocity?period=${period}&limit=10`);
      if (!res.ok) throw new Error("Failed to load velocity data");
      const json = await res.json();
      setMovers(json.topMovers    ?? []);
      setDeadStock(json.deadStock ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchVelocity(); }, [fetchVelocity]);

  const maxUnits = movers[0]?.total_units ?? 1;

  return (
    <div id="analytics-velocity-table" className="ambient-card rounded-3xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#a1a1aa]" />
            <h3 className="text-sm font-semibold text-white">Stock Velocity</h3>
          </div>
          <p className="text-xs text-[#71717a] mt-0.5">Fastest movers &amp; idle inventory</p>
        </div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-[#0f141c] rounded-xl border border-[#1c2233] w-fit">
        {(["movers", "dead"] as VelocityTab[]).map((t) => (
          <button
            key={t}
            id={`velocity-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              tab === t ? "bg-white text-black" : "text-[#71717a] hover:text-white"
            }`}
          >
            {t === "movers" ? "Top Movers" : "Dead Stock"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 skeleton rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-red-400 py-6">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : tab === "movers" ? (
        movers.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#52525b]">
            No stock movements recorded in this period.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-0">
              <span className="col-span-1 text-[9px] uppercase tracking-wider text-[#52525b]">#</span>
              <span className="col-span-5 text-[9px] uppercase tracking-wider text-[#52525b]">Product</span>
              <span className="col-span-2 text-[9px] uppercase tracking-wider text-[#52525b] text-center">In</span>
              <span className="col-span-2 text-[9px] uppercase tracking-wider text-[#52525b] text-center">Out</span>
              <span className="col-span-2 text-[9px] uppercase tracking-wider text-[#52525b] text-right">Total</span>
            </div>
            {movers.map((item, idx) => (
              <div key={item.id} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-[10px] font-bold text-[#52525b]">
                    {idx + 1}
                  </span>
                  <div className="col-span-5 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-[#52525b]">{item.category}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-0.5 text-emerald-400">
                    <ArrowUp className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] font-semibold">{item.inbound}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-0.5 text-red-400">
                    <ArrowDown className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] font-semibold">{item.outbound}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-bold text-white">{item.total_units}</span>
                  </div>
                </div>
                <MiniBar value={item.total_units} max={maxUnits} />
              </div>
            ))}
          </div>
        )
      ) : (
        /* Dead stock tab */
        deadStock.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-400">
            ✓ All in-stock products have had movement in this period.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-[#52525b]">
              These products have had no stock movement in the selected period.
            </p>
            {deadStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#0f141c] border border-[#1c2233]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-3.5 h-3.5 text-[#52525b] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-[#52525b]">{item.category}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-amber-400">{item.current_stock} units</p>
                  <p className="text-[10px] text-[#52525b]">
                    ${(item.current_stock * item.price).toLocaleString("en-US", { maximumFractionDigits: 0 })} tied up
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
// PHASE 5 IMPLEMENTATION END
