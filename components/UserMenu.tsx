"use client";
// PHASE 8 START: components/UserMenu.tsx
// Compact user display used in the Sidebar bottom section.
// Shows avatar initials, name, role badge, and a logout button.

import { useState } from "react";
import { LogOut, ChevronUp, User, Shield, Eye } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/lib/types";

// ── Role badge config ─────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin:   { label: "Admin",   color: "text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/20" },
  manager: { label: "Manager", color: "text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20" },
  viewer:  { label: "Viewer",  color: "text-[#a1a1aa] bg-[#a1a1aa]/10 border-[#a1a1aa]/20" },
};

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  admin:   <Shield className="w-3 h-3" />,
  manager: <User   className="w-3 h-3" />,
  viewer:  <Eye    className="w-3 h-3" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface UserMenuProps {
  collapsed?: boolean;
}

export default function UserMenu({ collapsed = false }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role];
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  // ── Collapsed state: just avatar ───────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="relative flex flex-col items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          title={user.name}
          className="w-10 h-10 rounded-2xl bg-[#18181b] border border-[#3f3f46] flex items-center justify-center text-sm font-semibold text-white hover:border-[#52525b] transition-colors"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute bottom-14 left-0 z-[80] w-52 rounded-2xl border border-[#27272a] bg-[#111113] shadow-2xl shadow-black/60 p-2 animate-scale-in">
            <div className="px-3 py-2 border-b border-[#27272a] mb-2">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-[#71717a] truncate">{user.email}</p>
              <span className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${roleConfig.color}`}>
                {ROLE_ICON[user.role]}
                {roleConfig.label}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#f87171] hover:bg-[#f87171]/10 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Expanded state ──────────────────────────────────────────────────────────
  return (
    <div className="relative z-[80]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[#18181b] transition-colors group"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
          {initials}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${roleConfig.color}`}>
            {ROLE_ICON[user.role]}
            {roleConfig.label}
          </span>
        </div>

        <ChevronUp
          className={`w-4 h-4 text-[#52525b] transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-[80] rounded-2xl border border-[#27272a] bg-[#111113] shadow-2xl shadow-black/60 p-2 animate-scale-in">
          <div className="px-3 py-2 border-b border-[#27272a] mb-2">
            <p className="text-xs text-[#71717a] truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[#f87171] hover:bg-[#f87171]/10 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
// PHASE 8 END: components/UserMenu.tsx
