"use client";
// PHASE 8 START: Sidebar updated with role-aware nav and UserMenu

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
// PHASE 8: UserMenu and auth context
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/components/AuthProvider";
import { getNavItemsForRole } from "@/components/navigation";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  // PHASE 8: get user role for filtering nav items
  const { user } = useAuth();
  const navItems = getNavItemsForRole(user?.role);

  return (
    <aside
      className={`hidden lg:flex relative z-40 sticky top-0 h-[100dvh] min-h-0 flex-col border-r border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-[5.5rem]" : "w-72"
      } animate-slide-right`}
    >
      <div className={`${collapsed ? "p-4" : "p-6"} shrink-0`}>
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
      </div>

      {/* Navigation */}
      <div className={`flex-1 min-h-0 ${collapsed ? "px-3 pb-4" : "px-4 pb-4"}`}>
        <div className={`h-full overflow-y-auto ${collapsed ? "pr-0" : "pr-2"}`}>
          <div className="space-y-2">
            {!collapsed && (
              <p className="text-xs uppercase tracking-[0.2em] text-[#71717a] px-2">Navigation</p>
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
      </div>

      {/* Bottom: UserMenu + version badge */}
      <div className={`${collapsed ? "p-4" : "p-6"} shrink-0 space-y-3 border-t border-[#27272a]/80 bg-[#0a0a0c]/95 backdrop-blur-xl`}>
        {/* PHASE 8 START: UserMenu in sidebar bottom */}
        <UserMenu collapsed={collapsed} />
        {/* PHASE 8 END: UserMenu */}
      </div>
    </aside>
  );
}
// PHASE 8 END: Sidebar
