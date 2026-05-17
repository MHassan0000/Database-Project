// PHASE 8 START: GET /api/auth/me
// Returns the current authenticated user's profile (no password_hash).
// Returns 401 if the session is missing or expired.

import { type NextRequest } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const user = await getSession(request);

    if (!user) {
      return Response.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    return Response.json({ user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return Response.json({ error: "Failed to fetch session." }, { status: 500 });
  }
}
// PHASE 8 END: GET /api/auth/me
