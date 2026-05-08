# Obsidian — Full-Stack Enhancement Plan

> **Scope:** High-Impact + Professional tier features
> **Goal:** Production-ready, fully integrated full-stack architecture
> **Stack:** Next.js 16 (App Router) + PostgreSQL + Lucide React

---

## Phase 1: Database Foundation

### 1.1 New Tables

```sql
-- Suppliers
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  contact_person VARCHAR(255),
  rating NUMERIC(2,1) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product-Supplier junction (many-to-many)
CREATE TABLE product_suppliers (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  lead_days INTEGER DEFAULT 7,
  is_primary BOOLEAN DEFAULT false,
  min_order_qty INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, supplier_id)
);

-- Audit log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  entity_name VARCHAR(255),
  details JSONB DEFAULT '{}',
  performed_by VARCHAR(100) DEFAULT 'system',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Purchase orders
CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'draft',
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase order line items
CREATE TABLE purchase_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_qty INTEGER DEFAULT 0,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (for RBAC)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'viewer',
  avatar_url VARCHAR(500) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product images
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255) DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Alter Existing Tables

```sql
ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN reorder_qty INTEGER DEFAULT 50;
ALTER TABLE products ADD COLUMN barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN weight NUMERIC(8,2);
ALTER TABLE products ADD COLUMN dimensions VARCHAR(100);
ALTER TABLE stock_movements ADD COLUMN performed_by INTEGER REFERENCES users(id);
```

### 1.3 Database Triggers

```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

---

## Phase 2: Supplier Management

### 2.1 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/suppliers` | List with search, pagination, sort |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/suppliers/[id]` | Get supplier with linked products |
| PUT | `/api/suppliers/[id]` | Update supplier |
| DELETE | `/api/suppliers/[id]` | Delete (blocked if has active POs) |
| GET | `/api/suppliers/stats` | Count, avg lead time, top suppliers |
| POST | `/api/suppliers/[id]/products` | Link product to supplier |
| DELETE | `/api/suppliers/[id]/products/[productId]` | Unlink product |

**Files to create:**
- `app/api/suppliers/route.ts`
- `app/api/suppliers/[id]/route.ts`
- `app/api/suppliers/stats/route.ts`
- `app/api/suppliers/[id]/products/route.ts`
- `app/api/suppliers/[id]/products/[productId]/route.ts`

### 2.2 Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| SupplierTable | `components/SupplierTable.tsx` | Paginated table with search/sort |
| SupplierModal | `components/SupplierModal.tsx` | Create/edit form |
| SupplierDetail | `components/SupplierDetail.tsx` | Detail view with linked products |
| SupplierStats | `components/SupplierStats.tsx` | KPI cards for supplier metrics |

### 2.3 Integration Points
- **ProductModal**: Add supplier dropdown with cost_price and lead_days
- **ProductTable**: Show primary supplier name column
- **Sidebar**: Add "Suppliers" nav item with `Truck` icon
- **page.tsx**: Add `suppliers` tab section

---

## Phase 3: Audit Trail

### 3.1 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/audit` | Paginated log with filters (entity_type, action, date range) |
| GET | `/api/audit/stats` | Action counts by type, recent activity |

### 3.2 Audit Helper — `lib/audit.ts`

