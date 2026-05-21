BEGIN;

-- Tenants table
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure updated_at is maintained
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Seed a default tenant for existing data
INSERT INTO tenants (name)
SELECT 'Default Workspace'
WHERE NOT EXISTS (
  SELECT 1 FROM tenants WHERE name = 'Default Workspace'
);

-- Add tenant_id columns (nullable for backfill)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE product_suppliers ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Backfill existing rows to the default tenant
UPDATE users
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE products
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE suppliers
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE product_suppliers
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE purchase_orders
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE purchase_order_items
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE stock_movements
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE product_images
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

UPDATE audit_log
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Workspace' LIMIT 1)
  WHERE tenant_id IS NULL;

-- Enforce tenant_id and add foreign keys
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE product_suppliers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_order_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE stock_movements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE product_images ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_log ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE products
  ADD CONSTRAINT products_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE product_suppliers
  ADD CONSTRAINT product_suppliers_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE purchase_order_items
  ADD CONSTRAINT purchase_order_items_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE product_images
  ADD CONSTRAINT product_images_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Indexes for tenant lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_tenant_id ON product_suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_tenant_id ON purchase_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_images_tenant_id ON product_images(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);

COMMIT;
