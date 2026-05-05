"use client";

import { useMemo } from "react";
import type { Product } from "@/lib/types";

interface InsightsPanelProps {
  products: Product[];
}

export default function InsightsPanel({ products }: InsightsPanelProps) {
  const insights = useMemo(() => {
    const total = products.length || 1;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const avgRating =
      products.reduce((acc, p) => acc + Number(p.rating || 0), 0) / total;
    return [
      {
        label: "Out of stock",
        value: outOfStock,
        detail: `${Math.round((outOfStock / total) * 100)}% of catalog`,
      },
      {
        label: "Low stock",
        value: lowStock,
        detail: `${Math.round((lowStock / total) * 100)}% of catalog`,
      },
      {
        label: "Avg rating",
        value: avgRating.toFixed(2),
        detail: "Quality signal",
      },
    ];
  }, [products]);

  return (
    <div className="ambient-card rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Operational Insights</h3>
          <p className="text-xs text-[#8b93a7]">Signals and anomalies</p>
        </div>
        <span className="text-xs text-[#8b93a7]">Realtime</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className="rounded-2xl border border-[#1c2333] bg-[#0f141c] p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">
              {insight.label}
            </p>
            <p className="text-xl font-semibold text-white mt-2">{insight.value}</p>
            <p className="text-xs text-[#8b93a7] mt-1">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
