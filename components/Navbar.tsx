"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Package, BarChart2, LayoutDashboard, Boxes,
  FolderKanban, Menu, X,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: "dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "catalog", label: "Catalog", icon: <Package className="w-4 h-4" /> },
    { id: "inventory", label: "Inventory", icon: <Boxes className="w-4 h-4" /> },
    { id: "reports", label: "Reports", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "projects", label: "Workflows", icon: <FolderKanban className="w-4 h-4" /> },
  ];

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[#27272a] lg:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-18 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#18181b] flex items-center justify-center shadow-lg shadow-black/40 border border-[#27272a] overflow-hidden">
              <Image src="/images/logobg.png" alt="Obsidian" width={35} height={35} className="object-contain" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl tracking-tight text-white font-(--font-display)">
                Obsidian
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
                Inventory Suite
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[#111113] rounded-2xl p-1.5 border border-[#27272a] overflow-x-auto max-w-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                  ? "bg-[#27272a] text-white shadow-md shadow-black/30 border border-[#3f3f46]"
                  : "text-[#a1a1aa] hover:text-white"
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-[#18181b] transition-colors text-[#a1a1aa] hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 animate-slide-down">
            <div className="flex flex-col gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                    ? "bg-[#27272a] text-white"
                    : "text-[#a1a1aa] hover:bg-[#18181b]"
                    }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
