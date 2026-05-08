"use client";

import { ShieldCheck, Users, KeyRound } from "lucide-react";
import StockLedger from "@/components/StockLedger";

export default function SecurityCenter() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ambient-card rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">Policy</p>
              <p className="text-lg font-semibold text-white">Compliant</p>
            </div>
          </div>
          <p className="text-xs text-[#8b93a7] mt-3">Last audit 12 hours ago</p>
        </div>
        <div className="ambient-card rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">Roles</p>
              <p className="text-lg font-semibold text-white">3 Active</p>
            </div>
          </div>
          <p className="text-xs text-[#8b93a7] mt-3">Admin, Manager, Analyst</p>
        </div>
        <div className="ambient-card rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#667085]">API Keys</p>
              <p className="text-lg font-semibold text-white">2 Live</p>
            </div>
          </div>
          <p className="text-xs text-[#8b93a7] mt-3">Rotated weekly</p>
        </div>
      </div>

      <StockLedger />
    </div>
  );
}
