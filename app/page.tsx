"use client";

import { useState, useEffect, useCallback } from "react";
import { Product, ProductFormData, PaginatedResponse } from "@/lib/types";
import { ToastProvider, useToast } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
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
import AdvancedCharts from "@/components/AdvancedCharts";
import QuickActions from "@/components/QuickActions";
import InsightsPanel from "@/components/InsightsPanel";
// Phase 2: Supplier management components
import SupplierTable from "@/components/SupplierTable";
import SupplierModal from "@/components/SupplierModal";
import SupplierDetail from "@/components/SupplierDetail";
import SupplierStats from "@/components/SupplierStats";
// Phase 3: Audit trail components
import ActivityFeed from "@/components/ActivityFeed";
import AuditLog from "@/components/AuditLog";
// Phase 4: Purchase Orders & Reorder components
import POStats from "@/components/POStats";
import PurchaseOrderList from "@/components/PurchaseOrderList";
import PurchaseOrderModal from "@/components/PurchaseOrderModal";
import PurchaseOrderDetail from "@/components/PurchaseOrderDetail";
import ReorderSuggestions from "@/components/ReorderSuggestions";
import { Database, ClipboardList, ShoppingCart } from "lucide-react";

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

  // Phase 2: Supplier state
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<import("@/lib/types").Supplier | null>(null);
  const [supplierModalLoading, setSupplierModalLoading] = useState(false);
  const [supplierDetailId, setSupplierDetailId] = useState<number | null>(null);
  const [supplierRefreshKey, setSupplierRefreshKey] = useState(0);
  // Holds pending supplier link data after product save
  const [pendingSupplierLink, setPendingSupplierLink] = useState<{
    supplierId: number;
    costPrice: number;
    leadDays: number;
  } | null>(null);

  // Phase 4: Purchase Order state
  const [poModalOpen, setPOModalOpen]                   = useState(false);
  const [editingPO, setEditingPO]                       = useState<import("@/lib/types").PurchaseOrder | null>(null);
  const [poModalLoading, setPOModalLoading]             = useState(false);
  const [poDetailId, setPODetailId]                     = useState<number | null>(null);
  const [poRefreshKey, setPORefreshKey]                 = useState(0);
  const [poModalPrefill, setPOModalPrefill]             = useState<{
    supplier_id?: number;
    product_id?: number;
    product_name?: string;
    quantity?: number;
    unit_price?: number;
  } | null>(null);

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Listen for tab-switch events dispatched by child components (e.g. ActivityFeed "View full log")
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("obsidian:tab", handler);
    return () => window.removeEventListener("obsidian:tab", handler);
  }, []);


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

      const savedProduct = await res.json();

      // Phase 2: link supplier if one was selected in ProductModal
      if (pendingSupplierLink && savedProduct.id) {
        try {
          await fetch(`/api/suppliers/${pendingSupplierLink.supplierId}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_id: savedProduct.id,
              cost_price: pendingSupplierLink.costPrice,
              lead_days: pendingSupplierLink.leadDays,
              is_primary: true,
            }),
          });
        } catch {
          // Non-fatal: product was saved, supplier link silently failed
          showToast("Product saved but supplier link failed", "error");
        }
        setPendingSupplierLink(null);
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

  // Phase 2: Supplier CRUD handlers
  const handleSupplierSubmit = async (formData: import("@/lib/types").SupplierFormData) => {
    setSupplierModalLoading(true);
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save supplier");
      }
      showToast(
        editingSupplier ? "Supplier updated!" : "Supplier created!",
        "success"
      );
      setSupplierModalOpen(false);
      setEditingSupplier(null);
      setSupplierRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSupplierModalLoading(false);
    }
  };

  const handleSupplierDelete = async (supplier: import("@/lib/types").Supplier) => {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete supplier");
      }
      showToast("Supplier deleted", "success");
      setSupplierRefreshKey((k) => k + 1);
      if (supplierDetailId === supplier.id) setSupplierDetailId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  // Phase 4: Purchase Order CRUD handlers
  const handlePOSubmit = async (formData: import("@/lib/types").PurchaseOrderFormData) => {
    setPOModalLoading(true);
    try {
      const url    = editingPO ? `/api/purchase-orders/${editingPO.id}` : "/api/purchase-orders";
      const method = editingPO ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save purchase order");
      }
      const saved = await res.json();
      showToast(
        editingPO ? "Purchase order updated!" : `PO #${saved.id} created!`,
        "success"
      );
      setPOModalOpen(false);
      setEditingPO(null);
      setPOModalPrefill(null);
      setPORefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setPOModalLoading(false);
    }
  };

  const handlePODelete = async (po: import("@/lib/types").PurchaseOrder) => {
    if (!confirm(`Delete draft PO #${po.id}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete PO");
      }
      showToast(`PO #${po.id} deleted`, "success");
      setPORefreshKey((k) => k + 1);
      if (poDetailId === po.id) setPODetailId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
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
    <div className="min-h-screen bg-transparent">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                    Live Inventory
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                    Product Control Center
                  </h2>
                  <p className="text-sm sm:text-base text-muted max-w-2xl">
                    Maintain a premium catalog, monitor inventory health, and keep every SKU ready for launch.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl ambient-inset">
                    <div className="text-xs uppercase text-[#a1a1aa] tracking-wider">Total SKUs</div>
                    <div className="text-lg font-semibold text-white">{data.total}</div>
                  </div>
                  {data.total === 0 && !loading && (
                    <button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white border border-[#3f3f46] hover:bg-white/10 transition-all disabled:opacity-50"
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

            <AdvancedCharts products={data.products} />

            <InsightsPanel products={data.products} />

            {/* Phase 3: Activity feed on dashboard Overview */}
            <ActivityFeed />

            <QuickActions />

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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                Insights
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                Performance Briefing
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-2xl">
                Track revenue impact, category mix, and inventory risk signals in real time.
              </p>
            </div>
            <Reports />
          </div>
        )}

        {activeTab === "catalog" && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                Catalog
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                Product Catalog
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-2xl">
                Curate and manage the full product lifecycle from draft to archive.
              </p>
            </div>
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
            <BulkActions
              selectedCount={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onApplyStatus={applyBulkStatus}
              onDelete={bulkDelete}
              loading={bulkLoading}
            />
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
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                Inventory
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                Stock Command
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-2xl">
                Monitor adjustments, alert queues, and replenishment priorities.
              </p>
            </div>
            <InventoryAlerts
              onAdjustStock={(product) => {
                setStockAdjustProductId(product.id);
                setStockAdjustOpen(true);
              }}
            />
            <AdvancedCharts products={data.products} />
          </div>
        )}

        {/* Phase 2: Suppliers tab */}
        {activeTab === "suppliers" && (
          <div className="space-y-8 animate-fade-in">
            {supplierDetailId ? (
              /* Detail view when a supplier row is clicked */
              <SupplierDetail
                supplierId={supplierDetailId}
                onEdit={(s) => {
                  setEditingSupplier(s);
                  setSupplierModalOpen(true);
                }}
                onBack={() => setSupplierDetailId(null)}
                onUnlinkProduct={() => setSupplierRefreshKey((k) => k + 1)}
              />
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                      Supplier Network
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                      Supplier Management
                    </h2>
                    <p className="text-sm sm:text-base text-muted max-w-2xl">
                      Manage your supplier network, track lead times, and link products to vendors.
                    </p>
                  </div>
                </div>

                {/* KPI stats */}
                <SupplierStats />

                {/* Paginated supplier table */}
                <SupplierTable
                  refreshKey={supplierRefreshKey}
                  onAdd={() => {
                    setEditingSupplier(null);
                    setSupplierModalOpen(true);
                  }}
                  onEdit={(s) => {
                    setEditingSupplier(s);
                    setSupplierModalOpen(true);
                  }}
                  onDelete={handleSupplierDelete}
                  onView={(s) => setSupplierDetailId(s.id)}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "projects" && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                Workflows
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                Automation Studio
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-2xl">
                Design and monitor operational flows across catalog, stock, and channels.
              </p>
            </div>
            <QuickActions />
            <InsightsPanel products={data.products} />
          </div>
        )}

        {/* Phase 4: Orders tab */}
        {activeTab === "orders" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                Procurement
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                Purchase Orders
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-2xl">
                Create and track purchase orders, receive stock from suppliers, and act on reorder recommendations.
              </p>
            </div>

            {/* KPI cards */}
            <POStats />

            {/* PO list */}
            <PurchaseOrderList
              onView={(id) => setPODetailId(id)}
              onCreate={() => {
                setEditingPO(null);
                setPOModalPrefill(null);
                setPOModalOpen(true);
              }}
              onDelete={handlePODelete}
              refreshKey={poRefreshKey}
            />

            {/* Reorder suggestions */}
            <ReorderSuggestions
              onCreatePO={(item) => {
                setEditingPO(null);
                setPOModalPrefill({
                  supplier_id:  item.supplier_id  ?? undefined,
                  product_id:   item.id,
                  product_name: item.name,
                  quantity:     item.suggested_qty,
                  unit_price:   item.cost_price   ?? undefined,
                });
                setPOModalOpen(true);
                setActiveTab("orders");
              }}
            />
          </div>
        )}

        {/* Phase 3: Audit Log tab */}
        {activeTab === "audit" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
                Audit Trail
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl text-gradient font-(--font-display)">
                Activity Log
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-2xl">
                Complete history of all create, update, delete, and stock adjustment operations.
              </p>
            </div>

            {/* Full audit table */}
            <AuditLog />
          </div>
        )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-[#71717a] text-center">
            Obsidian © {new Date().getFullYear()} — Inventory Suite
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
          setPendingSupplierLink(null);
        }}
        onSubmit={handleSubmit}
        product={editingProduct}
        loading={modalLoading}
        // Phase 2: store supplier selection so handleSubmit can link after save
        onSupplierLink={(productId, supplierId, costPrice, leadDays) => {
          setPendingSupplierLink({ supplierId, costPrice, leadDays });
        }}
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

      {/* Phase 2: Supplier create/edit modal */}
      <SupplierModal
        isOpen={supplierModalOpen}
        onClose={() => {
          setSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onSubmit={handleSupplierSubmit}
        supplier={editingSupplier}
        loading={supplierModalLoading}
      />

      {/* Phase 4: Purchase Order create/edit modal */}
      <PurchaseOrderModal
        isOpen={poModalOpen}
        onClose={() => {
          setPOModalOpen(false);
          setEditingPO(null);
          setPOModalPrefill(null);
        }}
        onSubmit={handlePOSubmit}
        order={editingPO}
        loading={poModalLoading}
        prefill={poModalPrefill}
      />

      {/* Phase 4: Purchase Order detail modal */}
      <PurchaseOrderDetail
        poId={poDetailId}
        onClose={() => setPODetailId(null)}
        onEdit={(po) => {
          setPODetailId(null);
          setEditingPO(po);
          setPOModalOpen(true);
        }}
        onRefresh={() => setPORefreshKey((k) => k + 1)}
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
