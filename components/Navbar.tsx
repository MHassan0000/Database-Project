"use client";

import { useState } from "react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

import {
  Package,
  BarChart2,
  Sparkle,
  LayoutDashboard,
  Boxes,
  FolderKanban,
  Shield,
  Zap,
  Settings,
} from "lucide-react";

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: "dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "catalog", label: "Catalog", icon: <Package className="w-4 h-4" /> },
    { id: "inventory", label: "Inventory", icon: <Boxes className="w-4 h-4" /> },
    { id: "reports", label: "Reports", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "projects", label: "Workflows", icon: <FolderKanban className="w-4 h-4" /> },
    { id: "automation", label: "Automation", icon: <Zap className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[#1c2233] lg:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[72px] py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#1a2c3b] via-[#0f2532] to-[#0a0f17] flex items-center justify-center shadow-lg shadow-black/40 border border-[#243043]">
              <Sparkle className="w-5 h-5 text-[#f4d06f]" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white font-[var(--font-display)]">
                ProductVault
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#667085]">
                Dark Ambient Suite
              </p>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-[#0f141c] rounded-2xl p-1.5 border border-[#1c2233] overflow-x-auto max-w-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                  ? "bg-[#1a2231] text-[#7dd3fc] shadow-md shadow-black/30 border border-[#243043]"
                  : "text-[#8b93a7] hover:text-white"
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-[#141a26] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
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
                    ? "bg-[#1a2231] text-[#7dd3fc]"
                    : "text-[#8b93a7] hover:bg-[#141a26]"
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
    </nav >
  );
}
