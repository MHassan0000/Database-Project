"use client";

// Phase 4 — components/PurchaseOrderList.tsx
// Paginated, filterable table of purchase orders.
// Used in the "Orders" tab.

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight,
  Plus, Eye, Trash2, AlertCircle, ShoppingCart,
  Clock, Send, RotateCcw, CheckCircle2, Ban,
} from "lucide-react";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types";

interface PaginatedPOResponse {
  orders: (PurchaseOrder & { supplier_name: string; item_count: number })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  onView:   (poId: number)       => void;
  onCreate: ()                   => void;
  onDelete: (po: PurchaseOrder)  => void;
  refreshKey?: number;
}

// ── Status badge config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; badge: string; icon: React.ElementType }> = {
  draft:    { label: "Draft",    badge: "bg-[#18181b] text-[#a1a1aa] border-[#27272a]",           icon: Clock      },
  sent:     { label: "Sent",     badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",         icon: Send       },
  partial:  { label: "Partial",  badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",      icon: RotateCcw  },
  received: { label: "Received", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",icon: CheckCircle2 },
  cancelled:{ label: "Cancelled",badge: "bg-red-500/10 text-red-300 border-red-500/20",            icon: Ban        },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-[#141a26]">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 skeleton rounded" style={{ width: `${50 + i * 7}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function PurchaseOrderList({
  onView, onCreate, onDelete, refreshKey = 0,
}: Props) {
  const [data, setData]           = useState<PaginatedPOResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Filters
  const [search, setSearch]           = useState("");
  const [searchDebounce, setSD]       = useState("");
  const [statusFilter, setStatus]     = useState("all");
  const [page, setPage]               = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSD(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [searchDebounce, statusFilter]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (searchDebounce) p.set("search", searchDebounce);
      if (statusFilter !== "all") p.set("status", statusFilter);

      const res = await fetch(`/api/purchase-orders?${p.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounce, statusFilter, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const thClass = "text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier or notes…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white placeholder:text-[#71717a] focus:outline-none hover:border-[#3f3f46] transition-all"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white cursor-pointer hover:border-[#3f3f46] transition-all"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717a] pointer-events-none" />
          </div>
        </div>

        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Table */}
      <div className="ambient-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1c2233] bg-[#0f141c]">
                <th className={thClass}>PO #</th>
                <th className={thClass}>Supplier</th>
                <th className={`${thClass} hidden sm:table-cell`}>Status</th>
                <th className={`${thClass} hidden md:table-cell`}>Order Date</th>
                <th className={`${thClass} hidden md:table-cell`}>Expected</th>
                <th className={`${thClass} hidden sm:table-cell`}>Items</th>
                <th className={thClass}>Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  </td>
                </tr>
              ) : !data || data.orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                        <ShoppingCart className="w-7 h-7 text-[#52525b]" />
                      </div>
                      <p className="text-sm font-medium text-white">No purchase orders found</p>
                      <p className="text-xs text-[#71717a]">
                        {search || statusFilter !== "all"
                          ? "Try adjusting your filters"
                          : 'Click "New Order" to create your first purchase order'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.orders.map((po) => {
                  const cfg = STATUS_CONFIG[po.status];
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={po.id}
                      className="border-b border-[#141a26] hover:bg-[#111724] transition-colors group cursor-pointer"
                      onClick={() => onView(po.id)}
                    >
                      {/* PO # */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-white">#{po.id}</span>
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-4">
                        <p className="text-sm text-white truncate max-w-36">{po.supplier_name}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border ${cfg.badge}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Order date */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-xs text-[#a1a1aa]">
                          {new Date(po.order_date).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                        </span>
                      </td>

                      {/* Expected date */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-xs text-[#71717a]">
                          {po.expected_date
                            ? new Date(po.expected_date).toLocaleDateString("en-PK", { dateStyle: "medium" })
                            : "—"}
                        </span>
                      </td>

                      {/* Item count */}
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-xs text-[#a1a1aa]">{po.item_count} items</span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-white font-mono">
                          ${Number(po.total).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onView(po.id)}
                            className="p-2 rounded-lg hover:bg-[#141a26] text-[#71717a] hover:text-white transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {po.status === "draft" && (
                            <button
                              onClick={() => onDelete(po)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-[#71717a] hover:text-red-400 transition-all"
                              title="Delete draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#1c2333] flex items-center justify-between">
            <p className="text-xs text-[#71717a]">
              {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#71717a]">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {data && data.total > 0 && data.totalPages <= 1 && (
          <div className="px-6 py-3 border-t border-[#1c2333]">
            <p className="text-xs text-[#71717a]">{data.total} order{data.total !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