```typescript
export async function logAudit(params: {
  action: string;       // create, update, delete, stock_adjust, bulk_update, import
  entityType: string;   // product, supplier, purchase_order
  entityId?: number;
  entityName?: string;
  details?: Record<string, unknown>;
  performedBy?: string;
}) {
  await query(
    `INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [params.action, params.entityType, params.entityId, params.entityName,
     JSON.stringify(params.details || {}), params.performedBy || 'system']
  );
}
```

### 3.3 Routes to Integrate Logging

| Route | Action |
|-------|--------|
| `POST /api/products` | `create` with full product data |
| `PUT /api/products/[id]` | `update` with old vs new diff |
| `DELETE /api/products/[id]` | `delete` with deleted product data |
| `PATCH /api/products/[id]` | `stock_adjust` with delta, reason |
| `PATCH /api/products/bulk` | `bulk_update` with ids and status |
| `DELETE /api/products/bulk` | `bulk_delete` with ids |
| All supplier routes | Corresponding actions |

### 3.4 Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| ActivityFeed | `components/ActivityFeed.tsx` | Recent actions timeline on dashboard |
| AuditLog | `components/AuditLog.tsx` | Full searchable audit table |
| AuditDetail | `components/AuditDetail.tsx` | JSON diff viewer |

---

## Phase 4: Purchase Orders & Reorder System

### 4.1 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/purchase-orders` | List with filters (status, supplier, date) |
| POST | `/api/purchase-orders` | Create PO with line items |
| GET | `/api/purchase-orders/[id]` | Get PO with items + supplier |
| PUT | `/api/purchase-orders/[id]` | Update PO details |
| DELETE | `/api/purchase-orders/[id]` | Delete draft PO only |
| PATCH | `/api/purchase-orders/[id]/status` | Send, cancel |
| PATCH | `/api/purchase-orders/[id]/receive` | Receive → auto-update stock |
| GET | `/api/purchase-orders/stats` | Pending count, total value |
| GET | `/api/reorder-suggestions` | Products below reorder_point |

### 4.2 Receive PO Logic (Critical Transaction)

```
1. Update purchase_order_items.received_qty
2. withTransaction():
   a. UPDATE products.stock += received_qty
   b. INSERT INTO stock_movements (reason='purchase_order', note='PO #123')
3. Update PO status → 'received' or 'partial'
4. Log to audit_log
```

### 4.3 Frontend Components

| Component | File |
|-----------|------|
| PurchaseOrderList | `components/PurchaseOrderList.tsx` |
| PurchaseOrderModal | `components/PurchaseOrderModal.tsx` |
| PurchaseOrderDetail | `components/PurchaseOrderDetail.tsx` |
| ReorderSuggestions | `components/ReorderSuggestions.tsx` |
| POStats | `components/POStats.tsx` |

---

## Phase 5: Advanced Analytics

### 5.1 API Routes

| Method | Route | Params |
|--------|-------|--------|
| GET | `/api/analytics/trends` | period=30d, groupBy=day |
| GET | `/api/analytics/velocity` | period=30d, limit=10 |
| GET | `/api/analytics/value-history` | period=90d |
| GET | `/api/analytics/category-performance` | period=30d |

### 5.2 Key SQL Queries

```sql
-- Daily stock movement trends
SELECT DATE(created_at) as date,
       SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) as inbound,
       SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END) as outbound
FROM stock_movements
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at) ORDER BY date;

-- Stock velocity (fastest movers)
SELECT p.id, p.name, p.sku,
       COUNT(sm.id) as movements,
       SUM(ABS(sm.delta)) as total_units
FROM products p
JOIN stock_movements sm ON sm.product_id = p.id
WHERE sm.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id ORDER BY total_units DESC LIMIT 10;
```

### 5.3 Frontend Components

| Component | File |
|-----------|------|
| AnalyticsDashboard | `components/analytics/AnalyticsDashboard.tsx` |
| TrendChart | `components/analytics/TrendChart.tsx` |
| VelocityTable | `components/analytics/VelocityTable.tsx` |
| ValueChart | `components/analytics/ValueChart.tsx` |
| DateRangePicker | `components/analytics/DateRangePicker.tsx` |

---

## Phase 6: Batch Import

### 6.1 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/products/import` | Parse CSV → validate → return preview |
| POST | `/api/products/import/confirm` | Execute validated import |
| GET | `/api/products/import/template` | Download CSV template |

### 6.2 Validation Rules

