"use client";

// Phase 5 — components/analytics/TrendChart.tsx
// Dual area chart (inbound / outbound) for stock movement trends over time.
// Data: /api/analytics/trends

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertCircle, TrendingUp } from "lucide-react";
import type { AnalyticsPeriod, TrendDataPoint } from "@/lib/types";
import DateRangePicker from "./DateRangePicker";

// PHASE 5 ANALYTICS FIX START
// Fixed tooltip values incorrectly showing 0 on non-zero chart spikes.
//
// Root cause 1 — XAxis dataKey="label":
//   The original code mutated each data point to add a `label` field (formatted
//   date string or empty string ""), then used dataKey="label" on the XAxis.
//   Recharts uses the XAxis dataKey to resolve hover indices. When a label is ""
//   (empty string), recharts cannot correctly map the hover position to the data
//   array index, causing the tooltip payload to come from the WRONG row → shows 0.
//
// Root cause 2 — type="monotone" Bezier interpolation:
//   Smooth monotone curves create visual "humps" that peak BETWEEN actual data
//   points. Example: if May 7=30 and May 8=0, the visual peak appears around
//   May 7.5. When a user hovers over the visual peak, recharts snaps to the
//   nearest data point by index (May 8, value=0) → tooltip shows 0 even though
//   the spike is clearly visible.
//
// Fix applied:
//   1. Pass raw `data` array directly to AreaChart (no label mutation).
//   2. XAxis dataKey="date" — hover index resolves to the exact data row.
//      Tooltip `label` prop receives the raw ISO date string, formatted in
//      CustomTooltip via shortDate().
//   3. tickFormatter + interval on XAxis control how many date labels show
//      without corrupting the underlying dataset.
//   4. type="linear" draws straight lines between data points so every visual
//      spike sits exactly on the data point that produced it — tooltip always
//      matches what the user sees.
// PHASE 5 ANALYTICS FIX END

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// CustomTooltip: `label` = raw ISO date from XAxis dataKey="date".
// `payload` = recharts-resolved inbound/outbound values for the hovered row.
function CustomTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { color: string; name: string; value: number }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ambient-card rounded-xl px-3 py-2 shadow-xl border border-[#1c2233] text-xs space-y-1">
      <p className="text-[#71717a] mb-1 font-medium">
        {label ? shortDate(label) : ""}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#a1a1aa] capitalize">{p.name}:</span>
          <span className="text-white font-semibold">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrendChart() {
  const [period,  setPeriod]  = useState<AnalyticsPeriod>("30d");
  const [data,    setData]    = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/trends?period=${period}&groupBy=day`);
      if (!res.ok) throw new Error("Failed to load trend data");
      const json = await res.json();
      setData(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const totalInbound  = data.reduce((s, d) => s + d.inbound,  0);
  const totalOutbound = data.reduce((s, d) => s + d.outbound, 0);

  // Limit X-axis ticks to ~10 visible labels regardless of period length.
  // This controls display only — the full data array is still passed to the chart.
  const tickInterval = Math.max(0, Math.ceil(data.length / 10) - 1);

  return (
    <div id="analytics-trend-chart" className="ambient-card rounded-3xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#a1a1aa]" />
            <h3 className="text-sm font-semibold text-white">Stock Movement Trends</h3>
          </div>
          <p className="text-xs text-[#71717a] mt-0.5">Daily inbound vs outbound units</p>
        </div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      {!loading && !error && (
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-[#a1a1aa]">
              Inbound: <span className="text-white font-semibold">{totalInbound.toLocaleString()}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
            <span className="text-[11px] text-[#a1a1aa]">
              Outbound: <span className="text-white font-semibold">{totalOutbound.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}

      <div className="h-52">
        {loading ? (
          <div className="h-full skeleton rounded-2xl" />
        ) : error ? (
          <div className="h-full flex items-center justify-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        ) : totalInbound === 0 && totalOutbound === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#52525b] text-center px-8">
            No movement data for this period. Receive a purchase order to generate activity.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={0}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#f87171" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2233" vertical={false} />
              {/*
                ANALYTICS BUGFIX: dataKey="date" (raw ISO string) instead of "label".
                tickFormatter converts it to "May 7" only for display — the underlying
                data array is untouched, so hover index always resolves correctly.
              */}
              <XAxis
                dataKey="date"
                stroke="#3f3f46"
                tick={{ fontSize: 9, fill: "#52525b" }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
                tickFormatter={shortDate}
              />
              <YAxis
                stroke="#3f3f46"
                tick={{ fontSize: 9, fill: "#52525b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#71717a" }} />
              {/*
                ANALYTICS BUGFIX: type="linear" replaces type="monotone".
                Linear draws straight lines between points so the visual spike
                sits exactly ON the data point — not between two points as with
                Bezier interpolation. Every hover now resolves to a real value.
              */}
              <Area
                type="linear"
                dataKey="inbound"
                name="inbound"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#inboundGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#34d399" }}
              />
              <Area
                type="linear"
                dataKey="outbound"
                name="outbound"
                stroke="#f87171"
                strokeWidth={2}
                fill="url(#outboundGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#f87171" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
