"use client";

import { useState, useEffect, useCallback } from "react";
import { Product, ProductFormData, PaginatedResponse } from "@/lib/types";
import { ToastProvider, useToast } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import ProductTable from "@/components/ProductTable";
import ProductModal from "@/components/ProductModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Pagination from "@/components/Pagination";
import Reports from "@/components/Reports";
import StockAdjustModal from "@/components/StockAdjustModal";
import DashboardStats from "@/components/DashboardStats";
import BulkActions from "@/components/BulkActions";
import InventoryAlerts from "@/components/InventoryAlerts";
import { Database } from "lucide-react";

function Dashboard() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Products state
  const [data, setData] = useState<PaginatedResponse>({
    products: [],
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Stock adjust modal state
  const [stockAdjustOpen, setStockAdjustOpen] = useState(false);
  const [stockAdjustProductId, setStockAdjustProductId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Delete state
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (minRating) params.set("minRating", minRating);
      if (searchDebounce) params.set("search", searchDebounce);
      if (status !== "all") params.set("status", status);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", page.toString());
      params.set("limit", "12");

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch products");
      setData(json);
    } catch (err) {
      showToast("Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  }, [category, minPrice, maxPrice, minRating, searchDebounce, status, sortBy, sortOrder, page, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [category, minPrice, maxPrice, minRating, searchDebounce, status, sortBy, sortOrder]);

  // Seed database
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/products/seed", { method: "POST" });
      const json = await res.json();
      showToast(json.message, "success");
      fetchProducts();
    } catch {
      showToast("Failed to seed database", "error");
    } finally {
      setSeeding(false);
    }
  };

  // Create / Update
  const handleSubmit = async (formData: ProductFormData) => {
    setModalLoading(true);
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const payload = {
        ...formData,
        rating: formData.rating === "" ? 0 : formData.rating,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save product");
      }

      showToast(
        editingProduct
          ? "Product updated successfully!"
          : "Product created successfully!",
        "success"
      );
      setModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Something went wrong",
        "error"
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${deleteProduct.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");

      showToast("Product deleted successfully!", "success");
      setDeleteProduct(null);
      fetchProducts();
    } catch {
      showToast("Failed to delete product", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setStatus("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const applyBulkStatus = async (nextStatus: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk update failed");
      showToast(`Updated ${json.updated} products`, "success");
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Bulk update failed",
        "error"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk delete failed");
      showToast(`Deleted ${json.deleted} products`, "success");
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Bulk delete failed",
        "error"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#121723] text-[#7dd3fc] border border-[#1c2333]">
                    Live Inventory
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse-soft" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-semibold text-gradient font-[var(--font-display)]">
                    Product Control Center
                  </h2>
                  <p className="text-sm sm:text-base text-[color:var(--muted)] max-w-2xl">
                    Maintain a premium catalog, monitor inventory health, and keep every SKU ready for launch.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl ambient-inset">
                    <div className="text-xs uppercase text-[color:var(--muted)] tracking-wider">Total SKUs</div>
                    <div className="text-lg font-semibold text-white">{data.total}</div>
                  </div>
                  {data.total === 0 && !loading && (
                    <button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {seeding ? (
                        <>
                          <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Seeding...
                        </>
                      ) : (
                        <><Database className="w-4 h-4" /> Seed Sample Data</>
                      )}
                    </button>
                  )}
                </div>
              </div>

            <DashboardStats />

            <InventoryAlerts
              onAdjustStock={(product) => {
                setStockAdjustProductId(product.id);
                setStockAdjustOpen(true);
              }}
            />

            <BulkActions
              selectedCount={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onApplyStatus={applyBulkStatus}
              onDelete={bulkDelete}
              loading={bulkLoading}
            />

            {/* Filters */}
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              category={category}
              onCategoryChange={setCategory}
              status={status}
              onStatusChange={setStatus}
              minPrice={minPrice}
              onMinPriceChange={setMinPrice}
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              onClearFilters={clearFilters}
              onAddProduct={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              onStockAdjust={() => {
                setStockAdjustProductId(null);
                setStockAdjustOpen(true);
              }}
              totalProducts={data.total}
            />

            {/* Table */}
            <ProductTable
              products={data.products}
              loading={loading}
              onSelectChange={setSelectedIds}
              onAdjustStock={(product) => {
                setStockAdjustProductId(product.id);
                setStockAdjustOpen(true);
              }}
              onEdit={(product) => {
                setEditingProduct(product);
                setModalOpen(true);
              }}
              onDelete={(product) => setDeleteProduct(product)}
            />

            {/* Pagination */}
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#121723] text-[#f4d06f] border border-[#1c2333]">
                Insights
                <span className="w-1.5 h-1.5 rounded-full bg-[#f4d06f]" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-gradient font-[var(--font-display)]">
                Performance Briefing
              </h2>
              <p className="text-sm sm:text-base text-[color:var(--muted)] max-w-2xl">
                Track revenue impact, category mix, and inventory risk signals in real time.
              </p>
            </div>
            <Reports />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c2233] py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-[#667085] text-center">
            ProductVault © {new Date().getFullYear()} - Ambient Ops Edition
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSubmit}
        product={editingProduct}
        loading={modalLoading}
      />

      <StockAdjustModal
        isOpen={stockAdjustOpen}
        onClose={() => {
          setStockAdjustOpen(false);
          setStockAdjustProductId(null);
        }}
        onAdjusted={fetchProducts}
        defaultProductId={stockAdjustProductId}
      />

      <DeleteConfirmModal
        isOpen={!!deleteProduct}
        productName={deleteProduct?.name || ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteProduct(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