| Field | Rule |
|-------|------|
| name | Required, max 255 chars |
| price | Required, numeric, >= 0 |
| stock | Optional, integer, >= 0 |
| sku | Optional, unique if provided |
| rating | Optional, 0-5 |
| status | Must be active/draft/archived |

### 6.3 Frontend: `ImportModal.tsx` + `ImportPreviewTable.tsx`
- Drag-and-drop upload zone
- Color-coded preview (green=valid, red=error, yellow=warning)
- Confirm button to execute import

---

## Phase 7: Product Image Upload

### 7.1 API Routes

| Method | Route |
|--------|-------|
| POST | `/api/products/[id]/images` |
| DELETE | `/api/products/[id]/images/[imageId]` |
| PATCH | `/api/products/[id]/images/[imageId]` |

### 7.2 Strategy
- Store in `public/uploads/products/`
- Resize to 800x800 max via `sharp`
- Generate 200x200 thumbnail
- Unique filename: `{productId}_{timestamp}.webp`

### 7.3 Frontend: `ImageUpload.tsx` + `ImageGallery.tsx`
- Drag-and-drop in ProductModal
- Replace placeholder icons in ProductTable with real thumbnails

---

## Phase 8: Role-Based Access Control

### 8.1 API Routes

| Method | Route |
|--------|-------|
| POST | `/api/auth/login` |
| POST | `/api/auth/register` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |
| GET | `/api/users` |
| PUT | `/api/users/[id]` |
| DELETE | `/api/users/[id]` |

### 8.2 Auth Helper — `lib/auth.ts`

```typescript
export async function getSession(request: NextRequest) { ... }
export async function requireRole(request: NextRequest, roles: string[]) { ... }
```

### 8.3 Permission Matrix

| Action | Admin | Manager | Viewer |
|--------|-------|---------|--------|
| View products | ✅ | ✅ | ✅ |
| Create/Edit product | ✅ | ✅ | ❌ |
| Delete product | ✅ | ❌ | ❌ |
| Adjust stock | ✅ | ✅ | ❌ |
| Bulk operations | ✅ | ❌ | ❌ |
| Manage suppliers | ✅ | ✅ | ❌ |
| Create/Receive PO | ✅ | ✅ | ❌ |
| View audit log | ✅ | ✅ | ❌ |
| Import products | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

### 8.4 Frontend: `app/login/page.tsx`, `AuthProvider.tsx`, `UserMenu.tsx`, `UserManagement.tsx`

---

## Phase 9: Barcode Generation

- Use `bwip-js` for Code128 barcodes from SKU
- `GET /api/products/[id]/barcode` → SVG
- Print labels button for batch printing

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
DB Schema  Suppliers  Audit     PO/Reorder Analytics  Import    Images    Auth      Barcodes
```

## New Files Summary (~44 total)

| Category | Count |
|----------|-------|
| API Routes | ~20 |
| Components | ~18 |
| Lib/Utils | ~4 |
| Pages | ~1 |
| SQL | ~1 |

## Dependencies

```bash
npm install bcryptjs bwip-js sharp csv-parse
npm install -D @types/bcryptjs @types/bwip-js
```

## Final Sidebar Navigation

```
├── Overview      (LayoutDashboard)
├── Catalog       (Package)
├── Inventory     (Boxes)
├── Suppliers     (Truck)          ← NEW
├── Orders        (ShoppingCart)   ← NEW
├── Reports       (LineChart)      → Analytics
└── Activity      (ScrollText)     ← NEW
```

## Quality Checklist

- [ ] All API routes return proper error codes (400, 401, 403, 404, 500)
- [ ] All mutations wrapped in transactions where needed
- [ ] All mutations log to audit_log
- [ ] Pagination on every list endpoint
- [ ] Input validation on every POST/PUT/PATCH
- [ ] TypeScript interfaces for all entities in `lib/types.ts`
- [ ] Loading skeletons for every new component
- [ ] Toast notifications for every user action
- [ ] Mobile responsive layouts
- [ ] Monochrome theme consistency
