"use client";

// Phase 4 — components/ReorderSuggestions.tsx
// Lists products at/below reorder_point, with primary supplier and a quick
// "Create PO" action that opens PurchaseOrderModal pre-filled.

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, PackageMinus, RefreshCw, ChevronRight, AlertCircle } from "lucide-react";

interface ReorderItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  reorder_point: number;
  reorder_qty: number;
  deficit: number;
  suggested_qty: number;
  estimated_cost: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_status: string | null;
  cost_price: number | null;
  lead_days: number | null;
}

interface Props {
  onCreatePO?: (item: ReorderItem) => void;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#141a26]">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 skeleton rounded" style={{ width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function ReorderSuggestions({ onCreatePO }: Props) {
  const [items, setItems]     = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reorder-suggestions?limit=50");
      if (!res.ok) throw new Error("Failed to load reorder suggestions");
      const data = await res.json();
      setItems(data.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const urgency = (item: ReorderItem) => {
    if (item.stock === 0) return "out";
    if (item.deficit > item.reorder_qty / 2) return "critical";
    return "low";
  };

  const URGENCY = {
    out:      "bg-red-500/10 text-red-300 border-red-500/20",
    critical: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    low:      "bg-yellow-500/10 text-yellow-200 border-yellow-500/20",
  };

  const URGENCY_LABEL = {
    out:      "Out of Stock",
    critical: "Critical",
    low:      "Low Stock",
  };

  return (
    <div className="ambient-card rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1c2233] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <PackageMinus className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Reorder Suggestions</p>
            <p className="text-xs text-[#71717a]">
              Products at or below their reorder threshold
            </p>
          </div>
        </div>
        <button
          onClick={fetch_}
          className="p-2 rounded-xl hover:bg-[#18181b] text-[#71717a] hover:text-white transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c2233] bg-[#0f141c]">
              {["Product", "Category", "Stock / Reorder", "Urgency", "Primary Supplier", "Action"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-white">All stock levels healthy</p>
                    <p className="text-xs text-[#71717a]">No products are currently below their reorder threshold.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const u = urgency(item);
                return (
                  <tr key={item.id} className="border-b border-[#141a26] hover:bg-[#111724] transition-colors group">
                    {/* Product */}
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-[#71717a]">{item.sku || "—"}</p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span className="text-xs text-[#a1a1aa]">{item.category || "—"}</span>
                    </td>

                    {/* Stock / Reorder */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${item.stock === 0 ? "text-red-400" : "text-amber-300"}`}>
                          {item.stock}
                        </span>
                        <span className="text-xs text-[#52525b]">/ {item.reorder_point}</span>
                      </div>
                      <p className="text-xs text-[#71717a]">Suggest +{item.suggested_qty}</p>
                    </td>

                    {/* Urgency badge */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${URGENCY[u]}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {URGENCY_LABEL[u]}
                      </span>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-4">
                      {item.supplier_name ? (
                        <div>
                          <p className="text-xs text-white">{item.supplier_name}</p>
                          {item.lead_days && (
                            <p className="text-[10px] text-[#52525b]">{item.lead_days}d lead time</p>
                          )}
                          {item.estimated_cost && (
                            <p className="text-[10px] text-emerald-400">${item.estimated_cost} est.</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#52525b]">No supplier linked</span>
                      )}
                    </td>

                    {/* Create PO action */}
                    <td className="px-4 py-4">
                      {onCreatePO && (
                        <button
                          onClick={() => onCreatePO(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] hover:border-white/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          Create PO
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {items.length > 0 && !loading && (
        <div className="px-6 py-3 border-t border-[#1c2233]">
          <p className="text-xs text-[#71717a]">
            {items.length} product{items.length !== 1 ? "s" : ""} need attention
          </p>
        </div>
      )}
    </div>
  );
}
