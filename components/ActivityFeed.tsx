"use client";

// Phase 3 — components/ActivityFeed.tsx
// Recent actions timeline shown on the Overview dashboard.
// Polls /api/audit/stats for the last 10 entries and renders them as a vertical timeline.

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, BarChart2, Layers, PackageMinus,
  RefreshCw, Clock, AlertCircle, Truck,
} from "lucide-react";

interface ActivityEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  performed_by: string;
  created_at: string;
}

// ── Config maps ──────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create:       { label: "Created",       icon: Plus,        color: "text-emerald-400" },
  update:       { label: "Updated",       icon: Pencil,      color: "text-blue-400"   },
  delete:       { label: "Deleted",       icon: Trash2,      color: "text-red-400"    },
  stock_adjust: { label: "Stock Adjusted",icon: BarChart2,   color: "text-amber-400"  },
  bulk_update:  { label: "Bulk Updated",  icon: Layers,      color: "text-purple-400" },
  bulk_delete:  { label: "Bulk Deleted",  icon: PackageMinus,color: "text-rose-400"   },
  receive_po:   { label: "PO Received",   icon: Truck,       color: "text-cyan-400"   },
};

const ENTITY_LABEL: Record<string, string> = {
  product:        "product",
  supplier:       "supplier",
  purchase_order: "purchase order",
  user:           "user",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityFeed() {
  const [entries, setEntries]   = useState<ActivityEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [restricted, setRestricted] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRestricted(false);
    try {
      const res = await fetch("/api/audit/stats", { credentials: "include" });
      // PHASE 8 FIX: distinguish 403 (permission) from real errors
      if (res.status === 403) { setRestricted(true); return; }
      if (!res.ok) throw new Error("Failed to load activity");
      const data = await res.json();
      setEntries(data.recentActivity ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ambient-card rounded-3xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <p className="text-xs text-[#71717a] mt-0.5">Live audit trail — last 10 actions</p>
        </div>
        <button
          onClick={fetchActivity}
          className="p-2 rounded-xl hover:bg-[#18181b] text-[#71717a] hover:text-white transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 skeleton rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="w-48 h-3 skeleton rounded" />
                <div className="w-24 h-2.5 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : restricted ? (
        <div className="flex items-center gap-2 text-xs text-[#52525b] py-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Activity log requires Manager or Admin access.
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-red-400 py-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>

      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#71717a]">
          No activity recorded yet. Create or update products and suppliers to see the trail.
        </div>
      ) : (
        <ol className="relative border-l border-[#1c2233] ml-3 space-y-5">
          {entries.map((entry) => {
            const cfg = ACTION_CONFIG[entry.action] ?? {
              label: entry.action,
              icon: Clock,
              color: "text-[#71717a]",
            };
            const Icon = cfg.icon;
            return (
              <li key={entry.id} className="ml-5">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-xl bg-[#0f141c] border border-[#1c2233]">
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-white leading-snug">
                      <span className={cfg.color}>{cfg.label}</span>
                      {" "}
                      <span className="text-[#a1a1aa]">
                        {ENTITY_LABEL[entry.entity_type] ?? entry.entity_type}
                      </span>
                      {entry.entity_name && (
                        <span className="text-white"> — {entry.entity_name}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#52525b] mt-0.5">
                      by {entry.performed_by}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#52525b] shrink-0 mt-0.5">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-[#1c2233] flex items-center justify-between">
        <p className="text-[10px] text-[#52525b]">
          Refreshed {timeAgo(lastRefresh.toISOString())}
        </p>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("obsidian:tab", { detail: "audit" })); }}
          className="text-[10px] text-[#71717a] hover:text-white transition-colors"
        >
          View full log →
        </a>
      </div>
    </div>
  );
}
