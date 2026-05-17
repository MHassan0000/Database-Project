"use client";

// Phase 2 — components/ProductModal.tsx
// Modified: added supplier dropdown, cost_price, lead_days fields
// PHASE 7 MODIFICATION: added ImageGallery section for existing products
// PHASE 9: replaced image_url text input with file upload (base64)

import { useState, useEffect, useRef, useCallback } from "react";
import { Product, ProductFormData } from "@/lib/types";
// PHASE 7 IMPLEMENTATION START
import ImageGallery from "@/components/ImageGallery";
// PHASE 7 IMPLEMENTATION END
import { Upload, X, ImageIcon } from "lucide-react";
import { productSchema, formatZodErrors } from "@/lib/validation";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product | null;
  loading?: boolean;
  // Phase 2: called after product save to link supplier if selected
  onSupplierLink?: (productId: number, supplierId: number, costPrice: number, leadDays: number) => void;
}

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home",
  "Furniture",
  "Sports",
  "Food",
  "Books",
  "Toys",
  "Beauty",
  "Automotive",
  "Other",
];

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  price: "",
  category: "Electronics",
  stock: "",
  brand: "",
  rating: "",
  image_url: "",
  sku: "",
  status: "active",
};

export default function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  loading,
  onSupplierLink,
}: ProductModalProps) {
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Phase 2: supplier selection state
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [costPrice, setCostPrice] = useState<string>("");
  const [leadDays, setLeadDays] = useState<string>("7");
  const [supplierError, setSupplierError] = useState<string>("");

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description || "",
        price: product.price,
        category: product.category || "Electronics",
        stock: product.stock,
        brand: product.brand || "",
        rating: product.rating || "",
        image_url: product.image_url || "",
        sku: product.sku || "",
        status: product.status || "active",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    // Reset supplier fields on open
    setSelectedSupplierId("");
    setCostPrice("");
    setLeadDays("7");
    setSupplierError("");
  }, [product, isOpen]);

  const validate = (): boolean => {
    const result = productSchema.safeParse(form);
    if (!result.success) {
      setErrors(formatZodErrors(result.error));
      return false;
    }

    // Phase 2: validate supplier fields if a supplier is selected
    if (selectedSupplierId) {
      if (costPrice === "" || isNaN(Number(costPrice)) || Number(costPrice) < 0) {
        setSupplierError("Cost price must be a non-negative number");
        return false;
      }
    }
    setSupplierError("");

    setErrors({});
    return true;
  };

  // Phase 2: fetch active suppliers for dropdown
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/suppliers?status=active&limit=100&sortBy=name&sortOrder=asc")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.suppliers) setSuppliers(data.suppliers);
      })
      .catch(() => { /* non-fatal: supplier dropdown just stays empty */ });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
      // Phase 2: supplier linking is handled by the parent after product ID is known
    }
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (!isOpen) return null;

  const isEditing = !!product;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative ambient-card glow-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2333]">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="text-sm text-[#8b93a7] mt-0.5">
              {isEditing
                ? "Update the product information below"
                : "Fill in the details to create a new product"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Row: Name + SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. MacBook Pro 16&quot;"
                  maxLength={255}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.name ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                  } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]`}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  SKU
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="e.g. APL-001"
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe your product..."
                rows={3}
                maxLength={5000}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  errors.description ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                } text-sm transition-all hover:border-[#2a344a] resize-none bg-[#0f141c] text-white placeholder:text-[#667085]`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Row: Price + Stock + Rating */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Price ($) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999999.99"
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.price ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                  } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]`}
                />
                {errors.price && (
                  <p className="text-xs text-red-500 mt-1">{errors.price}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  max="9999999"
                  value={form.stock}
                  onChange={(e) => handleChange("stock", e.target.value)}
                  placeholder="0"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.stock ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                  } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]`}
                />
                {errors.stock && (
                  <p className="text-xs text-red-500 mt-1">{errors.stock}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Rating (0-5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) => handleChange("rating", e.target.value)}
                  placeholder="4.5"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.rating ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                  } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]`}
                />
                {errors.rating && (
                  <p className="text-xs text-red-500 mt-1">{errors.rating}</p>
                )}
              </div>
            </div>

            {/* Row: Category + Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white appearance-none cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Brand
                </label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  placeholder="e.g. Apple"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>

            {/* Row: Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white appearance-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">
                Product Image
              </label>
              {form.image_url ? (
                <div className="relative group w-full rounded-xl border border-[#1c2333] overflow-hidden bg-[#0f141c]">
                  <div className="flex items-center gap-4 p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[#18181b] border border-[#27272a]">
                      <img
                        src={form.image_url}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">Image uploaded</p>
                      <p className="text-xs text-[#52525b] mt-0.5">Click remove to change</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange("image_url", "")}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[#71717a] hover:text-red-400 transition-all shrink-0"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-white/40", "bg-white/5"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-white/40", "bg-white/5"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-white/40", "bg-white/5");
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = () => handleChange("image_url", reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif";
                    input.onchange = (ev) => {
                      const file = (ev.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => handleChange("image_url", reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-[#27272a] hover:border-[#3f3f46] hover:bg-[#0f141c] cursor-pointer transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#71717a]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-[10px] text-[#52525b] mt-0.5">
                      JPEG · PNG · WebP · GIF · AVIF
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Phase 2: Supplier section */}
            <div className="pt-1 border-t border-[#1c2333]">
              <p className="text-xs uppercase tracking-wider text-[#71717a] mb-3 pt-2">Supplier (optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Primary Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white appearance-none cursor-pointer"
                  >
                    <option value="">— No supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => { setCostPrice(e.target.value); setSupplierError(""); }}
                    placeholder="0.00"
                    disabled={!selectedSupplierId}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      supplierError ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                    } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085] disabled:opacity-40`}
                  />
                  {supplierError && <p className="text-xs text-red-500 mt-1">{supplierError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Lead Days</label>
                  <input
                    type="number"
                    min="0"
                    value={leadDays}
                    onChange={(e) => setLeadDays(e.target.value)}
                    placeholder="7"
                    disabled={!selectedSupplierId}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085] disabled:opacity-40"
                  />
                </div>
              </div>
              {selectedSupplierId && onSupplierLink && (
                <p className="text-xs text-[#71717a] mt-2">
                  Supplier will be linked as primary when the product is saved.
                </p>
              )}
            </div>

            {/* PHASE 7 IMPLEMENTATION START — Product Images (edit mode only) */}
            {isEditing && product?.id && (
              <div className="pt-1 border-t border-[#1c2333]">
                <p className="text-xs uppercase tracking-wider text-[#71717a] mb-3 pt-2">
                  Product Images
                </p>
                <ImageGallery
                  productId={product.id}
                  onPrimaryChanged={(url) => {
                    if (url) handleChange("image_url", url);
                  }}
                />
              </div>
            )}
            {!isEditing && (
              <div className="pt-1 border-t border-[#1c2333]">
                <p className="text-xs text-[#52525b] pt-2">
                  💡 Save the product first, then re-open it to upload product images.
                </p>
              </div>
            )}
            {/* PHASE 7 IMPLEMENTATION END */}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1c2333] bg-[#0f141c]">
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
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-all shadow-lg shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>{isEditing ? "Update Product" : "Create Product"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
