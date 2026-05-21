"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ArrowRight, ShieldCheck, Sparkles, Layers, Activity, Zap } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-transparent">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#27272a]/70 bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center shadow-lg shadow-black/40 overflow-hidden">
                <Image
                  src="/images/logobg.png"
                  alt="Obsidian"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Obsidian</p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#71717a]">Inventory Suite</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#e4e4e7] transition-all"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white border border-[#27272a] bg-[#111113] hover:bg-[#18181b] transition-all"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#e4e4e7] transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#18181b] border border-[#27272a] text-white">
                <Sparkles className="w-3.5 h-3.5" />
                SaaS Inventory OS
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-(--font-display) text-gradient leading-tight">
                Modern inventory control for every workspace.
              </h1>
              <p className="text-sm sm:text-base text-[#a1a1aa] max-w-xl">
                Obsidian transforms inventory into a multi-tenant SaaS platform. Each team gets its own secure workspace, real-time insights, and a premium ops dashboard built for scale.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-[#e4e4e7] transition-all"
                  >
                    Open Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-[#e4e4e7] transition-all"
                    >
                      Start Free Workspace
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white border border-[#27272a] bg-[#111113] hover:bg-[#18181b] transition-all"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-[#71717a]">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
                  Tenant-isolated data
                </span>
                <span className="inline-flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#60a5fa]" />
                  Live analytics
                </span>
                <span className="inline-flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#fbbf24]" />
                  Built for operators
                </span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-white/10 via-white/5 to-transparent blur-2xl" />
              <div className="relative ambient-card rounded-[28px] p-6 border border-[#27272a]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-[#34d399]" />
                    Workspace Overview
                  </div>
                  <span className="text-[10px] text-[#71717a]">Live</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Active SKUs", value: "1,248", tint: "text-white" },
                    { label: "Low Stock", value: "18", tint: "text-[#fbbf24]" },
                    { label: "Inventory Value", value: "$412k", tint: "text-[#60a5fa]" },
                    { label: "Vendors", value: "42", tint: "text-[#34d399]" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-[#111113] border border-[#27272a] p-4">
                      <p className="text-[11px] text-[#71717a] uppercase tracking-wider">{stat.label}</p>
                      <p className={`text-xl font-semibold mt-2 ${stat.tint}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-[#27272a] bg-[#0f141c] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Restock Velocity</p>
                    <span className="text-xs text-[#34d399]">+12% MoM</span>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    {[40, 70, 55, 90, 65, 80, 60].map((h, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-lg bg-gradient-to-t from-white/5 to-white/20"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Tenant-first architecture",
              desc: "Each workspace is isolated by default. Data stays secure and scoped by tenant.",
              icon: ShieldCheck,
            },
            {
              title: "Operational command center",
              desc: "Modern dashboards, inventory alerts, and supplier workflows in one place.",
              icon: Layers,
            },
            {
              title: "Analytics that ship value",
              desc: "Track movement trends, stock velocity, and inventory value in real time.",
              icon: Activity,
            },
          ].map((feature) => (
            <div key={feature.title} className="ambient-card rounded-3xl p-6 hover:translate-y-[-2px] transition-all">
              <div className="w-10 h-10 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-[#a1a1aa]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="ambient-card rounded-[32px] p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#71717a]">Launch Your Workspace</p>
            <h2 className="text-3xl sm:text-4xl font-(--font-display) text-gradient mt-3">
              Build your inventory HQ today.
            </h2>
            <p className="text-sm text-[#a1a1aa] mt-2 max-w-xl">
              Start with a free workspace, invite your team later, and scale operations with confidence.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-[#e4e4e7] transition-all"
              >
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-black bg-white hover:bg-[#e4e4e7] transition-all"
                >
                  Create Workspace
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white border border-[#27272a] bg-[#111113] hover:bg-[#18181b] transition-all"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[#27272a]/60">
        {/* Subtle top glow line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          {/* Main footer content — brand left, links right */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            {/* Brand column */}
            <div className="flex flex-col gap-4 max-w-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/logobg.png"
                    alt="Obsidian"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Obsidian</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#52525b]">Inventory Suite</p>
                </div>
              </div>
              <p className="text-xs text-[#71717a] leading-relaxed">
                Multi-tenant inventory management built for modern teams. Secure, scalable, and beautifully crafted.
              </p>
              {/* Status badge */}
              <div className="inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-full bg-[#111113] border border-[#27272a]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34d399]" />
                </span>
                <span className="text-[11px] text-[#71717a]">All systems operational</span>
              </div>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-3 gap-8 sm:gap-14">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#52525b]">Product</p>
                <ul className="space-y-2.5">
                  {["Dashboard", "Inventory", "Analytics", "Integrations"].map((item) => (
                    <li key={item}>
                      <Link href="/login" className="text-xs text-[#71717a] hover:text-white transition-colors duration-200">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#52525b]">Company</p>
                <ul className="space-y-2.5">
                  {["About", "Blog", "Careers", "Contact"].map((item) => (
                    <li key={item}>
                      <Link href="/login" className="text-xs text-[#71717a] hover:text-white transition-colors duration-200">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#52525b]">Legal</p>
                <ul className="space-y-2.5">
                  {["Privacy", "Terms", "Security", "GDPR"].map((item) => (
                    <li key={item}>
                      <Link href="/login" className="text-xs text-[#71717a] hover:text-white transition-colors duration-200">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-10 mb-6 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent" />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#52525b]">
            <span>© {new Date().getFullYear()} Obsidian Inventory Suite. All rights reserved.</span>
            <span className="text-[#3f3f46]">
              {loading ? "" : user ? `Signed in as ${user.email}` : "Crafted with precision"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
