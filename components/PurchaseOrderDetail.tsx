"use client";

// Phase 4 — components/PurchaseOrderDetail.tsx
// Full detail view for a single Purchase Order.
// Shows supplier info, status badge, line items table, and receive-stock form.

import { useState, useEffect, useCallback } from "react";
import {
  X, Truck, Package, CheckCircle2, Clock, Ban, Send,
  ChevronRight, Loader2, AlertCircle, RotateCcw,
} from "lucide-react";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/lib/types";

interface DetailPO extends PurchaseOrder {
  supplier_email?: string;
  supplier_phone?: string;
  supplier_contact?: string;
  items: (PurchaseOrderItem & {
    product_name: string;
    product_sku: string;
    current_stock: number;
    product_category: string;
  })[];
}

interface Props {
  poId: number | null;
  onClose: () => void;
  onEdit?: (po: PurchaseOrder) => void;
  onRefresh: () => void;
  canEdit?: boolean;
  canReceive?: boolean;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  PurchaseOrderStatus,
  { label: string; badge: string; icon: React.ElementType }
> = {
  draft:    { label: "Draft",    badge: "bg-[#18181b] text-[#a1a1aa] border-[#27272a]",           icon: Clock     },
  sent:     { label: "Sent",     badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",         icon: Send      },
  partial:  { label: "Partial",  badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",      icon: RotateCcw },
  received: { label: "Received", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",icon: CheckCircle2 },
  cancelled:{ label: "Cancelled",badge: "bg-red-500/10 text-red-300 border-red-500/20",            icon: Ban       },
};

export default function PurchaseOrderDetail({
  poId,
  onClose,
  onEdit,
  onRefresh,
  canEdit = true,
  canReceive = true,
}: Props) {
  const [po, setPo]               = useState<DetailPO | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);

  // Receive form state: item_id → qty to receive
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [showReceiveForm, setShowReceiveForm] = useState(false);

  const fetchPO = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to load PO");
      }
      const data: DetailPO = await res.json();
      setPo(data);
      // Init receive form with remaining qty
      const qtys: Record<number, number> = {};
      for (const item of data.items) {
        qtys[item.id] = item.quantity - item.received_qty;
      }
      setReceiveQtys(qtys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    if (poId) fetchPO();
  }, [poId, fetchPO]);

  // ── Status transition ────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: PurchaseOrderStatus) => {
    if (!po) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to update status");
      }
      await fetchPO();
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Receive stock ────────────────────────────────────────────────────────────
  const handleReceive = async () => {
    if (!po) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const items = po.items
        .filter((item) => (receiveQtys[item.id] ?? 0) > 0)
        .map((item) => ({
          item_id: item.id,
          received_qty: receiveQtys[item.id] ?? 0,
        }));

      if (items.length === 0) {
        setActionError("Enter a quantity greater than 0 for at least one item");
        return;
      }

      const res = await fetch(`/api/purchase-orders/${po.id}/receive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to receive stock");
      }
      setShowReceiveForm(false);
      await fetchPO();
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  };

  if (!poId) return null;

  const inputClass =
    "w-20 px-2 py-1.5 rounded-lg border border-[#27272a] bg-[#0f141c] text-sm text-white text-center focus:outline-none hover:border-[#3f3f46] transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl ambient-card rounded-3xl overflow-hidden shadow-2xl animate-fade-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1c2233] flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">
              {loading ? "Loading…" : po ? `PO #${po.id}` : "Purchase Order"}
            </p>
            {po && (
              <p className="text-xs text-[#71717a] mt-0.5">
                {new Date(po.order_date).toLocaleDateString("en-PK", { dateStyle: "long" })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#18181b] text-[#71717a] hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 skeleton rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-2xl px-4 py-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : po ? (
            <>
              {/* Status + actions row */}
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const cfg = STATUS_CONFIG[po.status];
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${cfg.badge}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  );
                })()}

                {/* Transition buttons */}
                 {po.status === "draft" && canEdit && onEdit && (
                   <>
                     <button
                       onClick={() => onEdit(po)}
                       className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] transition-all"
                     >
                       Edit
                     </button>
                     <button
                       onClick={() => handleStatusChange("sent")}
                       disabled={actionLoading}
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                     >
                       <Send className="w-3.5 h-3.5" /> Mark as Sent
                     </button>
                     <button
                       onClick={() => handleStatusChange("cancelled")}
                       disabled={actionLoading}
                       className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                     >
                       Cancel PO
                     </button>
                   </>
                 )}
                 {(po.status === "sent" || po.status === "partial") && canReceive && (
                   <>
                     <button
                       onClick={() => setShowReceiveForm((p) => !p)}
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                     >
                       <CheckCircle2 className="w-3.5 h-3.5" />
                       {showReceiveForm ? "Hide Receive" : "Receive Stock"}
                     </button>
                     <button
                       onClick={() => handleStatusChange("cancelled")}
                       disabled={actionLoading}
                       className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                     >
                       Cancel PO
                     </button>
                   </>
                 )}
              </div>

