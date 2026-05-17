// POST /api/seed-all — Pakistani demo data seeder
// Populates: suppliers, products (Pakistani), product_suppliers, stock_movements, users, audit_log
// Safe: checks existing counts, skips if already seeded, preserves FK order

import { NextResponse } from "next/server";
import { query, initializeDatabase } from "@/lib/db";
// PHASE 8 START: use bcryptjs for proper password hashing in seed
import bcrypt from "bcryptjs";
// PHASE 8 END

export async function POST() {
  try {
    await initializeDatabase();

    const results: Record<string, number> = {};

    // ── 1. USERS ─────────────────────────────────────────────────────────────
    // PHASE 8 START: proper bcrypt hashing for demo users
    const DEMO_PASSWORD = "Pakistan@2024!";
    const PLACEHOLDER_HASH = "$2b$10$rJ8K2mN4pQwXvY3hL9oZAOqE5tF1gH7iM6nS0kV2bW8cD4eR3uA6y";

    const userCount = parseInt((await query("SELECT COUNT(*) FROM users")).rows[0].count);
    if (userCount === 0) {
      // Compute a real bcrypt hash now that bcryptjs is available
      const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const users = [
        ["Usman Tariq",     "admin@obsidian.pk",   hash, "admin",   true],
        ["Ayesha Siddiqui", "manager@obsidian.pk", hash, "manager", true],
        ["Hamza Butt",      "hamza@obsidian.pk",   hash, "viewer",  true],
        ["Zara Malik",      "zara@obsidian.pk",    hash, "viewer",  true],
      ];
      for (const u of users) {
        await query(
          `INSERT INTO users (name, email, password_hash, role, is_active)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
          u
        );
      }
      results.users = users.length;
    } else {
      // PHASE 8: Fix existing seeded users that still have the placeholder hash
      // by re-hashing them with a valid bcrypt hash so login works.
      const stale = await query(
        `SELECT id FROM users WHERE password_hash = $1`,
        [PLACEHOLDER_HASH]
      );
      if (stale.rows.length > 0) {
        const realHash = await bcrypt.hash(DEMO_PASSWORD, 10);
        await query(
          `UPDATE users SET password_hash = $1 WHERE password_hash = $2`,
          [realHash, PLACEHOLDER_HASH]
        );
        results.fixedUserHashes = stale.rows.length;
      }
    }
    // PHASE 8 END: user seeding

    // ── 2. SUPPLIERS ─────────────────────────────────────────────────────────
    const supCount = parseInt((await query("SELECT COUNT(*) FROM suppliers")).rows[0].count);
    if (supCount === 0) {
      const suppliers = [
        ["Hafeez Electronics Lahore",   "hafeez@hafeezelectronics.pk",  "+92-42-3571-8800", "Hafeez Centre, Lahore, Punjab",           "https://hafeezelectronics.pk",  "Muhammad Hafeez",  4.7, "active",   "Largest electronics market in Lahore. Stocks mobiles, laptops, accessories."],
        ["Al-Fatah General Store",      "orders@alfatah.com.pk",         "+92-42-3588-1100", "Main Boulevard, Gulberg III, Lahore",      "https://alfatah.com.pk",        "Tariq Mehmood",    4.5, "active",   "Premium retail chain across Pakistan. Groceries, household, clothing."],
        ["Karachi Tech Traders",        "info@kttkarachi.pk",            "+92-21-3246-7890", "Saddar, Karachi, Sindh",                  null,                            "Imran Qureshi",    4.3, "active",   "Wholesale electronics and computer peripherals."],
        ["Gul Ahmed Textile Mills",     "b2b@gulahmed.com",              "+92-21-3241-9000", "Landhi Industrial Area, Karachi",          "https://gulahmed.com",          "Sohail Gul",       4.8, "active",   "Premium textile manufacturer. Bed linen, dress materials, lawn."],
        ["Punjab Sports Industries",    "export@sialkotports.pk",        "+92-52-3260-4000", "Sialkot Export Processing Zone, Punjab",   "https://sialkotports.pk",       "Raza Ul Haq",      4.6, "active",   "ISO certified sports goods manufacturer. FIFA approved footballs."],
        ["Interwood Furniture",         "sales@interwood.pk",            "+92-42-3589-7700", "Multan Road, Lahore",                     "https://interwood.pk",          "Asif Joiya",       4.9, "active",   "Premium modular furniture. Offices and residential fit-outs."],
        ["National Foods Limited",      "trade@nationalfoods.com.pk",    "+92-21-3493-4500", "SITE Industrial Area, Karachi",            "https://nationalfoods.com.pk",  "Abrar Hasan",      4.5, "active",   "Packaged foods — spices, sauces, ready meals."],
        ["Dawlance Appliances",         "dealers@dawlance.com",          "+92-21-3240-8100", "Hub, Balochistan",                        "https://dawlance.com",          "Syed Tariq",       4.6, "active",   "Pakistan largest home appliance brand. Fridges, microwaves, ACs."],
        ["Shan Foods Pvt Ltd",          "supply@shanfoods.com",          "+92-21-3490-2000", "Korangi Industrial Area, Karachi",         "https://shanfoods.com",         "Ahmed Ali",        4.4, "active",   "Spice blends and recipe masalas. Exported to 65+ countries."],
        ["Leisure Club Apparel",        "wholesale@leisureclub.pk",      "+92-42-3571-2200", "Ferozepur Road, Lahore",                  "https://leisureclub.pk",        "Nabeel Sheikh",    4.3, "active",   "Ready-to-wear fashion brand. Men and women clothing."],
        ["Diamond Paints",             "dealers@diamondpaints.com.pk",  "+92-42-3576-5000", "Sundar Industrial Estate, Lahore",        "https://diamondpaints.com.pk",  "Khalid Bashir",    4.1, "active",   "Paint and coating solutions for residential and industrial."],
        ["Master Changan Motors",       "fleet@masterchangan.com.pk",    "+92-51-8446-111",  "I-9 Industrial Area, Islamabad",           "https://masterchangan.com.pk",  "Shahbaz Butt",     3.9, "inactive", "Automotive parts and accessories wholesale."],
      ];
      for (const s of suppliers) {
        await query(
          `INSERT INTO suppliers (name, email, phone, address, website, contact_person, rating, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          s
        );
      }
      results.suppliers = suppliers.length;
    }

    // ── 3. PRODUCTS ──────────────────────────────────────────────────────────
    // Always attempt — ON CONFLICT DO NOTHING on SKU means no duplicates
    // This allows Pakistani products to coexist with existing Western seed data
    {
      const products = [
        // Electronics
        ["Samsung Galaxy S24 Ultra",        "6.8\" Dynamic AMOLED 2X, 200MP camera, 12GB RAM, Snapdragon 8 Gen 3. Official Samsung Pakistan.",                                                    299999, "Electronics",  45,  "Samsung",        4.7, "PKR-SAM-S24U-001", "active",  15, 5 ],
        ["iPhone 15 Pro Max",               "A17 Pro chip, 48MP triple camera, titanium design, USB-C, 6.7\" Super Retina XDR. PTA approved.",                                                    429999, "Electronics",  28,  "Apple",          4.8, "PKR-APL-15PM-002", "active",  10, 3 ],
        ["Haier 1.5 Ton Inverter AC",       "Energy-saving inverter AC, turbo cool, Wi-Fi enabled, low voltage startup. 5 star energy rating.",                                                     89999, "Electronics", 120,  "Haier",          4.5, "PKR-HAI-AC15-003", "active",  30, 10],
        ["Dawlance 20 CFT Refrigerator",    "Glass door double door fridge, Inverter compressor, 10-year warranty. Best seller in Pakistan.",                                                        79999, "Electronics",  60,  "Dawlance",       4.6, "PKR-DAW-REF20-004","active",  20, 5 ],
        ["Lenovo IdeaPad Slim 5",           "Intel Core i7-13th Gen, 16GB DDR5, 512GB NVMe SSD, 15.6\" FHD IPS, backlit KB. Islamabad imports.",                                                  149999, "Electronics",  35,  "Lenovo",         4.4, "PKR-LNV-IPS5-005", "active",  10, 3 ],
        ["Audionic Mehfil Speaker",         "10000 mAh battery, 60W output, karaoke mic support, RGB lights. Made for Pakistani dholak gatherings.",                                                14999, "Electronics", 200,  "Audionic",       4.3, "PKR-AUD-MHF-006",  "active",  50, 20],
        ["QMobile I10 Pro",                 "6.6\" HD+ display, 5000mAh battery, 64GB storage, dual SIM, 4G LTE. Affordable Pakistani brand.",                                                     18999, "Electronics",  90,  "QMobile",        3.9, "PKR-QMB-I10-007",  "active",  25, 10],
        // Clothing & Textiles
        ["Gul Ahmed Lawn 3-Piece",          "Premium embroidered lawn fabric — shirt, trouser, dupatta. Summer collection, machine washable.",                                                       4500, "Clothing",    300,  "Gul Ahmed",      4.7, "PKR-GUL-LWN-008",  "active",  80, 30],
        ["Leisure Club Panjabi",            "Slub khaddar panjabi, classic white with embroidered collar. Festive & everyday wear.",                                                                 3200, "Clothing",    250,  "Leisure Club",   4.4, "PKR-LC-PNJ-009",   "active",  60, 20],
        ["Junaid Jamshed Kurta",            "J. Kurta — pure cotton, block print design. Perfect for Eid and casual occasions.",                                                                     4800, "Clothing",    180,  "J. Junaid Jamshed", 4.5, "PKR-JJ-KRT-010", "active",  50, 15],
        ["Bata Insignia Shoes",             "Formal leather shoes, anti-slip sole, cushioned insoles. Sizes 39–46. Classic black.",                                                                  7500, "Clothing",    150,  "Bata",           4.3, "PKR-BAT-INS-011",  "active",  40, 10],
        ["Sapphire Khaddar Suit",           "Winter 3-piece khaddar suit with shawl. Vibrant printed collection. Sizes XS–XXL.",                                                                    5500, "Clothing",    160,  "Sapphire",       4.6, "PKR-SAP-KHD-012",  "active",  45, 15],
        // Home & Kitchen
        ["National Pressure Cooker 7L",    "Heavy-gauge aluminum, safety valve, bakelite handles. Best for desi cooking — daal, biryani.",                                                          2800, "Home",        400,  "National",       4.5, "PKR-NAT-PC7-013",  "active", 100, 30],
        ["Anex Blender AG-6022",            "700W motor, 3 speed settings, stainless steel blades, 1.5L jar. Chutney, lassi, smoothies.",                                                           3500, "Home",        320,  "Anex",           4.2, "PKR-ANX-BL22-014", "active",  80, 25],
        ["Interwood 6-Seater Dining Set",  "Solid wood dining table with 6 cushioned chairs. Contemporary design, scratch-resistant finish.",                                                       85000, "Furniture",    15,  "Interwood",      4.9, "PKR-INT-DIN6-015", "active",   5,  2],
        ["Crown Micro Inverter UPS",        "1000VA online UPS, supports 2–3 hour backup, auto voltage regulation. Ideal for loadshedding.",                                                        18500, "Electronics",  80,  "Crown Micro",    4.4, "PKR-CRW-UPS1-016", "active",  20,  8],
        // Food & Grocery
        ["Shan Biryani Masala 60g",         "Authentic Sindhi Biryani spice blend. No artificial colours. Pack of 24 sachets.",                                                                       850, "Food",       1200,  "Shan Foods",     4.8, "PKR-SHA-BRY-017",  "active", 300, 100],
        ["National Mango Pickle 1kg",       "Classic aam ka achar — mustard oil, whole spices. Traditional family recipe since 1970.",                                                                650, "Food",        900,  "National Foods", 4.6, "PKR-NAT-PCK-018",  "active", 200,  80],
        ["Tapal Danedar Tea 900g",          "Strong CTC black tea leaves. Perfect for doodh patti. Pakistan's #1 selling tea brand.",                                                                1100, "Food",        800,  "Tapal",          4.7, "PKR-TAP-TEA-019",  "active", 200,  80],
        ["Olper's UHT Milk 1L (Pack of 6)","Full-cream UHT milk. 6x1L pack. Engro Foods. Consistent quality for chai, cooking, shakes.",                                                            750, "Food",        500,  "Olpers",         4.5, "PKR-OLP-MLK-020",  "active", 120,  50],
        // Sports
        ["Forward Sports Football No.5",    "FIFA-quality match football. Hand-stitched. Sialkot manufactured, exported to 120+ countries.",                                                         3500, "Sports",      600,  "Forward Sports", 4.8, "PKR-FWD-FB5-021",  "active", 150,  50],
        ["Grays Hockey Stick",              "Fibreglass hockey stick, composite toe. Used by Pakistan national team training setup.",                                                                 6500, "Sports",      180,  "Grays",          4.6, "PKR-GRY-HCK-022",  "active",  40,  15],
        ["Servis Running Shoes",            "Lightweight mesh runners, EVA foam sole, anti-odour lining. Pakistani-made for local terrain.",                                                          4200, "Sports",      350,  "Servis",         4.2, "PKR-SRV-RUN-023",  "active",  90,  30],
        // Books
        ["Urdu Digest Monthly Bundle",      "12-month bundle of the most-read Urdu fiction digest in Pakistan. Short stories, poetry.",                                                              2400, "Books",       200,  "Urdu Digest",    4.5, "PKR-URD-DGT-024",  "active",  50,  20],
        ["O-Level Pakistan Studies Gde",    "Comprehensive guide for Cambridge O-Level Pakistan Studies — Maps, MCQs, essays, past papers.",                                                          1800, "Books",       500,  "Oxford Press PK",4.7, "PKR-OXF-PK-025",   "active", 120,  40],
        // Beauty
        ["Ponds BB Cream SPF30",            "5-in-1 BB cream — moisturizer, sunscreen, primer, concealer, anti-ageing. 30ml. Popular in Lahore.",                                                   1200, "Beauty",      700,  "Ponds",          4.4, "PKR-PON-BB-026",   "active", 175,  60],
        ["Hemani Argan Hair Oil 200ml",     "Pure argan oil blend with keratin. Frizz control, shine boost. Halal-certified.",                                                                        950, "Beauty",      500,  "Hemani",         4.3, "PKR-HEM-ARG-027",  "active", 120,  40],
        // Automotive
        ["Suzuki Alto Engine Oil Filter",  "Compatible with Suzuki Alto, Mehran, Wagon R. OEM quality. Buy 4 get 1 free bulk pack.",                                                                 650, "Automotive",  800,  "Suzuki OEM",     4.5, "PKR-SUZ-OFL-028",  "active", 200,  80],
        ["12V LED Car Interior Lights",     "USB-powered RGB strip lights, 2m. Fits all Pakistani car models. Plug-and-play setup.",                                                                  850, "Automotive", 1200,  "Local Brand",    4.0, "PKR-RGB-CAR-029",  "active", 300, 100],
        // Toys
        ["Ludo Board Game (Urdu Edition)", "Classic ludo with Urdu numbering. 4-player, wooden board, premium dice. Family nights in Pakistan.",                                                      1200, "Toys",        600,  "Local Games",    4.6, "PKR-LDO-BRD-030",  "active", 150,  50],
      ];
      // Use WHERE NOT EXISTS to avoid needing a unique constraint on sku
      let inserted = 0;
      for (const p of products) {
        const r = await query(
          `INSERT INTO products (name, description, price, category, stock, brand, rating, sku, status, reorder_point, reorder_qty)
           SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
           WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = $8::varchar)`,
          p
        );
        inserted += r.rowCount ?? 0;
      }
      results.products = inserted;
    }

    // ── 4. PRODUCT–SUPPLIER LINKS ─────────────────────────────────────────────
    const psCount = parseInt((await query("SELECT COUNT(*) FROM product_suppliers")).rows[0].count);
    if (psCount === 0) {
      // Get supplier IDs by name
      const supRows = (await query("SELECT id, name FROM suppliers ORDER BY id")).rows;
      const sId = (name: string) => supRows.find(r => r.name === name)?.id;

      // Get product IDs by SKU
      const prodRows = (await query("SELECT id, sku FROM products ORDER BY id")).rows;
      const pId = (sku: string) => prodRows.find(r => r.sku === sku)?.id;

      // [product_sku, supplier_name, cost_price, lead_days, is_primary, min_order_qty]
      const links: [string, string, number, number, boolean, number][] = [
        ["PKR-SAM-S24U-001", "Karachi Tech Traders",          220000, 7,  true,  2],
        ["PKR-APL-15PM-002", "Karachi Tech Traders",          320000, 10, true,  1],
        ["PKR-HAI-AC15-003", "Hafeez Electronics Lahore",      65000, 14, true,  3],
        ["PKR-DAW-REF20-004","Dawlance Appliances",            58000, 10, true,  2],
        ["PKR-DAW-REF20-004","Hafeez Electronics Lahore",      62000, 7,  false, 2],
        ["PKR-LNV-IPS5-005", "Karachi Tech Traders",          110000, 12, true,  1],
        ["PKR-AUD-MHF-006",  "Hafeez Electronics Lahore",      10500, 5,  true,  10],
        ["PKR-QMB-I10-007",  "Hafeez Electronics Lahore",      13500, 5,  true,  5],
        ["PKR-GUL-LWN-008",  "Gul Ahmed Textile Mills",         2800, 14, true,  50],
        ["PKR-LC-PNJ-009",   "Leisure Club Apparel",            2000, 10, true,  30],
        ["PKR-JJ-KRT-010",   "Leisure Club Apparel",            3000, 10, true,  20],
        ["PKR-BAT-INS-011",  "Al-Fatah General Store",          4800, 7,  true,  20],
        ["PKR-SAP-KHD-012",  "Gul Ahmed Textile Mills",         3500, 12, true,  25],
        ["PKR-NAT-PC7-013",  "Al-Fatah General Store",          1800, 5,  true,  50],
        ["PKR-ANX-BL22-014", "Al-Fatah General Store",          2200, 5,  true,  40],
        ["PKR-INT-DIN6-015", "Interwood Furniture",            60000, 21, true,   2],
        ["PKR-CRW-UPS1-016", "Hafeez Electronics Lahore",      13000, 7,  true,  5],
        ["PKR-SHA-BRY-017",  "Shan Foods Pvt Ltd",               450, 3,  true, 200],
        ["PKR-SHA-BRY-017",  "Al-Fatah General Store",           500, 4,  false,100],
        ["PKR-NAT-PCK-018",  "National Foods Limited",           380, 3,  true, 150],
        ["PKR-TAP-TEA-019",  "Al-Fatah General Store",           720, 4,  true, 150],
        ["PKR-OLP-MLK-020",  "National Foods Limited",           500, 3,  true, 100],
        ["PKR-FWD-FB5-021",  "Punjab Sports Industries",        2200, 10, true,  50],
        ["PKR-GRY-HCK-022",  "Punjab Sports Industries",        4500, 14, true,  20],
        ["PKR-SRV-RUN-023",  "Al-Fatah General Store",          2800, 7,  true,  30],
        ["PKR-URD-DGT-024",  "Al-Fatah General Store",          1500, 5,  true,  30],
        ["PKR-OXF-PK-025",   "Al-Fatah General Store",          1200, 5,  true,  50],
        ["PKR-PON-BB-026",   "Al-Fatah General Store",           780, 4,  true,  80],
        ["PKR-HEM-ARG-027",  "Al-Fatah General Store",           600, 4,  true,  60],
        ["PKR-SUZ-OFL-028",  "Master Changan Motors",            400, 7,  true, 100],
        ["PKR-RGB-CAR-029",  "Karachi Tech Traders",             500, 5,  true, 150],
        ["PKR-LDO-BRD-030",  "Al-Fatah General Store",           800, 5,  true,  80],
      ];

      let linked = 0;
      for (const [sku, supName, cost, lead, primary, moq] of links) {
        const pid = pId(sku);
        const sid = sId(supName);
        if (!pid || !sid) continue;
        await query(
          `INSERT INTO product_suppliers (product_id, supplier_id, cost_price, lead_days, is_primary, min_order_qty)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (product_id, supplier_id) DO NOTHING`,
          [pid, sid, cost, lead, primary, moq]
        );
        linked++;
      }
      results.product_suppliers = linked;
    }

    // ── 5. STOCK MOVEMENTS ────────────────────────────────────────────────────
    const smCount = parseInt((await query("SELECT COUNT(*) FROM stock_movements")).rows[0].count);
    if (smCount === 0) {
      const prodRows = (await query("SELECT id, stock FROM products ORDER BY id")).rows;

      // Generate realistic historical movements per product
      let smCount2 = 0;

      for (const prod of prodRows.slice(0, 20)) {
        // 3 movements per product, going back in time
        const movements = [
          { delta: prod.stock + 30, reason: "purchase",   note: "Initial stock received from supplier", daysAgo: 45 },
          { delta: -20,             reason: "sale",        note: "Sold to retail customer",              daysAgo: 20 },
          { delta: 5,               reason: "return",      note: "Customer return — resellable",         daysAgo: 5  },
        ];
        let runningStock = prod.stock;
        for (const mv of movements.reverse()) {
          runningStock = runningStock - mv.delta; // walk backwards
        }
        runningStock = Math.max(0, runningStock);

        for (const mv of movements) {
          runningStock += mv.delta;
          const ts = new Date(Date.now() - mv.daysAgo * 86400000 + Math.random() * 3600000).toISOString();
          await query(
            `INSERT INTO stock_movements (product_id, delta, reason, note, stock_after, created_at)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [prod.id, mv.delta, mv.reason, mv.note, Math.max(0, runningStock), ts]
          );
          smCount2++;
        }
      }
      results.stock_movements = smCount2;
    }

    // ── 6. AUDIT LOG ──────────────────────────────────────────────────────────
    const auditCount = parseInt((await query("SELECT COUNT(*) FROM audit_log")).rows[0].count);
    if (auditCount === 0) {
      const audits = [
        ["create",       "supplier", 1, "Hafeez Electronics Lahore", '{"note":"Initial onboarding"}',          "admin@obsidian.pk",  "192.168.1.10"],
        ["create",       "supplier", 2, "Al-Fatah General Store",    '{"note":"Initial onboarding"}',          "admin@obsidian.pk",  "192.168.1.10"],
        ["update",       "supplier", 3, "Karachi Tech Traders",      '{"field":"rating","old":4.1,"new":4.3}', "manager@obsidian.pk","192.168.1.11"],
        ["create",       "product",  1, "Samsung Galaxy S24 Ultra",  '{"stock":45}',                           "admin@obsidian.pk",  "192.168.1.10"],
        ["stock_adjust", "product",  7, "QMobile I10 Pro",           '{"delta":10,"reason":"purchase"}',       "manager@obsidian.pk","192.168.1.11"],
        ["bulk_update",  "product", null, null,                      '{"count":5,"field":"status"}',           "admin@obsidian.pk",  "192.168.1.10"],
      ];
      for (const a of audits) {
        await query(
          `INSERT INTO audit_log (action, entity_type, entity_id, entity_name, details, performed_by, ip_address, created_at)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7, NOW() - (random()*30 || ' days')::interval)`,
          a
        );
      }
      results.audit_log = audits.length;
    }

    return NextResponse.json({
      message: "Pakistan demo data seeded successfully ✓",
      seeded: results,
      credentials: {
        admin:   { email: "admin@obsidian.pk",   note: "password: Pakistan@2024!" },
        manager: { email: "manager@obsidian.pk", note: "password: Pakistan@2024!" },
      },
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/seed-all error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET — returns current table counts for inspection
export async function GET() {
  try {
    await initializeDatabase();
    const tables = ["products","suppliers","product_suppliers","stock_movements","users","audit_log","purchase_orders"];
    const counts: Record<string, number> = {};
    for (const t of tables) {
      counts[t] = parseInt((await query(`SELECT COUNT(*) FROM ${t}`)).rows[0].count);
    }
    return NextResponse.json({ counts });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
