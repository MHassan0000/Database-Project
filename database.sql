-- Database Initialization & Schema Definition

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    category VARCHAR(100),
    stock INTEGER NOT NULL DEFAULT 0,
    brand VARCHAR(100),
    rating FLOAT DEFAULT 0,
    image_url TEXT,
    sku VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason VARCHAR(60) NOT NULL DEFAULT 'adjustment',
    note TEXT,
    stock_after INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Core CRUD Operations

-- CREATE: Insert a new product
INSERT INTO products (name, description, price, category, stock, brand, rating, sku, image_url)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- READ: Retrieve products (with filtering/search/pagination logic)
SELECT * FROM products 
WHERE 
    category = 'Electronics' 
    AND price >= 0 AND price <= 1000 
    AND rating >= 4.0 
    AND (name ILIKE '%search%' OR description ILIKE '%search%' OR brand ILIKE '%search%')
ORDER BY created_at DESC 
LIMIT 12 OFFSET 0;

-- READ: Retrieve products by status
SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC;

-- READ: Count products for pagination
SELECT COUNT(*) FROM products;

-- READ: Retrieve single product by ID
SELECT * FROM products WHERE id = $1;

-- UPDATE: Modify an existing product
UPDATE products 
SET 
    name = $1, description = $2, price = $3, category = $4, 
    stock = $5, brand = $6, rating = $7, sku = $8, image_url = $9, status = $10
WHERE id = $11 
RETURNING *;

-- DELETE: Remove a product
DELETE FROM products WHERE id = $1 RETURNING *;


-- Reporting & Analytics Queries

-- Get Total Inventory Value
SELECT SUM(price * stock) FROM products;

-- Get Average Product Price & Rating
SELECT AVG(price), AVG(rating) FROM products;

-- Get Low Stock Alerts thresholds
SELECT COUNT(*) FROM products WHERE stock < 10 AND stock > 0;
SELECT COUNT(*) FROM products WHERE stock = 0;

-- Products count by category
SELECT category, COUNT(*) as count 
FROM products 
GROUP BY category 
ORDER BY count DESC;

-- Top 5 brands by inventory count
SELECT brand, COUNT(*) as count 
FROM products 
WHERE brand IS NOT NULL 
GROUP BY brand 
ORDER BY count DESC 
LIMIT 5;

-- Top 5 Highest Rated Products 
SELECT * FROM products ORDER BY rating DESC LIMIT 5;

-- 5 Most Recently Added Products
SELECT * FROM products ORDER BY created_at DESC LIMIT 5;

-- List unique categories for Filter dropdown
SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category;

-- Status distribution
SELECT status, COUNT(*) as count FROM products GROUP BY status;

-- Stock movement ledger
SELECT sm.*, p.name, p.sku, p.brand, p.category, p.status
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
ORDER BY sm.created_at DESC
LIMIT 50;
