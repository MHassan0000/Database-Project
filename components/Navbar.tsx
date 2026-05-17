"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Menu, X, LogOut,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getNavItemsForRole } from "@/components/navigation";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const tabs = getNavItemsForRole(user?.role);
  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[#27272a] lg:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 min-h-[4.5rem] py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#18181b] flex items-center justify-center shadow-lg shadow-black/40 border border-[#27272a] overflow-hidden">
              <Image src="/images/logobg.png" alt="Obsidian" width={35} height={35} className="object-contain" priority />
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

          <div className="hidden md:flex min-w-0 flex-1 justify-end">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-[#111113] p-1.5 border border-[#27272a]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex flex-shrink-0 items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                      ? "bg-[#27272a] text-white shadow-md shadow-black/30 border border-[#3f3f46]"
                      : "text-[#a1a1aa] hover:text-white"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
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
            <div className="space-y-4 rounded-3xl border border-[#27272a] bg-[#111113]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl max-h-[calc(100dvh-5rem)] overflow-y-auto">
              <div className="grid gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabChange(tab.id);
                        setMobileOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${activeTab === tab.id
                        ? "bg-[#27272a] text-white"
                        : "text-[#a1a1aa] hover:bg-[#18181b]"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {user && (
                <div className="rounded-2xl border border-[#27272a] bg-[#0f141c] p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#3f3f46] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-[#71717a] truncate">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md border border-[#27272a] bg-[#18181b] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
                      {roleLabel}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      void logout();
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-sm font-semibold text-[#f87171] transition-colors hover:bg-[#f87171]/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
