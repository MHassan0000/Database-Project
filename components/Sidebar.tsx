"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard, Package, LineChart, Boxes, FolderKanban,
  ChevronLeft, ChevronRight, Truck, ClipboardList, ShoppingCart,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Overview",   icon: LayoutDashboard },
  { id: "catalog",   label: "Catalog",    icon: Package },
  { id: "inventory", label: "Inventory",  icon: Boxes },
  // Phase 2: Suppliers nav item
  { id: "suppliers", label: "Suppliers",  icon: Truck },
  // Phase 4: Purchase Orders nav item
  { id: "orders",    label: "Orders",     icon: ShoppingCart },
  // Phase 5: Advanced Analytics (replaces "Reports" label)
  { id: "reports",   label: "Analytics",  icon: LineChart },
  { id: "projects",  label: "Workflows",  icon: FolderKanban },
  // Phase 3: Audit trail nav item
  { id: "audit",     label: "Audit Log",  icon: ClipboardList },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex flex-col justify-between sticky top-0 h-screen border-r border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-22" : "w-72"
      } animate-slide-right`}
    >
      <div className={`${collapsed ? "p-4" : "p-6"} space-y-8`}>
        {/* Header */}
        <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between"}`}>
          <div className={`flex items-center ${collapsed ? "flex-col" : "gap-3"}`}>
            <div className={`${collapsed ? "w-12 h-12" : "w-10 h-10"} rounded-2xl bg-[#18181b] flex items-center justify-center shadow-lg shadow-black/40 border border-[#27272a] overflow-hidden transition-all`}>
              <Image src="/images/logobg.png" alt="Obsidian" width={35} height={35} className="object-contain" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold text-white">Obsidian</p>
                <p className="text-xs text-[#71717a] uppercase tracking-[0.25em]">Inventory</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`${collapsed ? "w-10 h-10" : "w-9 h-9"} rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors flex items-center justify-center`}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="text-xs uppercase tracking-[0.2em] text-[#71717a] px-1">Navigation</p>
          )}
          <div className={`space-y-1 ${collapsed ? "flex flex-col items-center" : ""}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`${collapsed ? "w-14 h-14" : "w-full px-3 py-3"} flex items-center gap-3 rounded-2xl transition-all ${
                    active
                      ? "bg-[#18181b] text-white shadow-lg shadow-black/30 border border-[#3f3f46]"
                      : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className={collapsed ? "w-7 h-7" : "w-5 h-5"} strokeWidth={collapsed ? 1.5 : 2} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className={`${collapsed ? "p-4" : "p-6"}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
              <Image src="/images/logobg.png" alt="Obsidian" width={28} height={28} className="object-contain opacity-40" />
            </div>
          </div>
        ) : (
          <div className="ambient-card rounded-3xl p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#52525b]">Obsidian v1.0</p>
            <p className="text-xs text-[#71717a] mt-2">Premium Inventory Suite</p>
          </div>
        )}
      </div>
    </aside>
  );
}