              {/* Error */}
              {actionError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {actionError}
                </div>
              )}

              {/* Supplier */}
              <div className="ambient-card rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-[#a1a1aa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{po.supplier_name}</p>
                  {po.supplier_email && (
                    <p className="text-xs text-[#71717a]">{po.supplier_email}</p>
                  )}
                  {po.supplier_phone && (
                    <p className="text-xs text-[#71717a]">{po.supplier_phone}</p>
                  )}
                </div>
                <div className="text-right text-xs text-[#71717a] shrink-0">
                  {po.expected_date && (
                    <p>Due {new Date(po.expected_date).toLocaleDateString()}</p>
                  )}
                  {po.received_date && (
                    <p className="text-emerald-400">Received {new Date(po.received_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div className="ambient-card rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1c2233] bg-[#0f141c]">
                      {["Product", "Ordered", "Received", showReceiveForm ? "Receive Now" : "Line Total"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item) => {
                      const remaining = item.quantity - item.received_qty;
                      const isFullyReceived = remaining <= 0;
                      return (
                        <tr key={item.id} className="border-b border-[#141a26]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0">
                                <Package className="w-3.5 h-3.5 text-[#71717a]" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">{item.product_name}</p>
                                <p className="text-[10px] text-[#71717a]">{item.product_sku || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-white">
                            {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${isFullyReceived ? "text-emerald-400" : "text-[#a1a1aa]"}`}>
                              {item.received_qty}/{item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {showReceiveForm && !isFullyReceived ? (
                              <input
                                type="number"
                                min={0}
                                max={remaining}
                                value={receiveQtys[item.id] ?? remaining}
                                onChange={(e) =>
                                  setReceiveQtys((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)),
                                  }))
                                }
                                className={inputClass}
                              />
                            ) : showReceiveForm && isFullyReceived ? (
                              <span className="text-[10px] text-emerald-400 font-semibold">Done</span>
                            ) : (
                              <span className="text-xs text-white font-mono">
                                ${Number(item.line_total).toFixed(2)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Receive confirm button */}
                 {showReceiveForm && (
                   <div className="px-4 py-4 border-t border-[#1c2233] flex items-center justify-between">
                     <p className="text-xs text-[#71717a]">
                       Enter quantities received and confirm to update stock levels.
                     </p>
                     <button
                       onClick={handleReceive}
                       disabled={actionLoading}
                       className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 disabled:opacity-50 transition-all"
                     >
                       {actionLoading ? (
                         <><Loader2 className="w-4 h-4 animate-spin" />Receiving…</>
                       ) : (
                         <><CheckCircle2 className="w-4 h-4" />Confirm Receipt</>
                       )}
                     </button>
                   </div>
                 )}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Subtotal", value: `$${Number(po.subtotal).toFixed(2)}` },
                  { label: "Tax",      value: `$${Number(po.tax).toFixed(2)}` },
                  { label: "Total",    value: `$${Number(po.total).toFixed(2)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="ambient-card rounded-2xl p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#71717a] mb-1">{label}</p>
                    <p className="text-sm font-bold text-white font-mono">{value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {po.notes && (
                <div className="bg-[#0f141c] rounded-2xl p-4 border border-[#1c2233]">
                  <p className="text-[10px] uppercase tracking-wider text-[#52525b] mb-1">Notes</p>
                  <p className="text-xs text-[#a1a1aa]">{po.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1c2233] shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
