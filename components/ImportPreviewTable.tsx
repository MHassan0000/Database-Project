"use client";

// Phase 6 — components/ImportPreviewTable.tsx
// Color-coded table showing parsed CSV rows with validation status.
// green  = valid   (ready to import)
// yellow = warning (will import, but has missing optional fields)
// red    = error   (will be skipped — must fix in CSV and re-upload)

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { ImportRow, ImportPreviewResponse } from "@/lib/types";

// PHASE 6 IMPLEMENTATION START

interface ImportPreviewTableProps {
  preview:   ImportPreviewResponse;
  onConfirm: () => void;
  onReset:   () => void;
  loading:   boolean;
}

function StatusBadge({ status }: { status: ImportRow["status"] }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-2.5 h-2.5" /> valid
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-2.5 h-2.5" /> warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
      <XCircle className="w-2.5 h-2.5" /> error
    </span>
  );
}

function RowDetail({ row }: { row: ImportRow }) {
  const [open, setOpen] = useState(false);
  const hasMessages = row.errors.length > 0 || row.warnings.length > 0;

  const rowBg =
    row.status === "valid"   ? "hover:bg-emerald-500/5"  :
    row.status === "warning" ? "hover:bg-amber-500/5"    :
    "hover:bg-red-500/5";

  const borderColor =
    row.status === "valid"   ? "border-emerald-500/10" :
    row.status === "warning" ? "border-amber-500/10"   :
    "border-red-500/10";

  return (
    <>
      <tr
        className={`border-b ${borderColor} transition-colors cursor-pointer ${rowBg}`}
        onClick={() => hasMessages && setOpen(!open)}
      >
        <td className="px-3 py-2 text-[11px] text-[#52525b] font-mono">{row.rowNumber}</td>
        <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
        <td className="px-3 py-2 text-xs text-white font-medium truncate max-w-[120px]">
          {row.name || <span className="text-red-400 italic">missing</span>}
        </td>
        <td className="px-3 py-2 text-xs text-[#a1a1aa] font-mono">
          {row.price ? `$${parseFloat(row.price).toFixed(2)}` : <span className="text-red-400">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-[#a1a1aa]">{row.stock || "0"}</td>
        <td className="px-3 py-2 text-xs text-[#71717a] font-mono">{row.sku || "—"}</td>
        <td className="px-3 py-2 text-xs text-[#71717a] truncate max-w-[90px]">{row.category || "—"}</td>
        <td className="px-3 py-2 text-xs text-[#71717a]">
          {row.status_val || <span className="text-[#52525b]">active</span>}
        </td>
        <td className="px-3 py-2 text-[11px] text-[#52525b]">
          {hasMessages && (
            <span className="flex items-center gap-0.5 text-[#71717a]">
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {row.errors.length + row.warnings.length}
            </span>
          )}
        </td>
      </tr>
      {open && hasMessages && (
        <tr className={`border-b ${borderColor}`}>
          <td colSpan={9} className="px-3 py-2 bg-[#0a0a0c]">
            <div className="space-y-0.5">
              {row.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-400">
                  <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  {e}
                </div>
              ))}
              {row.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-400">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  {w}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ImportPreviewTable({
  preview,
  onConfirm,
  onReset,
  loading,
}: ImportPreviewTableProps) {
  const canImport = preview.validRows + preview.warningRows > 0;

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-xs text-[#a1a1aa]">
          Total: <span className="text-white font-semibold">{preview.totalRows}</span>
        </div>
        {preview.validRows > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {preview.validRows} valid
          </div>
        )}
        {preview.warningRows > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {preview.warningRows} warning
          </div>
        )}
        {preview.errorRows > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            {preview.errorRows} error
          </div>
        )}
      </div>

      {preview.errorRows > 0 && (
        <p className="text-[11px] text-[#71717a] bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2">
          <span className="text-red-400 font-semibold">{preview.errorRows}</span> row
          {preview.errorRows !== 1 ? "s" : ""} with errors will be skipped. Fix them in your CSV and re-upload,
          or proceed to import only the valid/warning rows.
        </p>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-[#1c2233] overflow-hidden">
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0f141c] sticky top-0 z-10">
              <tr>
                {["#", "Status", "Name", "Price", "Stock", "SKU", "Category", "Product Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[9px] uppercase tracking-wider text-[#52525b] font-semibold border-b border-[#1c2233] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <RowDetail key={row.rowNumber} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          id="import-reset-btn"
          onClick={onReset}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#a1a1aa] hover:text-white border border-[#27272a] hover:border-[#3f3f46] transition-all disabled:opacity-40"
        >
          Upload different file
        </button>
        <button
          id="import-confirm-btn"
          onClick={onConfirm}
          disabled={!canImport || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 shadow-lg shadow-black/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importing…
            </>
          ) : (
            <>
              Import {preview.validRows + preview.warningRows} Products
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// PHASE 6 IMPLEMENTATION END
