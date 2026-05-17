"use client";

// Phase 5 — components/analytics/ValueChart.tsx
// Line chart showing inventory value over time.
// Data: /api/analytics/value-history

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertCircle, DollarSign } from "lucide-react";
import type { AnalyticsPeriod, ValueHistoryPoint } from "@/lib/types";
import DateRangePicker from "./DateRangePicker";

// PHASE 5 IMPLEMENTATION START

function CustomTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { value: number }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  const val = Number(payload[0].value);
  return (
    <div className="ambient-card rounded-xl px-3 py-2 shadow-xl border border-[#1c2233] text-xs">
      <p className="text-[#71717a] mb-1">{label}</p>
      <p className="text-white font-semibold">
        ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ValueChart() {
  const [period,       setPeriod]       = useState<AnalyticsPeriod>("90d");
  const [data,         setData]         = useState<ValueHistoryPoint[]>([]);
  const [currentValue, setCurrentValue] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/value-history?period=${period}`);
      if (!res.ok) throw new Error("Failed to load value history");
      const json = await res.json();
      setData(json.data ?? []);
      setCurrentValue(json.currentValue ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const firstVal = data[0]?.inventory_value ?? 0;
  const lastVal  = data[data.length - 1]?.inventory_value ?? 0;
  const pct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

  const step = Math.max(1, Math.ceil(data.length / 12));
  const chartData = data.map((d, i) => ({
    ...d,
    label: i % step === 0 ? shortDate(d.date) : "",
  }));

  return (
    <div id="analytics-value-chart" className="ambient-card rounded-3xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#a1a1aa]" />
            <h3 className="text-sm font-semibold text-white">Inventory Value History</h3>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-lg font-bold text-white font-mono">{fmtVal(currentValue)}</p>
            {data.length > 1 && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                pct >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      <div className="h-52">
        {loading ? (
          <div className="h-full skeleton rounded-2xl" />
        ) : error ? (
          <div className="h-full flex items-center justify-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#52525b] text-center px-8">
            No value history yet. Stock adjustments and received POs will populate this chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2233" vertical={false} />
              <XAxis dataKey="label" stroke="#3f3f46" tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#3f3f46" tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} tickFormatter={fmtVal} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="inventory_value" stroke="#ffffff" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#ffffff" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
// PHASE 5 IMPLEMENTATION END
