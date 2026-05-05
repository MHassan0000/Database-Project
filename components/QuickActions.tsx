"use client";

export default function QuickActions() {
  return (
    <div className="ambient-card rounded-3xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { title: "Import Catalog", desc: "Upload CSV or XLSX" },
          { title: "Create Workflow", desc: "Automation rules" },
          { title: "Launch Promo", desc: "Markdown banner" },
          { title: "Sync Channels", desc: "Sales integrations" },
        ].map((item) => (
          <button
            key={item.title}
            className="text-left px-4 py-3 rounded-2xl border border-[#1c2333] bg-[#0f141c] hover:bg-[#141a26] transition-colors"
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="text-xs text-[#8b93a7]">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
