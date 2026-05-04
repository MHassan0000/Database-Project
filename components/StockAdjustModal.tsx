"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { useToast } from "@/components/Toast";

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjusted: () => void;
  defaultProductId?: number | null;
}

interface StockAdjustForm {
  productId: string;
  delta: string;
  reason: string;
  note: string;
}

const emptyForm: StockAdjustForm = {
  productId: "",
  delta: "",
  reason: "restock",
  note: "",
};

export default function StockAdjustModal({
  isOpen,
  onClose,
  onAdjusted,
  defaultProductId,
}: StockAdjustModalProps) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<StockAdjustForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...emptyForm,
      productId: defaultProductId !== undefined && defaultProductId !== null
        ? String(defaultProductId)
        : "",
    });
    fetch("/api/products?limit=200&sortBy=name&sortOrder=asc")
      .then((res) => res.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]));
  }, [isOpen, defaultProductId]);

  if (!isOpen) return null;

  const handleChange = (field: keyof StockAdjustForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) {
      showToast("Select a product", "warning");
      return;
    }
    if (!form.delta || isNaN(Number(form.delta)) || Number(form.delta) === 0) {
      showToast("Enter a non-zero stock change", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/${form.productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delta: Number(form.delta),
          reason: form.reason,
          note: form.note,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update stock");

      showToast("Stock updated", "success");
      onAdjusted();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update stock", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div className="relative ambient-card glow-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2333]">
          <div>
            <h2 className="text-xl font-semibold text-white">Adjust Stock</h2>
            <p className="text-sm text-[#8b93a7] mt-0.5">
              Log a restock, sale, or audit adjustment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#141a26] transition-colors text-[#8b93a7] hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Product</label>
            <select
              value={form.productId}
              onChange={(e) => handleChange("productId", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white appearance-none cursor-pointer"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.sku || "No SKU"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">Stock Delta</label>
              <input
                type="number"
                value={form.delta}
                onChange={(e) => handleChange("delta", e.target.value)}
                placeholder="e.g. 12 or -5"
                className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">Reason</label>
              <select
                value={form.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white appearance-none cursor-pointer"
              >
                <option value="restock">Restock</option>
                <option value="sale">Sale</option>
                <option value="return">Return</option>
                <option value="audit">Audit</option>
                <option value="damage">Damage</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Optional context..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] resize-none bg-[#0f141c] text-white placeholder:text-[#667085]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#8b93a7] hover:bg-[#141a26] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#0b0f17] bg-linear-to-r from-[#f4d06f] to-[#7dd3fc] hover:from-[#f6e089] hover:to-[#9be0ff] transition-all shadow-lg shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? "Updating..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
