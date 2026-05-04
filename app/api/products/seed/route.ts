import { query, initializeDatabase } from "@/lib/db";

// POST /api/products/seed - seed database with sample products
export async function POST() {
  try {
    await initializeDatabase();

    // Check if products already exist
    const existing = await query("SELECT COUNT(*) as count FROM products");
    if (parseInt(existing.rows[0].count) > 0) {
      return Response.json({
        message: "Database already has products. Skipping seed.",
        count: parseInt(existing.rows[0].count),
      });
    }

    const sampleProducts = [
      { name: "MacBook Pro 16\"", description: "Apple M3 Pro chip, 18GB RAM, 512GB SSD. The ultimate laptop for developers and creatives.", price: 2499.99, category: "Electronics", stock: 45, brand: "Apple", rating: 4.8, sku: "APL-MBP16-001", image_url: "", status: "active" },
      { name: "Sony WH-1000XM5", description: "Industry-leading noise canceling headphones with exceptional sound quality.", price: 349.99, category: "Electronics", stock: 120, brand: "Sony", rating: 4.7, sku: "SNY-WH5-002", image_url: "", status: "active" },
      { name: "Herman Miller Aeron Chair", description: "Iconic ergonomic office chair with PostureFit SL back support. Size B.", price: 1395.00, category: "Furniture", stock: 15, brand: "Herman Miller", rating: 4.9, sku: "HM-AERON-003", image_url: "", status: "active" },
      { name: "Samsung 4K OLED Monitor 32\"", description: "ViewFinity S9 32\" 5K monitor with Thunderbolt 4, matte display technology.", price: 1299.99, category: "Electronics", stock: 30, brand: "Samsung", rating: 4.6, sku: "SAM-S9-004", image_url: "", status: "active" },
      { name: "Lululemon Yoga Mat", description: "The Reversible Mat 5mm. Antimicrobial additive helps prevent mold and mildew.", price: 88.00, category: "Sports", stock: 200, brand: "Lululemon", rating: 4.5, sku: "LUL-YM-005", image_url: "", status: "active" },
      { name: "Dyson V15 Detect", description: "Cordless vacuum with laser technology that reveals microscopic dust particles.", price: 749.99, category: "Home", stock: 55, brand: "Dyson", rating: 4.7, sku: "DYS-V15-006", image_url: "", status: "active" },
      { name: "Nike Air Max 90", description: "Classic silhouette with visible Air cushioning. Built for style and comfort.", price: 130.00, category: "Clothing", stock: 180, brand: "Nike", rating: 4.4, sku: "NIK-AM90-007", image_url: "", status: "active" },
      { name: "iPad Pro 12.9\"", description: "M2 chip, Liquid Retina XDR display, perfect for creative professionals.", price: 1099.00, category: "Electronics", stock: 60, brand: "Apple", rating: 4.8, sku: "APL-IPAD-008", image_url: "", status: "active" },
      { name: "Bose SoundLink Flex", description: "Portable Bluetooth speaker with deep, clear sound for outdoor adventures.", price: 149.00, category: "Electronics", stock: 95, brand: "Bose", rating: 4.5, sku: "BSE-SLF-009", image_url: "", status: "active" },
      { name: "Patagonia Better Sweater", description: "Men's fleece jacket made with 100% recycled polyester. Fair Trade Certified.", price: 139.00, category: "Clothing", stock: 75, brand: "Patagonia", rating: 4.6, sku: "PAT-BS-010", image_url: "", status: "active" },
      { name: "Vitamix A3500", description: "Professional-grade blender with touchscreen controls and 5 program settings.", price: 649.95, category: "Home", stock: 25, brand: "Vitamix", rating: 4.8, sku: "VTX-A35-011", image_url: "", status: "active" },
      { name: "Kindle Paperwhite", description: "6.8\" display with adjustable warm light, 16GB storage, waterproof design.", price: 139.99, category: "Electronics", stock: 150, brand: "Amazon", rating: 4.6, sku: "AMZ-KPW-012", image_url: "", status: "active" },
      { name: "IKEA KALLAX Shelf", description: "Versatile shelving unit, 4x4 configuration. Perfect for books and decor.", price: 189.00, category: "Furniture", stock: 40, brand: "IKEA", rating: 4.3, sku: "IKA-KLX-013", image_url: "", status: "active" },
      { name: "Adidas Ultraboost 23", description: "Running shoes with BOOST midsole technology for incredible energy return.", price: 190.00, category: "Sports", stock: 110, brand: "Adidas", rating: 4.5, sku: "ADD-UB23-014", image_url: "", status: "active" },
      { name: "Le Creuset Dutch Oven", description: "5.5 qt round Dutch oven in Flame color. Cast iron with enamel coating.", price: 379.95, category: "Home", stock: 35, brand: "Le Creuset", rating: 4.9, sku: "LCR-DO-015", image_url: "", status: "active" },
      { name: "Sony PlayStation 5", description: "Next-gen gaming console with 825GB SSD, 4K gaming, and DualSense controller.", price: 499.99, category: "Electronics", stock: 8, brand: "Sony", rating: 4.7, sku: "SNY-PS5-016", image_url: "", status: "active" },
      { name: "Allbirds Tree Runners", description: "Eco-friendly running shoes made from eucalyptus tree fiber. Lightweight and breathable.", price: 98.00, category: "Clothing", stock: 130, brand: "Allbirds", rating: 4.4, sku: "ALB-TR-017", image_url: "", status: "active" },
      { name: "Yeti Rambler 30oz", description: "Vacuum-insulated tumbler keeps drinks cold or hot for hours. DuraCoat finish.", price: 38.00, category: "Home", stock: 300, brand: "Yeti", rating: 4.7, sku: "YTI-R30-018", image_url: "", status: "active" },
      { name: "Organic Protein Powder", description: "Plant-based protein powder, 24g protein per serving. Vanilla flavor.", price: 44.99, category: "Food", stock: 0, brand: "Garden of Life", rating: 4.3, sku: "GOL-PP-019", image_url: "", status: "draft" },
      { name: "Secretlab Titan Evo", description: "Premium gaming chair with 4-way L-ADAPT lumbar support. Magnetic memory foam head pillow.", price: 519.00, category: "Furniture", stock: 20, brand: "Secretlab", rating: 4.7, sku: "SCR-TE-020", image_url: "", status: "active" },
    ];

    for (const product of sampleProducts) {
      await query(
        `INSERT INTO products (name, description, price, category, stock, brand, rating, sku, image_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          product.name,
          product.description,
          product.price,
          product.category,
          product.stock,
          product.brand,
          product.rating,
          product.sku,
          product.image_url,
          product.status,
        ]
      );
    }

    return Response.json({
      message: "Database seeded successfully",
      count: sampleProducts.length,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products/seed error:", error);
    return Response.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
