"use client";

import { useEffect, useState } from "react";
import type { StockMovementResponse } from "@/lib/types";

export default function StockLedger() {
  const [data, setData] = useState<StockMovementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLedger();
  }, [page]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock?page=${page}&limit=8`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ambient-card rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Stock Ledger</h3>
          <p className="text-xs text-[#8b93a7]">Latest stock movements and adjustments</p>
        </div>
        <div className="text-xs text-[#8b93a7]">
          Net delta: <span className="text-white font-semibold">{data?.netDelta ?? 0}</span>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 skeleton rounded-xl" />
          ))}
        </div>
      )}

      {!loading && (!data || data.movements.length === 0) && (
        <p className="text-sm text-[#8b93a7]">No stock movements yet.</p>
      )}

      {!loading && data && data.movements.length > 0 && (
        <div className="space-y-2">
          {data.movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between gap-4 px-3 py-2 rounded-2xl bg-[#0f141c] border border-[#1c2333]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {movement.product_name}
                </p>
                <p className="text-xs text-[#8b93a7] truncate">
                  {movement.reason} - {movement.note || "No note"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    movement.delta > 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {movement.delta > 0 ? "+" : ""}
                  {movement.delta}
                </p>
                <p className="text-xs text-[#8b93a7]">Stock: {movement.stock_after}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-[#1c2333] hover:bg-[#141a26] disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
            disabled={page >= data.totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-[#1c2333] hover:bg-[#141a26] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
