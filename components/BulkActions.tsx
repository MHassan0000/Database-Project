"use client";

import { useState } from "react";

interface BulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  onApplyStatus: (status: string) => void;
  onDelete: () => void;
  loading?: boolean;
}

export default function BulkActions({
  selectedCount,
  onClear,
  onApplyStatus,
  onDelete,
  loading,
}: BulkActionsProps) {
  const [status, setStatus] = useState("active");

  if (selectedCount === 0) return null;

  return (
    <div className="ambient-card rounded-3xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      <div className="text-sm font-semibold text-white">
        {selectedCount} selected
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white appearance-none cursor-pointer"
          >
            <option value="active">Set Active</option>
            <option value="draft">Set Draft</option>
            <option value="archived">Set Archived</option>
          </select>
          <button
            onClick={() => onApplyStatus(status)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-all shadow-lg shadow-black/30 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        <button
          onClick={onDelete}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          Delete Selected
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#8b93a7] border border-[#1c2333] hover:bg-[#141a26] transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
