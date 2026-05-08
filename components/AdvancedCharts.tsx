"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Product } from "@/lib/types";

interface AdvancedChartsProps {
  products: Product[];
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function AdvancedCharts({ products }: AdvancedChartsProps) {
  const trendData = useMemo(() => {
    if (!products.length) {
      return [
        { key: "empty-1", label: "Jan", count: 0 },
        { key: "empty-2", label: "Feb", count: 0 },
        { key: "empty-3", label: "Mar", count: 0 },
        { key: "empty-4", label: "Apr", count: 0 },
      ];
    }

    const buckets = new Map<string, number>();
    products.forEach((product) => {
      const date = new Date(product.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([key, count]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          key,
          label: `${monthNames[month]} ${String(year).slice(-2)}`,
          count,
        };
      })
      .sort((a, b) => (a.key > b.key ? 1 : -1))
      .slice(-8);
  }, [products]);

  const priceData = useMemo(() => {
    const buckets = [
      { label: "0-50", min: 0, max: 50, count: 0 },
      { label: "50-200", min: 50, max: 200, count: 0 },
      { label: "200-500", min: 200, max: 500, count: 0 },
      { label: "500-1000", min: 500, max: 1000, count: 0 },
      { label: "1000+", min: 1000, max: Number.POSITIVE_INFINITY, count: 0 },
    ];

    products.forEach((product) => {
      const price = Number(product.price);
      const bucket = buckets.find((b) => price >= b.min && price < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [products]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="ambient-card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Catalog Momentum</h3>
            <p className="text-xs text-[#8b93a7]">New products added per month</p>
          </div>
          <span className="text-xs text-[#8b93a7]">Last 8 months</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#4b5563" tick={{ fontSize: 10 }} axisLine={false} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#0f141c",
                  border: "1px solid #1c2333",
                  borderRadius: "12px",
                  color: "#e5e7eb",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#ffffff"
                strokeWidth={2}
                fill="url(#trend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ambient-card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Price Mix</h3>
            <p className="text-xs text-[#8b93a7]">Distribution across pricing tiers</p>
          </div>
          <span className="text-xs text-[#8b93a7]">Realtime</span>
        </div>
        <div className="space-y-3">
          {priceData.map((bucket) => (
            <div key={bucket.label}>
              <div className="flex items-center justify-between text-xs text-[#8b93a7]">
                <span>{bucket.label}</span>
                <span className="text-white font-semibold">{bucket.count}</span>
              </div>
              <div className="w-full h-2 bg-[#101624] rounded-full">
                <div
                  className="h-2 rounded-full bg-linear-to-r from-white to-[#52525b]"
                  style={{
                    width: `${products.length ? (bucket.count / products.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
