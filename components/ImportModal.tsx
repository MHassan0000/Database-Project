"use client";

// Phase 6 — components/ImportModal.tsx
// Full CSV batch-import workflow:
//   1. Drag-and-drop (or click) to select a CSV file
//   2. Preview step: validated rows shown in color-coded table
//   3. Confirm step: inserts valid/warning rows into the database

import { useState, useRef, useCallback } from "react";
import { X, Upload, Download, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";
import ImportPreviewTable from "@/components/ImportPreviewTable";
import type { ImportPreviewResponse } from "@/lib/types";

// PHASE 6 IMPLEMENTATION START

interface ImportModalProps {
  onClose:         () => void;
  onImportSuccess: (count: number) => void;
}

type Step = "upload" | "preview" | "done";

export default function ImportModal({ onClose, onImportSuccess }: ImportModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step,        setStep]        = useState<Step>("upload");
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const [preview,     setPreview]     = useState<ImportPreviewResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── File processing ────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only CSV files are supported. Please upload a .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File is too large. Maximum allowed size is 5 MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res  = await fetch("/api/products/import", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error ?? "Failed to process file");
        return;
      }

      setPreview(json as ImportPreviewResponse);
      setStep("preview");
    } catch {
      setUploadError("Network error — could not reach the server.");
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true);  };
  const handleDragLeave = ()                       => setDragOver(false);
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
  };

  // ── Confirm import ─────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const res  = await fetch("/api/products/import/confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: preview.rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "Import failed", "error");
        return;
      }
      setStep("done");
      showToast(`Successfully imported ${json.imported} product${json.imported !== 1 ? "s" : ""}`, "success");
      onImportSuccess(json.imported);
    } catch {
      showToast("Network error — import could not be completed", "error");
    } finally {
      setConfirming(false);
    }
  };

  // ── Reset to upload step ───────────────────────────────────────────────────

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setUploadError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      id="import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ambient-card rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#1c2233]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2233]">
          <div>
            <h2 className="text-base font-semibold text-white">Import Products</h2>
            <p className="text-xs text-[#71717a] mt-0.5">
              {step === "upload"  ? "Upload a CSV file to preview and import products in bulk"  :
               step === "preview" ? "Review the parsed rows — fix errors in your CSV if needed" :
               "Import completed successfully"}
            </p>
          </div>
          <button
            id="import-modal-close"
            onClick={onClose}
            className="p-2 rounded-xl text-[#71717a] hover:text-white hover:bg-[#18181b] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Upload step ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Download template link */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0f141c] border border-[#1c2233]">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#71717a] shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white">CSV Template</p>
                    <p className="text-[11px] text-[#71717a]">Download and fill in to ensure correct column names</p>
                  </div>
                </div>
                <a
                  id="import-template-download"
                  href="/api/products/import"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#18181b] transition-all"
                  download
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>

              {/* Drop zone */}
              <div
                id="import-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-8 py-14 cursor-pointer transition-all ${
                  dragOver
                    ? "border-white/40 bg-white/5"
                    : "border-[#27272a] hover:border-[#3f3f46] hover:bg-[#0f141c]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {uploading ? (
                  <>
                    <svg className="animate-spin w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm text-[#71717a]">Parsing and validating…</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                      <Upload className="w-5 h-5 text-[#a1a1aa]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">
                        {dragOver ? "Drop your CSV here" : "Drag & drop your CSV here"}
                      </p>
                      <p className="text-xs text-[#71717a] mt-1">or click to browse — max 5 MB</p>
                    </div>
                  </>
                )}
              </div>

              {/* Upload error */}
              {uploadError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {uploadError}
                </div>
              )}

              {/* Column reference */}
              <div className="rounded-2xl border border-[#1c2233] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#0f141c] border-b border-[#1c2233]">
                  <p className="text-[10px] uppercase tracking-wider text-[#52525b] font-semibold">Expected CSV columns</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1c2233]">
                        {["Column", "Required", "Type", "Rules"].map((h) => (
                          <th key={h} className="px-4 py-2 text-[9px] uppercase tracking-wider text-[#52525b] font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {[
                        ["name",        "✅",  "text",    "Max 255 characters"],
                        ["price",       "✅",  "number",  "Numeric, ≥ 0"],
                        ["stock",       "optional", "integer", "Whole number, ≥ 0 (default 0)"],
                        ["sku",         "optional", "text",    "Unique — skipped if already exists"],
                        ["category",    "optional", "text",    "Free text"],
                        ["brand",       "optional", "text",    "Free text"],
                        ["description", "optional", "text",    "Free text"],
                        ["rating",      "optional", "number",  "0 – 5"],
                        ["status",      "optional", "text",    "active | draft | archived"],
                      ].map(([col, req, type, rule]) => (
                        <tr key={col} className="border-b border-[#1c2233] hover:bg-[#0f141c] transition-colors">
                          <td className="px-4 py-2 font-mono text-[#a1a1aa]">{col}</td>
                          <td className="px-4 py-2">
                            {req === "✅"
                              ? <span className="text-emerald-400 text-[10px] font-semibold">Required</span>
                              : <span className="text-[#52525b] text-[10px]">Optional</span>}
                          </td>
                          <td className="px-4 py-2 text-[#71717a]">{type}</td>
                          <td className="px-4 py-2 text-[#71717a]">{rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Preview step ── */}
          {step === "preview" && preview && (
            <ImportPreviewTable
              preview={preview}
              onConfirm={handleConfirm}
              onReset={handleReset}
              loading={confirming}
            />
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Import Successful</p>
                <p className="text-xs text-[#71717a] mt-1">Products have been added to your catalog.</p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-all"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// PHASE 6 IMPLEMENTATION END
