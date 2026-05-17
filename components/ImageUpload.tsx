"use client";

// Phase 7 — components/ImageUpload.tsx
// Drag-and-drop / click file picker. Uploads images to POST /api/products/{id}/images.
// Supports multiple files, shows per-file status, calls onUploadSuccess after each upload.

import { useState, useRef, useCallback } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ProductImage } from "@/lib/types";

// PHASE 7 IMPLEMENTATION START

interface QueueItem {
  id:       string;
  name:     string;
  status:   "pending" | "uploading" | "done" | "error";
  error?:   string;
}

interface ImageUploadProps {
  productId:       number;
  onUploadSuccess: (image: ProductImage) => void;
  compact?:        boolean;
}

const ACCEPTED_MIME = [
  "image/jpeg", "image/jpg", "image/png",
  "image/webp", "image/gif", "image/avif",
];
const MAX_MB = 10;

export default function ImageUpload({
  productId,
  onUploadSuccess,
  compact = false,
}: ImageUploadProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue]       = useState<QueueItem[]>([]);

  const updateItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const uploadFile = useCallback(
    async (file: File) => {
      const itemId: string = `${file.name}_${Date.now()}`;
      setQueue((prev) => [...prev, { id: itemId, name: file.name, status: "pending" }]);

      if (!ACCEPTED_MIME.includes(file.type)) {
        updateItem(itemId, { status: "error", error: `Unsupported type: ${file.type}` });
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        updateItem(itemId, { status: "error", error: `Exceeds ${MAX_MB} MB limit` });
        return;
      }

      updateItem(itemId, { status: "uploading" });
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("alt_text", file.name.replace(/\.[^.]+$/, ""));

        const res  = await fetch(`/api/products/${productId}/images`, { method: "POST", body: fd });
        const json = await res.json();

        if (!res.ok) {
          updateItem(itemId, { status: "error", error: json.error ?? "Upload failed" });
          return;
        }
        updateItem(itemId, { status: "done" });
        onUploadSuccess(json.image as ProductImage);
        setTimeout(() => setQueue((prev) => prev.filter((i) => i.id !== itemId)), 2500);
      } catch {
        updateItem(itemId, { status: "error", error: "Network error" });
      }
    },
    [productId, onUploadSuccess]
  );

  const handleFiles = (files: FileList) => Array.from(files).forEach(uploadFile);

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        id="image-upload-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
          compact ? "py-4 px-4" : "py-7 px-6"
        } ${dragOver
          ? "border-white/40 bg-white/5"
          : "border-[#27272a] hover:border-[#3f3f46] hover:bg-[#0f141c]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
        />
        <div className={`rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center ${compact ? "w-8 h-8" : "w-10 h-10"}`}>
          <Upload className={`text-[#71717a] ${compact ? "w-4 h-4" : "w-5 h-5"}`} />
        </div>
        <div className="text-center">
          <p className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}>
            {dragOver ? "Drop images here" : "Upload images"}
          </p>
          <p className="text-[10px] text-[#52525b] mt-0.5">
            JPEG · PNG · WebP · GIF · AVIF — max {MAX_MB} MB
          </p>
        </div>
      </div>

      {/* Per-file status rows */}
      {queue.length > 0 && (
        <div className="space-y-1">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                item.status === "done"      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                item.status === "error"     ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                              "bg-[#0f141c] border-[#1c2333] text-[#a1a1aa]"
              }`}
            >
              {item.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              {item.status === "done"      && <CheckCircle2 className="w-3 h-3 shrink-0" />}
              {item.status === "error"     && <AlertCircle className="w-3 h-3 shrink-0" />}
              <span className="truncate flex-1">
                {item.status === "error" ? item.error : item.name}
              </span>
              {item.status === "error" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setQueue((p) => p.filter((i) => i.id !== item.id)); }}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// PHASE 7 IMPLEMENTATION END
