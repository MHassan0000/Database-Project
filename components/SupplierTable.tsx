"use client";

// Phase 2 — components/SupplierTable.tsx
// Paginated, searchable, sortable supplier list table

import { useState, useEffect, useCallback } from "react";
import { Supplier } from "@/lib/types";
import { Truck, Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Pencil, Trash2 } from "lucide-react";

interface SupplierTableProps {
  onAdd: () => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onView: (supplier: Supplier) => void;
  refreshKey?: number; // increment to force refresh after create/update
}

interface PaginatedSuppliers {
  suppliers: (Supplier & { linked_products: number })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const r = Number(rating) || 0;
  return (
    <span className="flex items-center gap-1 text-xs text-[#a1a1aa]">
      <span className="text-white font-semibold">{r.toFixed(1)}</span>
      <span className="text-[#71717a]">/ 5</span>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1c2233]">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 skeleton rounded" />
        </td>
      ))}
    </tr>
  );
}

type SortKey = "name" | "rating" | "status" | "created_at";

function SortIcon({ column, active, order }: { column: SortKey; active: SortKey; order: string }) {
  if (column !== active) return <ChevronsUpDown className="w-3.5 h-3.5 text-[#52525b]" />;
  return order === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-white" />
    : <ChevronDown className="w-3.5 h-3.5 text-white" />;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function SupplierTable({
  onAdd,
  onEdit,
  onDelete,
  onView,
  refreshKey = 0,
}: SupplierTableProps) {
  const [data, setData] = useState<PaginatedSuppliers>({
    suppliers: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [status, setStatus]     = useState("all");
  const [sortBy, setSortBy]     = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage]         = useState(1);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchDebounce, status, sortBy, sortOrder]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        sortOrder,
      });
      if (searchDebounce) params.set("search", searchDebounce);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch suppliers");
      }
      const json: PaginatedSuppliers = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, searchDebounce, status, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSort = (col: SortKey) => {
    if (col === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const thClass = "text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider";
  const sortableThClass = `${thClass} cursor-pointer select-none hover:text-white transition-colors`;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white placeholder:text-[#71717a] transition-all hover:border-[#3f3f46] focus:outline-none focus:border-[#52525b]"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white appearance-none cursor-pointer hover:border-[#3f3f46] transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Add supplier */}
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-all shadow-md shadow-black/30"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="ambient-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1c2233] bg-[#0f141c]">
                <th className={thClass}>Supplier</th>
                <th
                  className={sortableThClass}
                  onClick={() => handleSort("status")}
                >
                  <span className="flex items-center gap-1">
                    Status <SortIcon column="status" active={sortBy} order={sortOrder} />
                  </span>
                </th>
                <th className={`${thClass} hidden sm:table-cell`}>Contact</th>
                <th
                  className={`${sortableThClass} hidden md:table-cell`}
                  onClick={() => handleSort("rating")}
                >
                  <span className="flex items-center gap-1">
                    Rating <SortIcon column="rating" active={sortBy} order={sortOrder} />
                  </span>
                </th>
                <th className={`${thClass} hidden lg:table-cell`}>Products</th>
                <th
                  className={`${sortableThClass} hidden lg:table-cell`}
                  onClick={() => handleSort("created_at")}
                >
                  <span className="flex items-center gap-1">
                    Added <SortIcon column="created_at" active={sortBy} order={sortOrder} />
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="stagger-children">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#8b93a7] text-sm">
                    {error}
                  </td>
                </tr>
              ) : data.suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                        <Truck className="w-7 h-7 text-[#52525b]" />
                      </div>
                      <p className="text-sm font-medium text-white">No suppliers found</p>
                      <p className="text-xs text-[#71717a]">
                        {searchDebounce || status !== "all"
                          ? "Try adjusting your search or filters"
                          : "Add your first supplier to get started"}
                      </p>
                      {!searchDebounce && status === "all" && (
                        <button
                          onClick={onAdd}
                          className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-all"
                        >
                          <Plus className="w-4 h-4" /> Add Supplier
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-[#141a26] hover:bg-[#111724] transition-colors group"
                  >
                    {/* Name + contact_person */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-[#71717a]" />
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => onView(supplier)}
                            className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors text-left truncate max-w-48 block"
                          >
                            {supplier.name}
                          </button>
                          {supplier.contact_person && (
                            <p className="text-xs text-[#71717a] truncate max-w-48">
                              {supplier.contact_person}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={supplier.status} />
                    </td>

                    {/* Contact info */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {supplier.email && (
                          <p className="text-xs text-[#a1a1aa] truncate max-w-44">{supplier.email}</p>
                        )}
                        {supplier.phone && (
                          <p className="text-xs text-[#71717a]">{supplier.phone}</p>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-xs text-[#52525b]">—</span>
                        )}
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <RatingStars rating={supplier.rating} />
                    </td>

                    {/* Linked products count */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-sm text-[#a1a1aa]">
                        {supplier.linked_products}{" "}
                        <span className="text-[#71717a] text-xs">
                          product{supplier.linked_products !== 1 ? "s" : ""}
                        </span>
                      </span>
                    </td>

                    {/* Added date */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-[#71717a]">
                        {new Date(supplier.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onView(supplier)}
                          className="p-2 rounded-lg hover:bg-[#141a26] text-[#8b93a7] hover:text-white transition-all"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(supplier)}
                          className="p-2 rounded-lg hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(supplier)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-[#8b93a7] hover:text-red-300 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && !error && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#1c2333] flex items-center justify-between">
            <p className="text-xs text-[#71717a]">
              Showing {(page - 1) * data.limit + 1}–
              {Math.min(page * data.limit, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Total count footer when no pagination */}
        {!loading && !error && data.totalPages <= 1 && data.total > 0 && (
          <div className="px-6 py-3 border-t border-[#1c2333]">
            <p className="text-xs text-[#71717a]">{data.total} supplier{data.total !== 1 ? "s" : ""} total</p>
          </div>
        )}
      </div>
    </div>
  );
}
