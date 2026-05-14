"use client";

// Phase 3 — components/AuditDetail.tsx
// Renders a JSON diff / details panel for a single audit log entry.
// Used as a slide-in modal or inline expansion from AuditLog.tsx.

import { AuditLog } from "@/lib/types";
import {
  X, Plus, Pencil, Trash2, BarChart2, Layers,
  PackageMinus, Truck, Clock, Package, Tag,
} from "lucide-react";

interface AuditDetailProps {
  entry: AuditLog;
  onClose: () => void;
}

// ── Config maps ──────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  create:       { label: "Created",        icon: Plus,         color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  update:       { label: "Updated",        icon: Pencil,       color: "text-blue-300",    bg: "bg-blue-500/10 border-blue-500/20"       },
  delete:       { label: "Deleted",        icon: Trash2,       color: "text-red-300",     bg: "bg-red-500/10 border-red-500/20"         },
  stock_adjust: { label: "Stock Adjusted", icon: BarChart2,    color: "text-amber-300",   bg: "bg-amber-500/10 border-amber-500/20"     },
  bulk_update:  { label: "Bulk Updated",   icon: Layers,       color: "text-purple-300",  bg: "bg-purple-500/10 border-purple-500/20"   },
  bulk_delete:  { label: "Bulk Deleted",   icon: PackageMinus, color: "text-rose-300",    bg: "bg-rose-500/10 border-rose-500/20"       },
  receive_po:   { label: "PO Received",    icon: Truck,        color: "text-cyan-300",    bg: "bg-cyan-500/10 border-cyan-500/20"       },
};

const ENTITY_ICON: Record<string, React.ElementType> = {
  product:        Package,
  supplier:       Truck,
  purchase_order: Tag,
  user:           Clock,
};

// ── JSON renderer ─────────────────────────────────────────────────────────────
function JsonValue({ val }: { val: unknown }) {
  if (val === null || val === undefined) {
    return <span className="text-[#52525b] italic">null</span>;
  }
  if (typeof val === "boolean") {
    return <span className={val ? "text-emerald-400" : "text-red-400"}>{String(val)}</span>;
  }
  if (typeof val === "number") {
    return <span className="text-amber-300">{val}</span>;
  }
  if (typeof val === "string") {
    return <span className="text-emerald-300">"{val}"</span>;
  }
  if (Array.isArray(val)) {
    return (
      <span className="text-[#a1a1aa]">
        [{val.map((v, i) => <JsonValue key={i} val={v} />).reduce<React.ReactNode[]>((a, el, i) => i === 0 ? [el] : [...a, ", ", el], [])}]
      </span>
    );
  }
  return (
    <span className="text-[#a1a1aa]">
      {"{"}
      {Object.entries(val as Record<string, unknown>).map(([k, v], i) => (
        <span key={k}>
          {i > 0 && ", "}
          <span className="text-blue-300">{k}</span>: <JsonValue val={v} />
        </span>
      ))}
      {"}"}
    </span>
  );
}

function DiffRow({ k, val }: { k: string; val: unknown }) {
  const isDiff = val !== null && typeof val === "object" && "old" in (val as object) && "new" in (val as object);
  if (isDiff) {
    const diff = val as { old: unknown; new: unknown };
    return (
      <tr className="border-b border-[#141a26]">
        <td className="px-3 py-2 text-xs text-[#8b93a7] font-mono align-top">{k}</td>
        <td className="px-3 py-2 text-xs align-top">
          <div className="flex flex-col gap-1">
            <span className="line-through text-red-400/70 text-[10px]">
              <JsonValue val={diff.old} />
            </span>
            <span className="text-emerald-400 text-[10px]">
              <JsonValue val={diff.new} />
            </span>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-[#141a26]">
      <td className="px-3 py-2 text-xs text-[#8b93a7] font-mono align-top">{k}</td>
      <td className="px-3 py-2 text-xs text-[#a1a1aa] align-top font-mono">
        <JsonValue val={val} />
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuditDetail({ entry, onClose }: AuditDetailProps) {
  const cfg = ACTION_CONFIG[entry.action] ?? {
    label: entry.action,
    icon: Clock,
    color: "text-[#a1a1aa]",
    bg: "bg-[#18181b] border-[#27272a]",
  };
  const ActionIcon  = cfg.icon;
  const EntityIcon  = ENTITY_ICON[entry.entity_type] ?? Package;
  const details     = entry.details as Record<string, unknown>;
  const detailKeys  = Object.keys(details);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg ambient-card rounded-3xl overflow-hidden shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1c2233] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${cfg.bg}`}>
              <ActionIcon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{cfg.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <EntityIcon className="w-3 h-3 text-[#71717a]" />
                <span className="text-xs text-[#71717a]">{entry.entity_type}</span>
                {entry.entity_id && (
                  <span className="text-xs text-[#52525b]">#{entry.entity_id}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#18181b] text-[#71717a] hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta section */}
        <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-[#1c2233]">
          {[
            { label: "Entity Name",  value: entry.entity_name  ?? "—" },
            { label: "Performed By", value: entry.performed_by  ?? "system" },
            { label: "IP Address",   value: entry.ip_address   ?? "—" },
            { label: "Timestamp",    value: new Date(entry.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-wider text-[#52525b] mb-0.5">{label}</p>
              <p className="text-xs text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Details / diff table */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-[#52525b] mb-3">Details</p>
          {detailKeys.length === 0 ? (
            <p className="text-xs text-[#71717a] italic">No additional details recorded.</p>
          ) : (
            <table className="w-full text-left">
              <tbody>
                {detailKeys.map((k) => (
                  <DiffRow key={k} k={k} val={details[k]} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2">
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
