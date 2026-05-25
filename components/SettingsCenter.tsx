"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

export default function SettingsCenter() {
  const [notifications, setNotifications] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [autoExport, setAutoExport] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [taxSaving, setTaxSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/settings/tax")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.tax_rate !== undefined && data.tax_rate !== null) {
          setTaxRate(String(data.tax_rate));
        }
      })
      .catch(() => {});
  }, []);

  const toggle = (value: boolean) =>
    value ? "bg-white" : "bg-[#27272a]";

  return (
    <div className="space-y-6">
      <div className="ambient-card rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Workspace Preferences</h3>
            <p className="text-xs text-[#8b93a7]">Controls for alerts and exports</p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-semibold">Realtime notifications</p>
              <p className="text-xs text-[#8b93a7]">Stock changes and alerts</p>
            </div>
            <button
              onClick={() => setNotifications((prev) => !prev)}
              className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${toggle(notifications)}`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-semibold">Channel sync</p>
              <p className="text-xs text-[#8b93a7]">Push updates to sales tools</p>
            </div>
            <button
              onClick={() => setSyncEnabled((prev) => !prev)}
              className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${toggle(syncEnabled)}`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  syncEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-semibold">Auto export</p>
              <p className="text-xs text-[#8b93a7]">Daily CSV snapshots</p>
            </div>
            <button
              onClick={() => setAutoExport((prev) => !prev)}
              className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${toggle(autoExport)}`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoExport ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="ambient-card rounded-3xl p-5">
        <h3 className="text-sm font-semibold text-white">Tax Defaults</h3>
        <p className="text-xs text-[#8b93a7]">Applied automatically to new purchase orders</p>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
              Default tax rate (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#1c2333] text-sm bg-[#0f141c] text-white"
              placeholder="0"
            />
          </div>
          <button
            onClick={async () => {
              const value = Number(taxRate || 0);
              if (Number.isNaN(value) || value < 0 || value > 100) {
                showToast("Tax rate must be between 0 and 100", "warning");
                return;
              }
              setTaxSaving(true);
              try {
                const res = await fetch("/api/settings/tax", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tax_rate: value }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to save tax rate");
                setTaxRate(String(json.tax_rate ?? value));
                showToast("Tax rate updated", "success");
              } catch (err) {
                showToast(err instanceof Error ? err.message : "Failed to save tax rate", "error");
              } finally {
                setTaxSaving(false);
              }
            }}
            disabled={taxSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {taxSaving ? "Saving..." : "Save tax rate"}
          </button>
        </div>
      </div>

      <div className="ambient-card rounded-3xl p-5">
        <h3 className="text-sm font-semibold text-white">Export Controls</h3>
        <p className="text-xs text-[#8b93a7]">Manage snapshots and backup cadence</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button className="px-4 py-2.5 rounded-xl text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors">
            Run export now
          </button>
          <button className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white border border-[#1c2333] bg-[#0f141c] hover:bg-[#141a26]">
            Configure schedule
          </button>
        </div>
      </div>
    </div>
  );
}
