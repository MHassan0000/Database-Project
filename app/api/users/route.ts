// PHASE 8 START: /api/users — user listing and admin user creation
// GET /api/users — Admin only: returns paginated list of all users
// POST /api/users — Admin only: creates a new user with a specified role

import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/users — list all users (admin only)
export async function GET(request: NextRequest) {

  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const sp = request.nextUrl.searchParams;
    const page  = Math.max(1, parseInt(sp.get("page")  || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT id, tenant_id, name, email, role, avatar_url, is_active, last_login, created_at, updated_at
           FROM users
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [auth.user.tenant_id, limit, offset]
      ),
      query("SELECT COUNT(*) AS total FROM users WHERE tenant_id = $1", [auth.user.tenant_id]),
    ]);

    const total = parseInt(countResult.rows[0].total);

    return Response.json({
      users: usersResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return Response.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

// POST /api/users — admin creates a user directly (no session cookie returned)
export async function POST(request: NextRequest) {

  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, email, password, role = "viewer" } = body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email.trim())) {
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const validRoles = ["admin", "manager", "viewer"];
    if (!validRoles.includes(role)) {
      return Response.json(
        { error: "Role must be admin, manager, or viewer." },
        { status: 400 }
      );
    }

    // ── Duplicate check ─────────────────────────────────────────────────────────
    const existing = await query("SELECT id FROM users WHERE tenant_id = $1 AND email = $2", [
      auth.user.tenant_id,
      email.trim().toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, name, email, role, avatar_url, is_active, last_login, created_at, updated_at`,
      [auth.user.tenant_id, name.trim(), email.trim().toLowerCase(), passwordHash, role]
    );
    const newUser = result.rows[0];

    await logAudit({
      action: "create",
      entityType: "user",
      entityId: newUser.id,
      entityName: newUser.email,
      details: { role, createdBy: auth.user.email },
      performedBy: auth.user.email,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
      tenantId: auth.user.tenant_id,
    });

    return Response.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return Response.json({ error: "Failed to create user." }, { status: 500 });
  }
}
// PHASE 8 END: /api/users
