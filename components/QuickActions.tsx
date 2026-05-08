"use client";

import { Upload, Workflow, Tag, RefreshCw } from "lucide-react";

export default function QuickActions() {
  const actions = [
    { title: "Import Catalog", desc: "Upload CSV or XLSX", icon: Upload },
    { title: "Create Workflow", desc: "Automation rules", icon: Workflow },
    { title: "Launch Promo", desc: "Markdown banner", icon: Tag },
    { title: "Sync Channels", desc: "Sales integrations", icon: RefreshCw },
  ];

  return (
    <div className="ambient-card rounded-3xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              className="text-left px-4 py-3 rounded-2xl border border-[#27272a] bg-[#111113] hover:bg-[#18181b] transition-colors flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-[#a1a1aa]">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
