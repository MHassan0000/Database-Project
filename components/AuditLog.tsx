"use client";

// Phase 3 — components/AuditLog.tsx
// Full searchable, filterable, paginated audit log table.
// Shown in the dedicated "Audit" tab in page.tsx.

import { useState, useEffect, useCallback } from "react";
import { AuditLog as AuditLogEntry } from "@/lib/types";
import {
  Search, Filter, ChevronDown,
  Plus, Pencil, Trash2, BarChart2, Layers,
  PackageMinus, Truck, Clock, Package, Tag,
  ChevronLeft, ChevronRight, Eye, AlertCircle,
} from "lucide-react";
import AuditDetail from "@/components/AuditDetail";

interface PaginatedAuditResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badge: string }> = {
  create:       { label: "Create",        icon: Plus,         color: "text-emerald-300", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  update:       { label: "Update",        icon: Pencil,       color: "text-blue-300",    badge: "bg-blue-500/10 text-blue-300 border-blue-500/20"         },
  delete:       { label: "Delete",        icon: Trash2,       color: "text-red-300",     badge: "bg-red-500/10 text-red-300 border-red-500/20"           },
  stock_adjust: { label: "Stock Adjust",  icon: BarChart2,    color: "text-amber-300",   badge: "bg-amber-500/10 text-amber-300 border-amber-500/20"     },
  bulk_update:  { label: "Bulk Update",   icon: Layers,       color: "text-purple-300",  badge: "bg-purple-500/10 text-purple-300 border-purple-500/20"   },
  bulk_delete:  { label: "Bulk Delete",   icon: PackageMinus, color: "text-rose-300",    badge: "bg-rose-500/10 text-rose-300 border-rose-500/20"         },
  receive_po:   { label: "Receive PO",    icon: Truck,        color: "text-cyan-300",    badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"         },
};

const ENTITY_ICON: Record<string, React.ElementType> = {
  product:        Package,
  supplier:       Truck,
  purchase_order: Tag,
  user:           Clock,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#141a26]">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 skeleton rounded w-full" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuditLog() {
  const [data, setData]           = useState<PaginatedAuditResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<AuditLogEntry | null>(null);

  // Filters
  const [search, setSearch]         = useState("");
  const [searchDebounce, setSD]     = useState("");
  const [entityType, setEntityType] = useState("all");
  const [action, setAction]         = useState("all");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [page, setPage]             = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSD(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchDebounce, entityType, action, dateFrom, dateTo]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (searchDebounce) p.set("search",      searchDebounce);
      if (entityType !== "all") p.set("entity_type", entityType);
      if (action !== "all")     p.set("action",      action);
      if (dateFrom)             p.set("date_from",   dateFrom);
      if (dateTo)               p.set("date_to",     dateTo);

      const res = await fetch(`/api/audit?${p.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounce, entityType, action, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const thClass = "text-left px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider";

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          {/* Row 1: search + quick filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entity or actor..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white placeholder:text-[#71717a] focus:outline-none hover:border-[#3f3f46] transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Entity type */}
              <div className="relative">
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white cursor-pointer hover:border-[#3f3f46] transition-all"
                >
                  <option value="all">All Entities</option>
                  <option value="product">Product</option>
                  <option value="supplier">Supplier</option>
                  <option value="purchase_order">Purchase Order</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717a] pointer-events-none" />
              </div>

              {/* Action */}
              <div className="relative">
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-sm text-white cursor-pointer hover:border-[#3f3f46] transition-all"
                >
                  <option value="all">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="stock_adjust">Stock Adjust</option>
                  <option value="bulk_update">Bulk Update</option>
                  <option value="bulk_delete">Bulk Delete</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717a] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#71717a]" />
            <span className="text-xs text-[#71717a]">Date range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-xs text-white focus:outline-none hover:border-[#3f3f46] transition-all"
            />
            <span className="text-xs text-[#52525b]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#27272a] bg-[#0f141c] text-xs text-white focus:outline-none hover:border-[#3f3f46] transition-all"
            />
            {(dateFrom || dateTo || search || entityType !== "all" || action !== "all") && (
              <button
                onClick={() => { setSearch(""); setSD(""); setEntityType("all"); setAction("all"); setDateFrom(""); setDateTo(""); }}
                className="text-xs text-[#71717a] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[#18181b]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="ambient-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1c2233] bg-[#0f141c]">
                  <th className={thClass}>Action</th>
                  <th className={thClass}>Entity</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Name</th>
                  <th className={`${thClass} hidden md:table-cell`}>Performed By</th>
                  <th className={`${thClass} hidden lg:table-cell`}>IP</th>
                  <th className={thClass}>Time</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b93a7] uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-red-400">
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    </td>
                  </tr>
                ) : !data || data.logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                          <Clock className="w-7 h-7 text-[#52525b]" />
                        </div>
                        <p className="text-sm font-medium text-white">No audit entries found</p>
                        <p className="text-xs text-[#71717a]">
                          {search || entityType !== "all" || action !== "all"
                            ? "Try adjusting your filters"
                            : "Entries appear when products or suppliers are created, updated, or deleted"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.logs.map((log) => {
                    const cfg = ACTION_CONFIG[log.action] ?? {
                      label: log.action,
                      icon: Clock,
                      color: "text-[#a1a1aa]",
                      badge: "bg-[#18181b] text-[#a1a1aa] border-[#27272a]",
                    };
                    const ActionIcon = cfg.icon;
                    const EIcon = ENTITY_ICON[log.entity_type] ?? Package;
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-[#141a26] hover:bg-[#111724] transition-colors group"
                      >
                        {/* Action badge */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border ${cfg.badge}`}>
                            <ActionIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Entity type */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                            <EIcon className="w-3 h-3 text-[#71717a]" />
                            {log.entity_type}
                          </span>
                        </td>

                        {/* Entity name */}
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <p className="text-xs text-white truncate max-w-40">
                            {log.entity_name ?? <span className="text-[#52525b]">—</span>}
                          </p>
                          {log.entity_id && (
                            <p className="text-[10px] text-[#52525b]">#{log.entity_id}</p>
                          )}
                        </td>

                        {/* Actor */}
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-[#a1a1aa]">{log.performed_by}</span>
                        </td>

                        {/* IP */}
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-[#71717a]">{log.ip_address ?? "—"}</span>
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-[#71717a]" title={new Date(log.created_at).toLocaleString()}>
                            {timeAgo(log.created_at)}
                          </span>
                        </td>

                        {/* View details */}
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelected(log)}
                              className="p-2 rounded-lg hover:bg-[#141a26] text-[#71717a] hover:text-white transition-all"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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
                {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total} entries
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

          {/* Row count footer */}
          {data && data.totalPages <= 1 && data.total > 0 && (
            <div className="px-6 py-3 border-t border-[#1c2333]">
              <p className="text-xs text-[#71717a]">{data.total} entr{data.total === 1 ? "y" : "ies"} total</p>
            </div>
          )}
        </div>
      </div>

      {/* AuditDetail modal */}
      {selected && (
        <AuditDetail entry={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
