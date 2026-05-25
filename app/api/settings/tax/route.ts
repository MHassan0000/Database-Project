import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const SETTINGS_KEY = "tax_rate";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;
  try {
    const result = await query(
      "SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = $2",
      [auth.user.tenant_id, SETTINGS_KEY]
    );
    const value = result.rows[0]?.value;
    return NextResponse.json({ tax_rate: value != null ? Number(value) : 0 });
  } catch (error) {
    console.error("GET /api/settings/tax error:", error);
    return NextResponse.json(
      { error: "Failed to load tax settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "manager"]);
  if (!auth.ok) return auth.response;
  try {
    let body: { tax_rate?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const taxRate = Number(body.tax_rate);
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return NextResponse.json(
        { error: "Tax rate must be between 0 and 100" },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO tenant_settings (tenant_id, key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, key)
       DO UPDATE SET value = EXCLUDED.value`,
      [auth.user.tenant_id, SETTINGS_KEY, taxRate]
    );

    return NextResponse.json({ tax_rate: taxRate });
  } catch (error) {
    console.error("PUT /api/settings/tax error:", error);
    return NextResponse.json(
      { error: "Failed to update tax settings" },
      { status: 500 }
    );
  }
}
