"use client";
// PHASE 8 START: app/login/page.tsx
// Login and registration page for Obsidian Inventory.
// Redirects to "/" after successful authentication.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, LogIn, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Tab = "login" | "register";

export default function LoginPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [tab, setTab]               = useState<Tab>("login");
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated, redirect to the dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const url  = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = tab === "login"
        ? { email, password }
        : { name, email, password };

      const res  = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Refresh auth context — AuthProvider will update user state
      await refreshUser();
      router.replace("/dashboard");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }, [tab, name, email, password, refreshUser, router]);

  // Still loading auth state — show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#52525b] animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">

        {/* Logo & branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-3xl bg-[#18181b] border border-[#27272a] flex items-center justify-center shadow-lg shadow-black/40 overflow-hidden">
            <Image src="/images/logobg.png" alt="Obsidian" width={40} height={40} className="object-contain" priority />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white font-(--font-display)">Obsidian</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-[#71717a] mt-0.5">Inventory Suite</p>
          </div>
        </div>

        {/* Card */}
        <div className="ambient-card rounded-3xl p-8 space-y-6">

          {/* Tab switcher */}
          <div className="flex rounded-2xl bg-[#0a0a0c] border border-[#27272a] p-1 gap-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccessMsg(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-[#18181b] text-white shadow-md border border-[#3f3f46]"
                    : "text-[#71717a] hover:text-[#a1a1aa]"
                }`}
              >
                {t === "login" ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (register only) */}
            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-[#71717a]">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Jane Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-sm text-white placeholder-[#52525b] transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#71717a]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-sm text-white placeholder-[#52525b] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-[#71717a]">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#18181b] border border-[#27272a] text-sm text-white placeholder-[#52525b] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {tab === "register" && (
                <p className="text-[11px] text-[#52525b]">Minimum 8 characters.</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] text-sm animate-fade-in">
                {successMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-[#e4e4e7] disabled:opacity-60 transition-all"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin-slow" />
              ) : tab === "login" ? (
                <><LogIn className="w-4 h-4" /> Sign In</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-center text-[11px] text-[#52525b]">
            {tab === "login"
              ? "First time? Register to create your workspace."
              : "Your workspace admin is created automatically."}
          </p>
        </div>
      </div>
    </div>
  );
}
// PHASE 8 END: app/login/page.tsx
