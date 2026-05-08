"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

interface InventoryAlertsProps {
  onAdjustStock: (product: Product) => void;
}

interface AlertsPayload {
  lowStock: Product[];
  outOfStock: Product[];
}

function AlertList({
  title,
  subtitle,
  items,
  accent,
  onAdjustStock,
}: {
  title: string;
  subtitle: string;
  items: Product[];
  accent: string;
  onAdjustStock: (product: Product) => void;
}) {
  return (
    <div className="ambient-card rounded-3xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-[#8b93a7]">{subtitle}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${accent}`}>
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-[#8b93a7]">No items right now.</p>
        )}
        {items.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-4 px-3 py-2 rounded-2xl bg-[#0f141c] border border-[#1c2333]"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {product.name}
              </p>
              <p className="text-xs text-[#8b93a7] truncate">
                {product.sku || "No SKU"} - {product.category || "Uncategorized"}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${accent.includes("red") ? "text-red-300" : "text-amber-200"}`}>
                Stock {product.stock}
              </p>
              <button
                onClick={() => onAdjustStock(product)}
                className="text-xs font-semibold text-white hover:text-zinc-300 transition-colors"
              >
                Adjust
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InventoryAlerts({ onAdjustStock }: InventoryAlertsProps) {
  const [data, setData] = useState<AlertsPayload>({ lowStock: [], outOfStock: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/alerts?limit=4");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load alerts");
      setData(json);
    } catch {
      setData({ lowStock: [], outOfStock: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="ambient-card rounded-3xl p-5">
            <div className="skeleton w-24 h-4 mb-3" />
            <div className="skeleton w-32 h-3 mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((__, j) => (
                <div key={j} className="h-10 skeleton rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AlertList
        title="Low Stock"
        subtitle="Items at or below threshold"
        items={data.lowStock}
        accent="bg-amber-400/10 text-amber-100 border-amber-400/30"
        onAdjustStock={onAdjustStock}
      />
      <AlertList
        title="Out of Stock"
        subtitle="Items needing immediate replenishment"
        items={data.outOfStock}
        accent="bg-red-500/10 text-red-200 border-red-500/30"
        onAdjustStock={onAdjustStock}
      />
    </div>
  );
}
