"use client";

// Phase 7 — components/ImageGallery.tsx
// Displays all product_images for a product.
// Features: grid view with thumbnails, set-primary toggle, delete, inline alt-text editing.
// Includes the ImageUpload drop-zone above the gallery.

import { useState, useEffect, useCallback } from "react";
import { Star, Trash2, Pencil, Check, X, Loader2, ImageOff } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import type { ProductImage } from "@/lib/types";
import { useToast } from "@/components/Toast";

// PHASE 7 IMPLEMENTATION START

interface ImageGalleryProps {
  productId: number;
  /** Called when the primary image changes so parent can update its state */
  onPrimaryChanged?: (url: string | null) => void;
}

interface EditingState {
  id:      number;
  altText: string;
}

export default function ImageGallery({ productId, onPrimaryChanged }: ImageGalleryProps) {
  const { showToast } = useToast();
  const [images,    setImages]    = useState<ProductImage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<EditingState | null>(null);
  const [deleting,  setDeleting]  = useState<number | null>(null);
  const [promoting, setPromoting] = useState<number | null>(null);

  // ── Fetch images ────────────────────────────────────────────────────────────

  const fetchImages = useCallback(async () => {
    try {
      const res  = await fetch(`/api/products/${productId}/images`);
      const json = await res.json();
      if (res.ok) setImages(json.images ?? []);
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // ── Upload success callback ─────────────────────────────────────────────────

  const handleUploadSuccess = (newImage: ProductImage) => {
    setImages((prev) => {
      // If the new image is primary, clear existing primary flag in local state
      const updated = newImage.is_primary
        ? prev.map((img) => ({ ...img, is_primary: false }))
        : [...prev];
      return [...updated, newImage].sort((a, b) =>
        a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1
      );
    });
    if (newImage.is_primary) onPrimaryChanged?.(newImage.url);
    showToast("Image uploaded successfully", "success");
  };

  // ── Set primary ─────────────────────────────────────────────────────────────

  const handleSetPrimary = async (img: ProductImage) => {
    if (img.is_primary || promoting !== null) return;
    setPromoting(img.id);
    try {
      const res  = await fetch(`/api/products/${productId}/images/${img.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_primary: true }),
      });
      if (!res.ok) throw new Error();
      setImages((prev) =>
        prev
          .map((i) => ({ ...i, is_primary: i.id === img.id }))
          .sort((a, b) => (a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1))
      );
      onPrimaryChanged?.(img.url);
      showToast("Primary image updated", "success");
    } catch {
      showToast("Failed to update primary image", "error");
    } finally {
      setPromoting(null);
    }
  };

  // ── Delete image ─────────────────────────────────────────────────────────────

  const handleDelete = async (img: ProductImage) => {
    if (deleting !== null) return;
    setDeleting(img.id);
    try {
      const res = await fetch(`/api/products/${productId}/images/${img.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setImages((prev) => {
        const remaining = prev.filter((i) => i.id !== img.id);
        // If deleted was primary, auto-promote next
        if (img.is_primary && remaining.length > 0) {
          const sorted = [...remaining].sort((a, b) => a.sort_order - b.sort_order);
          sorted[0] = { ...sorted[0], is_primary: true };
          onPrimaryChanged?.(sorted[0].url);
          return sorted;
        }
        if (remaining.length === 0) onPrimaryChanged?.(null);
        return remaining;
      });
      showToast("Image deleted", "success");
    } catch {
      showToast("Failed to delete image", "error");
    } finally {
      setDeleting(null);
    }
  };

  // ── Save alt-text ─────────────────────────────────────────────────────────────

  const handleSaveAlt = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/products/${productId}/images/${editing.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ alt_text: editing.altText }),
      });
      if (!res.ok) throw new Error();
      setImages((prev) =>
        prev.map((i) => (i.id === editing.id ? { ...i, alt_text: editing.altText } : i))
      );
      setEditing(null);
      showToast("Alt text saved", "success");
    } catch {
      showToast("Failed to save alt text", "error");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <ImageUpload productId={productId} onUploadSuccess={handleUploadSuccess} compact />

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center h-20 text-[#52525b]">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-[#52525b]" />
          </div>
          <p className="text-xs text-[#52525b]">No images yet — upload one above</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className={`relative group rounded-xl overflow-hidden border transition-all ${
                img.is_primary
                  ? "border-white/30 ring-1 ring-white/20"
                  : "border-[#27272a] hover:border-[#3f3f46]"
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-[#0f141c]">
                <img
                  src={img.thumbnail_url || img.url}
                  alt={img.alt_text || "Product image"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Primary badge */}
              {img.is_primary && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-white/90 text-black">
                  <Star className="w-2.5 h-2.5 fill-black" /> Primary
                </div>
              )}

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                {/* Set primary */}
                {!img.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(img)}
                    disabled={promoting === img.id}
                    title="Set as primary"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-medium transition-all disabled:opacity-50 w-full justify-center"
                  >
                    {promoting === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                    Primary
                  </button>
                )}

                {/* Edit alt text */}
                <button
                  onClick={() => setEditing({ id: img.id, altText: img.alt_text })}
                  title="Edit alt text"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-medium transition-all w-full justify-center"
                >
                  <Pencil className="w-3 h-3" /> Alt text
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(img)}
                  disabled={deleting === img.id}
                  title="Delete image"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-medium transition-all disabled:opacity-50 w-full justify-center"
                >
                  {deleting === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alt-text editor */}
      {editing && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0f141c] border border-[#1c2333]">
          <input
            type="text"
            value={editing.altText}
            onChange={(e) => setEditing({ ...editing, altText: e.target.value })}
            placeholder="Describe this image…"
            className="flex-1 px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#18181b] text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#3f3f46]"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveAlt(); if (e.key === "Escape") setEditing(null); }}
          />
          <button onClick={handleSaveAlt} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717a] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {images.length > 0 && (
        <p className="text-[10px] text-[#52525b]">
          {images.length} image{images.length !== 1 ? "s" : ""} — hover a thumbnail to manage it
        </p>
      )}
    </div>
  );
}

// PHASE 7 IMPLEMENTATION END
