// PHASE 8 START: POST /api/auth/logout
// Deletes the current session from the database and clears the session cookie.

import { type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { SESSION_COOKIE, buildClearCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {

    const token = request.cookies.get(SESSION_COOKIE)?.value;

    // Delete session from DB (if token exists); no error if already gone
    if (token) {
      await query("DELETE FROM sessions WHERE token = $1", [token]);
    }

    const response = Response.json({ message: "Logged out successfully." });
    const headers = new Headers(response.headers);
    headers.set("Set-Cookie", buildClearCookieHeader());

    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    // Even on error, clear the cookie client-side
    const response = Response.json({ error: "Logout failed." }, { status: 500 });
    const headers = new Headers(response.headers);
    headers.set("Set-Cookie", buildClearCookieHeader());
    return new Response(response.body, { status: 500, headers });
  }
}
// PHASE 8 END: POST /api/auth/logout
