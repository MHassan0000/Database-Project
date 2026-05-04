"use client";

import { useState, useEffect } from "react";
import { Product, ProductFormData } from "@/lib/types";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product | null;
  loading?: boolean;
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
}: ProductModalProps) {
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  }, [product, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Product name is required";
    if (!form.price && form.price !== 0) newErrors.price = "Price is required";
    else if (isNaN(Number(form.price)) || Number(form.price) < 0)
      newErrors.price = "Price must be a valid positive number";

    if (form.stock !== "" && (isNaN(Number(form.stock)) || Number(form.stock) < 0))
      newErrors.stock = "Stock must be a non-negative number";

    if (
      form.rating !== "" &&
      (isNaN(Number(form.rating)) || Number(form.rating) < 0 || Number(form.rating) > 5)
    )
      newErrors.rating = "Rating must be between 0 and 5";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
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
                className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] resize-none bg-[#0f141c] text-white placeholder:text-[#667085]"
              />
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

            {/* Row: Status + Image URL */}
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
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  Image URL
                </label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => handleChange("image_url", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>

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
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#0b0f17] bg-linear-to-r from-[#f4d06f] to-[#7dd3fc] hover:from-[#f6e089] hover:to-[#9be0ff] transition-all shadow-lg shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
