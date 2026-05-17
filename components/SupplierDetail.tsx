"use client";

// Phase 2 — components/SupplierDetail.tsx
// Detail view for a single supplier — shows info and linked products

import { useEffect, useState } from "react";
import { Supplier, ProductSupplier } from "@/lib/types";
import { Truck, Mail, Phone, Globe, MapPin, Star, Package, Trash2 } from "lucide-react";

interface SupplierDetailProps {
  supplierId: number;
  onEdit: (supplier: Supplier) => void;
  onBack: () => void;
  onUnlinkProduct: (productId: number) => void;
}

interface SupplierWithProducts extends Supplier {
  linked_products: (ProductSupplier & {
    name: string;
    sku: string;
    category: string;
    stock: number;
    price: number;
    status: string;
    brand: string;
  })[];
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="text-[#71717a] mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-[#71717a] uppercase tracking-wider">{label}</p>
        <p className="text-sm text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function SupplierDetail({ supplierId, onEdit, onBack, onUnlinkProduct }: SupplierDetailProps) {
  const [supplier, setSupplier] = useState<SupplierWithProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSupplier() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/suppliers/${supplierId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load supplier");
        }
        const data: SupplierWithProducts = await res.json();
        if (!cancelled) setSupplier(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSupplier();
    return () => { cancelled = true; };
  }, [supplierId]);

  const handleUnlink = async (productId: number) => {
    setUnlinkingId(productId);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/products/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to unlink product");
      }
      // Remove from local state
      setSupplier((prev) =>
        prev
          ? { ...prev, linked_products: prev.linked_products.filter((p) => p.product_id !== productId) }
          : prev
      );
      onUnlinkProduct(productId);
    } catch (err) {
      console.error(err);
    } finally {
      setUnlinkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 skeleton w-40 rounded" />
        <div className="ambient-card rounded-2xl p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 skeleton rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="ambient-card rounded-2xl p-8 text-center">
        <p className="text-[#8b93a7] text-sm">{error || "Supplier not found"}</p>
        <button
          onClick={onBack}
          className="mt-4 text-xs text-white underline underline-offset-2"
        >
          ← Back to suppliers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-[#71717a] hover:text-white transition-colors mb-2 flex items-center gap-1"
          >
            ← Back to suppliers
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#a1a1aa]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{supplier.name}</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  supplier.status === "active"
                    ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/30"
                    : "bg-slate-500/10 text-slate-300 border-slate-500/30"
                }`}
              >
                {supplier.status}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onEdit(supplier)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-all"
        >
          Edit Supplier
        </button>
      </div>

      {/* Info + Rating */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact info */}
        <div className="lg:col-span-2 ambient-card rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white mb-3">Contact Details</h3>
          <InfoRow icon={<Mail className="w-4 h-4" />}  label="Email"          value={supplier.email} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone"          value={supplier.phone} />
          <InfoRow icon={<Globe className="w-4 h-4" />} label="Website"        value={supplier.website} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address"       value={supplier.address} />
          <InfoRow icon={<Truck className="w-4 h-4" />} label="Contact Person" value={supplier.contact_person} />
          {supplier.notes && (
            <div className="pt-2 border-t border-[#1c2333]">
              <p className="text-xs text-[#71717a] uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-[#a1a1aa]">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* Rating card */}
        <div className="ambient-card rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center">
          <Star className="w-8 h-8 text-[#a1a1aa]" />
          <p className="text-3xl font-bold text-white">
            {supplier.rating ? Number(supplier.rating).toFixed(1) : "—"}
          </p>
          <p className="text-xs text-[#71717a]">Supplier Rating</p>
          <p className="text-xs text-[#52525b] mt-1">
            {supplier.linked_products.length} linked product{supplier.linked_products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Linked products table */}
      <div className="ambient-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1c2333]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-[#71717a]" />
            Linked Products
            <span className="ml-1 text-xs text-[#71717a]">({supplier.linked_products.length})</span>
          </h3>
        </div>

        {supplier.linked_products.length === 0 ? (
          <div className="p-8 text-center text-[#8b93a7] text-sm">
            No products linked to this supplier yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0f141c]">
                  {["Product", "SKU", "Cost Price", "Lead Days", "Min Qty", "Primary", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplier.linked_products.map((p) => (
                  <tr key={p.product_id} className="border-b border-[#141a26] hover:bg-[#111724] transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-[#8b93a7]">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-sm text-white">${Number(p.cost_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-[#a1a1aa]">{p.lead_days}d</td>
                    <td className="px-4 py-3 text-sm text-[#a1a1aa]">{p.min_order_qty}</td>
                    <td className="px-4 py-3">
                      {p.is_primary ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
                          Primary
                        </span>
                      ) : (
                        <span className="text-xs text-[#52525b]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUnlink(p.product_id)}
                        disabled={unlinkingId === p.product_id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#8b93a7] hover:text-red-300 transition-all disabled:opacity-40"
                        title="Unlink product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
