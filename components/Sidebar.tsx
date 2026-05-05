"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  LineChart,
  Boxes,
  FolderKanban,
  Settings,
  Shield,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "catalog", label: "Catalog", icon: Package },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "reports", label: "Reports", icon: LineChart },
  { id: "projects", label: "Workflows", icon: FolderKanban },
];

const secondaryItems = [
  { id: "automation", label: "Automation", icon: Zap },
  { id: "security", label: "Security", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex flex-col justify-between sticky top-0 h-screen border-r border-[#1c2233] bg-[#0b0f17]/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-20" : "w-72"
      } animate-slide-right`}
    >
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#1a2c3b] via-[#0f2532] to-[#0a0f17] flex items-center justify-center shadow-lg shadow-black/40 border border-[#243043]">
              <span className="text-[#f4d06f] text-lg font-semibold">PV</span>
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold text-white">ProductVault</p>
                <p className="text-xs text-[#667085] uppercase tracking-[0.25em]">Ambient</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="w-9 h-9 rounded-xl border border-[#1c2333] text-[#8b93a7] hover:text-white hover:bg-[#141a26] transition-colors flex items-center justify-center"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="space-y-2">
          <p className={`text-xs uppercase tracking-[0.2em] text-[#667085] ${collapsed ? "text-center" : ""}`}>
            Core
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all ${
                    active
                      ? "bg-[#151c2a] text-[#7dd3fc] shadow-lg shadow-black/30"
                      : "text-[#8b93a7] hover:text-white hover:bg-[#121826]"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className={`text-xs uppercase tracking-[0.2em] text-[#667085] ${collapsed ? "text-center" : ""}`}>
            Platform
          </p>
          <div className="space-y-1">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all ${
                    active
                      ? "bg-[#151c2a] text-[#7dd3fc] shadow-lg shadow-black/30"
                      : "text-[#8b93a7] hover:text-white hover:bg-[#121826]"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className={`ambient-card rounded-3xl p-4 ${collapsed ? "hidden" : "block"}`}>
          <p className="text-xs uppercase tracking-[0.3em] text-[#667085]">Ops Mode</p>
          <p className="text-sm text-white font-semibold mt-2">Automation Ready</p>
          <p className="text-xs text-[#8b93a7] mt-1">Deploy triggers and workflows</p>
          <button className="mt-4 w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-[#0b0f17] bg-linear-to-r from-[#f4d06f] to-[#7dd3fc]">
            Enable Engine
          </button>
        </div>
      </div>
    </aside>
  );
}
