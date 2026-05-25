"use client";

// components/QuickActions.tsx
// Quick-action tiles in the Workflows/Automation Studio tab.
// FIX: "Import Catalog" now opens the ImportModal.
//      "View Audit Log" navigates to the audit tab.
//      Unimplemented stubs show a "Coming soon" toast.

import { useState } from "react";
import { Upload, Workflow, Tag, RefreshCw } from "lucide-react";

interface QuickActionsProps {
  /** Opens the CSV import modal (wired from page.tsx) */
  onImportClick?: () => void;
  /** Switch to another top-level tab (wired from page.tsx) */
  onTabChange?: (tab: string) => void;
  /** Hide restricted actions for viewers */
  canManageCatalog?: boolean;
  canViewAudit?: boolean;
}

export default function QuickActions({
  onImportClick,
  onTabChange,
  canManageCatalog = true,
  canViewAudit = true,
}: QuickActionsProps) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  const actions = [
    {
      title: "Import Catalog",
      desc: "Upload CSV to bulk-add products",
      icon: Upload,
      onClick: () => {
        if (onImportClick && canManageCatalog) {
          onImportClick();
        } else {
          showToast("Import is not available here.");
        }
      },
      active: canManageCatalog,
    },
    {
      title: "View Audit Log",
      desc: "Browse all system activity",
      icon: RefreshCw,
      onClick: () => {
        if (onTabChange && canViewAudit) {
          onTabChange("audit");
        } else {
          showToast("Audit log access is restricted.");
        }
      },
      active: canViewAudit,
    },
    {
      title: "Create Workflow",
      desc: "Automation rules — coming soon",
      icon: Workflow,
      onClick: () => showToast("Workflow builder coming in a future release."),
      active: false,
    },
    {
      title: "Launch Promo",
      desc: "Markdown banner — coming soon",
      icon: Tag,
      onClick: () => showToast("Promo launcher coming in a future release."),
      active: false,
    },
  ];

  return (
    <div className="ambient-card rounded-3xl p-5 relative">
      <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={item.onClick}
              className={[
                "text-left px-4 py-3 rounded-2xl border transition-all flex items-center gap-3 group",
                item.active
                  ? "border-[#27272a] bg-[#111113] hover:bg-[#18181b] hover:border-[#3f3f46] cursor-pointer"
                  : "border-[#1c1c1f] bg-[#0d0d0f] opacity-60 cursor-not-allowed",
              ].join(" ")}
            >
              <div className={[
                "w-9 h-9 rounded-xl border flex items-center justify-center",
                item.active
                  ? "bg-[#18181b] border-[#27272a] text-white group-hover:border-[#52525b]"
                  : "bg-[#111113] border-[#1c1c1f] text-[#52525b]",
              ].join(" ")}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${item.active ? "text-white" : "text-[#52525b]"}`}>
                  {item.title}
                </p>
                <p className="text-xs text-[#71717a]">{item.desc}</p>
              </div>
              {!item.active && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-[#3f3f46] border border-[#27272a] px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Inline toast — appears at bottom of card */}
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2 px-4 py-2 rounded-2xl bg-[#18181b] border border-[#27272a] text-center text-xs text-[#a1a1aa] shadow-lg animate-fade-in whitespace-normal sm:whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52525b]" />
          {toast}
        </div>
      )}
    </div>
  );
}
