// PHASE 8 START: POST /api/auth/login
// Validates credentials, creates a new session, and sets the session cookie.

import { type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { query, initializeDatabase } from "@/lib/db";
import { buildSessionCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // ── Fetch user ──────────────────────────────────────────────────────────────
    const result = await query(
      `SELECT id, name, email, password_hash, role, avatar_url, is_active,
              last_login, created_at, updated_at
         FROM users
        WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    // Use generic error message to prevent user enumeration attacks
    const INVALID_MSG = "Invalid email or password.";

    if (result.rows.length === 0) {
      return Response.json({ error: INVALID_MSG }, { status: 401 });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return Response.json(
        { error: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // ── Verify password ─────────────────────────────────────────────────────────
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return Response.json({ error: INVALID_MSG }, { status: 401 });
    }

    // ── Invalidate any old sessions for this user (optional: single-session policy) ─
    // Keeping old sessions valid for multi-device support. Remove line below to enforce single session.

    // ── Create session ──────────────────────────────────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt.toISOString()]
    );

    // ── Update last_login ───────────────────────────────────────────────────────
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    // ── Build safe response (exclude password_hash) ─────────────────────────────
    const { password_hash: _removed, ...safeUser } = user;

    const response = Response.json({ user: safeUser, message: "Login successful." });
    const headers = new Headers(response.headers);
    headers.set("Set-Cookie", buildSessionCookieHeader(token));

    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return Response.json({ error: "Login failed." }, { status: 500 });
  }
}
// PHASE 8 END: POST /api/auth/login
