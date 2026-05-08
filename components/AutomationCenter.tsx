"use client";

import { useMemo } from "react";
import { Activity, RefreshCw, Bell, UploadCloud } from "lucide-react";

const automations = [
  {
    title: "Auto Replenish",
    detail: "Trigger PO when stock < 10",
    status: "Active",
    icon: RefreshCw,
  },
  {
    title: "Price Guard",
    detail: "Lock pricing for premium SKUs",
    status: "Active",
    icon: Activity,
  },
  {
    title: "Low Stock Alerts",
    detail: "Notify Slack channel",
    status: "Paused",
    icon: Bell,
  },
  {
    title: "Vendor Sync",
    detail: "Daily import from suppliers",
    status: "Queued",
    icon: UploadCloud,
  },
];

export default function AutomationCenter() {
  const summary = useMemo(() => {
    const active = automations.filter((a) => a.status === "Active").length;
    const paused = automations.filter((a) => a.status === "Paused").length;
    return { active, paused };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ambient-card rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">Active</p>
          <p className="text-2xl font-semibold text-white mt-2">{summary.active}</p>
          <p className="text-xs text-[#8b93a7]">Running automations</p>
        </div>
        <div className="ambient-card rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">Paused</p>
          <p className="text-2xl font-semibold text-white mt-2">{summary.paused}</p>
          <p className="text-xs text-[#8b93a7]">Needs attention</p>
        </div>
        <div className="ambient-card rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">Latency</p>
          <p className="text-2xl font-semibold text-white mt-2">1.2s</p>
          <p className="text-xs text-[#8b93a7]">Avg trigger response</p>
        </div>
      </div>

      <div className="ambient-card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Automation Queue</h3>
            <p className="text-xs text-[#8b93a7]">Rules running across the catalog</p>
          </div>
          <button className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors">
            New Rule
          </button>
        </div>
        <div className="space-y-3">
          {automations.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border border-[#1c2333] bg-[#0f141c]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-[#8b93a7]">{item.detail}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-[#1c2333] text-[#8b93a7]">
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
