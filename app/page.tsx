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
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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
  }, [category, minPrice, maxPrice, minRating, searchDebounce, sortBy, sortOrder, page, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [category, minPrice, maxPrice, minRating, searchDebounce, sortBy, sortOrder]);

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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Products
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Manage your product inventory and catalog
                </p>
              </div>
              {data.total === 0 && !loading && (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
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
                    <><Database className="w-4 h-4 mr-1" /> Seed Sample Data</>
                  )}
                </button>
              )}
            </div>

            {/* Filters */}
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              category={category}
              onCategoryChange={setCategory}
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
              totalProducts={data.total}
            />

            {/* Table */}
            <ProductTable
              products={data.products}
              loading={loading}
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
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Inventory analytics and product insights
              </p>
            </div>
            <Reports />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-400 text-center">
            ProductVault © {new Date().getFullYear()} — Built with Next.js & PostgreSQL
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
