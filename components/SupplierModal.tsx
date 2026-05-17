"use client";

// Phase 2 — components/SupplierModal.tsx
// Create / Edit form modal for suppliers

import { useState, useEffect } from "react";
import { Supplier, SupplierFormData, SupplierStatus } from "@/lib/types";
import { supplierSchema, formatZodErrors } from "@/lib/validation";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormData) => void;
  supplier?: Supplier | null;
  loading?: boolean;
}

const emptyForm: SupplierFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  contact_person: "",
  rating: "",
  status: "active",
  notes: "",
};

export default function SupplierModal({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  loading,
}: SupplierModalProps) {
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing an existing supplier
  useEffect(() => {
    if (supplier) {
      setForm({
        name:           supplier.name,
        email:          supplier.email          || "",
        phone:          supplier.phone          || "",
        address:        supplier.address        || "",
        website:        supplier.website        || "",
        contact_person: supplier.contact_person || "",
        rating:         supplier.rating         ?? "",
        status:         supplier.status         || "active",
        notes:          supplier.notes          || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [supplier, isOpen]);

  const validate = (): boolean => {
    const result = supplierSchema.safeParse(form);
    if (!result.success) {
      setErrors(formatZodErrors(result.error));
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (field: keyof SupplierFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  if (!isOpen) return null;

  const isEditing = !!supplier;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative ambient-card glow-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2333]">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? "Edit Supplier" : "Add New Supplier"}
            </h2>
            <p className="text-sm text-[#8b93a7] mt-0.5">
              {isEditing
                ? "Update the supplier information below"
                : "Fill in the details to create a new supplier"}
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

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">
                Supplier Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Acme Corp"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  errors.name ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Contact Person + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Contact Person</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => handleChange("contact_person", e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="supplier@example.com"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.email ? "border-red-500/50 bg-red-500/10" : "border-[#1c2333]"
                  } text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Phone + Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://supplier.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Warehouse St, City, Country"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] resize-none bg-[#0f141c] text-white placeholder:text-[#667085]"
              />
            </div>

            {/* Rating + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Rating (0–5)</label>
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
                {errors.rating && <p className="text-xs text-red-500 mt-1">{errors.rating}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value as SupplierStatus)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] bg-[#0f141c] text-white appearance-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Any additional notes about this supplier..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-[#1c2333] text-sm transition-all hover:border-[#2a344a] resize-none bg-[#0f141c] text-white placeholder:text-[#667085]"
              />
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
                <>{isEditing ? "Update Supplier" : "Create Supplier"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
