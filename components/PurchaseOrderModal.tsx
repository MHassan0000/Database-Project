"use client";

// Phase 4 — components/PurchaseOrderModal.tsx
// Modal for creating or editing a Purchase Order.
// Features:
//  • Supplier select (fetched from /api/suppliers)
//  • Dynamic line-item builder: product select + qty + unit_price per row
//  • Tax field and computed totals
//  • Expected date and notes fields

import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Trash2, ShoppingCart, ChevronDown, Loader2,
} from "lucide-react";
import type { PurchaseOrder, Supplier, PurchaseOrderFormData } from "@/lib/types";

interface LineItemDraft {
  product_id: number | "";
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PurchaseOrderFormData) => Promise<void>;
  order?: PurchaseOrder | null;
  loading?: boolean;
  /** Optional pre-fill for "Create PO from reorder suggestion" */
  prefill?: {
    supplier_id?: number;
    product_id?: number;
    product_name?: string;
    quantity?: number;
    unit_price?: number;
  } | null;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export default function PurchaseOrderModal({
  isOpen, onClose, onSubmit, order, loading, prefill,
}: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts]   = useState<ProductOption[]>([]);
  const [supplierId, setSupplierId]   = useState<number | "">("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes]             = useState("");
  const [tax, setTax]                 = useState<number | string>(0);
  const [taxRate, setTaxRate]         = useState(0);
  const [lineItems, setLineItems]     = useState<LineItemDraft[]>([]);
  const [error, setError]             = useState<string | null>(null);

  // Load suppliers and products once when modal opens
  const loadOptions = useCallback(async () => {
    try {
      const [sRes, pRes, tRes] = await Promise.all([
        fetch("/api/suppliers?limit=100&status=active"),
        fetch("/api/products?limit=200&status=active"),
        fetch("/api/settings/tax"),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      setSuppliers(sData.suppliers ?? []);
      setProducts(pData.products ?? []);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTaxRate(Number(tData?.tax_rate ?? 0));
      }
    } catch {
      // Non-fatal
    }
  }, []);

  // When editing, pre-populate
  useEffect(() => {
    if (!isOpen) return;
    loadOptions();

    if (order) {
      setSupplierId(order.supplier_id);
      setExpectedDate(order.expected_date?.slice(0, 10) ?? "");
      setNotes(order.notes ?? "");
      setTax(order.tax ?? 0);
      const drafts: LineItemDraft[] = (order.items ?? []).map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name ?? "",
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));
      setLineItems(drafts.length > 0 ? drafts : [emptyLine()]);
    } else if (prefill) {
      if (prefill.supplier_id) setSupplierId(prefill.supplier_id);
      setLineItems([{
        product_id: prefill.product_id ?? "",
        product_name: prefill.product_name ?? "",
        quantity: prefill.quantity ?? 1,
        unit_price: prefill.unit_price ?? 0,
      }]);
      setExpectedDate("");
      setNotes("");
      setTax(0);
    } else {
      setSupplierId("");
      setExpectedDate("");
      setNotes("");
      setTax(0);
      setLineItems([emptyLine()]);
    }
    setError(null);
  }, [isOpen, order, prefill, loadOptions]);

  function emptyLine(): LineItemDraft {
    return { product_id: "", product_name: "", quantity: 1, unit_price: 0 };
  }

  function addLine() {
    setLineItems((prev) => [...prev, emptyLine()]);
  }

  function removeLine(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, field: keyof LineItemDraft, value: string | number) {
    setLineItems((prev) => {
      const next = [...prev];
      if (field === "product_id") {
        const product = products.find((p) => p.id === Number(value));
        next[i] = {
          ...next[i],
          product_id: Number(value),
          product_name: product?.name ?? "",
          unit_price: product?.price ?? next[i].unit_price,
        };
      } else {
        next[i] = { ...next[i], [field]: value };
      }
      return next;
    });
  }

  // Computed totals
  const subtotal = lineItems.reduce(
    (sum, li) =>
      li.product_id !== ""
        ? sum + Number(li.quantity || 0) * Number(li.unit_price || 0)
        : sum,
    0
  );
  const taxNum = Math.max(0, Number(tax || 0));
  const computedTax = Math.max(0, subtotal * (taxRate / 100));
  const isTaxAuto = taxNum === 0 && taxRate > 0;
  const effectiveTax = isTaxAuto ? computedTax : taxNum;
  const total  = subtotal + effectiveTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) { setError("Please select a supplier"); return; }

    const validItems = lineItems.filter(
      (li) => li.product_id !== "" && Number(li.quantity) >= 1
    );
    if (validItems.length === 0) {
      setError("Add at least one line item with a product and quantity");
      return;
    }

    await onSubmit({
      supplier_id: Number(supplierId),
      expected_date: expectedDate || undefined,
      notes,
      tax: isTaxAuto ? computedTax : taxNum,
      items: validItems.map((li) => ({
        product_id: Number(li.product_id),
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
      })),
    });
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white placeholder:text-[#71717a] focus:outline-none hover:border-[#3f3f46] transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl ambient-card rounded-3xl overflow-hidden shadow-2xl animate-fade-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1c2233] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {order ? `Edit PO #${order.id}` : "New Purchase Order"}
              </p>
              <p className="text-xs text-[#71717a]">
                {order ? "Update draft order details" : "Create a purchase order for a supplier"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#18181b] text-[#71717a] hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Supplier */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
                Supplier <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
                  className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] pointer-events-none" />
              </div>
            </div>

            {/* Dates + Notes */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
                  Tax (₨ / $)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
                {taxRate > 0 && (
                  <p className="text-[10px] text-[#52525b]">
                    Default {taxRate}% ({`$${computedTax.toFixed(2)}`}) applied when tax is 0.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes about this order…"
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
                  Line Items <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#a1a1aa] hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add item
                </button>
              </div>

              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 px-1">
                {["Product", "Qty", "Unit Price", ""].map((h) => (
                  <p key={h} className="text-[10px] uppercase tracking-wider text-[#52525b]">{h}</p>
                ))}
              </div>

              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center">
                    {/* Product select */}
                    <div className="relative">
                      <select
                        value={li.product_id}
                        onChange={(e) => updateLine(i, "product_id", e.target.value)}
                        className={`${inputClass} appearance-none pr-6 cursor-pointer text-xs`}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#71717a] pointer-events-none" />
                    </div>

                    {/* Qty */}
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={li.quantity}
                      onChange={(e) => updateLine(i, "quantity", e.target.value)}
                      className={`${inputClass} text-center text-xs`}
                    />

                    {/* Unit price */}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={li.unit_price}
                      onChange={(e) => updateLine(i, "unit_price", e.target.value)}
                      className={`${inputClass} text-right text-xs`}
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lineItems.length === 1}
                      className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-red-500/10 text-[#71717a] hover:text-red-400 transition-all disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
             <div className="border-t border-[#1c2233] pt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-[#8b93a7]">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#8b93a7]">
                <span>Tax</span>
                <span className="font-mono">${effectiveTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-[#1c2233] pt-1.5">
                <span>Total</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-[#1c2233] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#a1a1aa] hover:text-white hover:bg-[#18181b] border border-[#27272a] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <>{order ? "Update Order" : "Create Order"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
