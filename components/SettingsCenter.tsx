"use client";

import { useState } from "react";

export default function SettingsCenter() {
  const [notifications, setNotifications] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [autoExport, setAutoExport] = useState(false);

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
