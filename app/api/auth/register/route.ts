// PHASE 8 START: POST /api/auth/register
// Registers a new user and creates a dedicated tenant workspace.

import { type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { buildSessionCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    if (name.trim().length < 2) {
      return Response.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email.trim())) {
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // ── Check for duplicate email ───────────────────────────────────────────────
    const existing = await query("SELECT id FROM users WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ── Role for SaaS user (tenant owner) ───────────────────────────────────────
    const role = "admin";

    // ── Hash password (bcrypt, cost factor 12) ──────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create tenant + user in a transaction ─────────────────────────────────-
    const user = await withTransaction(async (client) => {
      const tenantName = `${name.trim()} Workspace`;
      const tenantResult = await client.query(
        `INSERT INTO tenants (name)
         VALUES ($1)
         RETURNING id, name, created_at, updated_at`,
        [tenantName]
      );

      const tenantId = tenantResult.rows[0].id as number;

      const userResult = await client.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, tenant_id, name, email, role, avatar_url, is_active, last_login, created_at, updated_at`,
        [tenantId, name.trim(), email.trim().toLowerCase(), passwordHash, role]
      );

      return userResult.rows[0];
    });

    // ── Create session ──────────────────────────────────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt.toISOString()]
    );

    // ── Update last_login ───────────────────────────────────────────────────────
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    // ── Audit log ───────────────────────────────────────────────────────────────
    await logAudit({
      action: "create",
      entityType: "user",
      entityId: user.id,
      entityName: user.email,
      details: { role },
      performedBy: user.email,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
      tenantId: user.tenant_id,
    });

    const response = Response.json(
      { user, message: "Registration successful." },
      { status: 201 }
    );
    const headers = new Headers(response.headers);
    headers.set("Set-Cookie", buildSessionCookieHeader(token));

    return new Response(response.body, { status: 201, headers });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/auth/register error:", errMsg, error);
    return Response.json({ error: "Registration failed.", detail: process.env.NODE_ENV !== "production" ? errMsg : undefined }, { status: 500 });
  }
}
// PHASE 8 END: POST /api/auth/register
