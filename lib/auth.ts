// PHASE 8 START: lib/auth.ts — Core authentication and role-enforcement helper
// Used by every API route that requires authentication or role checks.

import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SafeUser, UserRole } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "obsidian_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Session resolution ─────────────────────────────────────────────────────────

/**
 * getSession — reads the session cookie, validates it against the `sessions`
 * table (checking expiry and that the user is still active), and returns
 * a SafeUser object on success or null on failure.
 */
export async function getSession(request: NextRequest): Promise<SafeUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url,
              u.is_active, u.last_login, u.created_at, u.updated_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = $1
          AND s.expires_at > NOW()
          AND u.is_active = true`,
      [token]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as SafeUser;
  } catch (err) {
    console.error("[auth] getSession error:", err);
    return null;
  }
}

// ── Role enforcement ───────────────────────────────────────────────────────────

/** Discriminated union returned by requireRole */
export type AuthResult =
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse };

/**
 * requireRole — enforces authentication + role checks on a request.
 *
 * Usage in a route:
 *   const auth = await requireRole(request, ["admin", "manager"]);
 *   if (!auth.ok) return auth.response;
 *   const { user } = auth;
 */
export async function requireRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<AuthResult> {
  const user = await getSession(request);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }

  if (!roles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Permission denied. Required role: ${roles.join(" or ")}.`,
          yourRole: user.role,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────

/**
 * buildSessionCookieHeader — returns a Set-Cookie header value that
 * sets a secure, HttpOnly session cookie.
 */
export function buildSessionCookieHeader(token: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}${secure}`;
}

/**
 * buildClearCookieHeader — returns a Set-Cookie header value that
 * immediately expires the session cookie.
 */
export function buildClearCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0${secure}`;
}
// PHASE 8 END: lib/auth.ts
