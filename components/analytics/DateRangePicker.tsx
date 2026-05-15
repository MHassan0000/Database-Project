"use client";

// Phase 5 — components/analytics/DateRangePicker.tsx
// Shared period selector (7d / 14d / 30d / 60d / 90d) used by all analytics charts.

import type { AnalyticsPeriod } from "@/lib/types";

// PHASE 5 IMPLEMENTATION START
const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d",  label: "7d"  },
  { value: "14d", label: "14d" },
  { value: "30d", label: "30d" },
  { value: "60d", label: "60d" },
  { value: "90d", label: "90d" },
];

interface DateRangePickerProps {
  value:    AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
  label?:   string;
}

export default function DateRangePicker({ value, onChange, label }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && (
        <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider mr-1">
          {label}
        </span>
      )}
      {PERIODS.map((p) => (
        <button
          key={p.value}
          id={`period-btn-${p.value}`}
          onClick={() => onChange(p.value)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
            value === p.value
              ? "bg-white text-black border-white"
              : "bg-transparent text-[#71717a] border-[#27272a] hover:border-[#3f3f46] hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
// PHASE 5 IMPLEMENTATION END
