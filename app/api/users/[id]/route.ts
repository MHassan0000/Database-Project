// PHASE 8 FIX START: password-reset support in admin user edit
// PUT /api/users/[id]    — Admin only: update user role, name, status, password
// DELETE /api/users/[id] — Admin only: delete a user and their sessions

import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit, buildDiff } from "@/lib/audit";
// PHASE 8 FIX END: password-reset support

// PUT /api/users/[id] — update user (role, name, is_active)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID." }, { status: 400 });
    }

    // Fetch existing user
    const existing = await query(
      `SELECT id, name, email, role, is_active FROM users WHERE id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }
    const before = existing.rows[0];

    // Parse updates
    const body = await request.json();
    const { name, role, is_active, password } = body as {
      name?: string;
      role?: string;
      is_active?: boolean;
      // PHASE 8 FIX: password field from UserManagement form
      password?: string;
    };

    // Validate role if provided
    const validRoles = ["admin", "manager", "viewer"];
    if (role !== undefined && !validRoles.includes(role)) {
      return Response.json(
        { error: "Role must be admin, manager, or viewer." },
        { status: 400 }
      );
    }

    // Prevent admin from demoting themselves
    if (userId === auth.user.id && role && role !== "admin") {
      return Response.json(
        { error: "You cannot change your own role." },
        { status: 400 }
      );
    }

    // Build update
    const updates: string[] = [];
    const values: (string | boolean | number)[] = [];
    let idx = 1;

    if (name !== undefined) {
      if (name.trim().length < 2) {
        return Response.json({ error: "Name must be at least 2 characters." }, { status: 400 });
      }
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);

      // Delete sessions if deactivating
      if (!is_active) {
        await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
      }
    }
    // PHASE 8 FIX START: handle password update
    if (password !== undefined && password !== "") {
      if (password.length < 8) {
        return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      const newHash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${idx++}`);
      values.push(newHash);
      // Invalidate all existing sessions so the user must re-login with the new password
      await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    }
    // PHASE 8 FIX END: handle password update

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update." }, { status: 400 });
    }

    values.push(userId);
    const result = await query(
      `UPDATE users SET ${updates.join(", ")}
        WHERE id = $${idx}
       RETURNING id, name, email, role, avatar_url, is_active, last_login, created_at, updated_at`,
      values
    );

    const after = result.rows[0];

    await logAudit({
      action: "update",
      entityType: "user",
      entityId: userId,
      entityName: before.email,
      details: buildDiff(before, after),
      performedBy: auth.user.email,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
    });

    return Response.json({ user: after });
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    return Response.json({ error: "Failed to update user." }, { status: 500 });
  }
}

// DELETE /api/users/[id] — delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID." }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === auth.user.id) {
      return Response.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const existing = await query("SELECT id, email, name FROM users WHERE id = $1", [userId]);
    if (existing.rows.length === 0) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }
    const user = existing.rows[0];

    // Sessions cascade-deleted via FK ON DELETE CASCADE
    await query("DELETE FROM users WHERE id = $1", [userId]);

    await logAudit({
      action: "delete",
      entityType: "user",
      entityId: userId,
      entityName: user.email,
      details: { deletedBy: auth.user.email, deletedName: user.name },
      performedBy: auth.user.email,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
    });

    return Response.json({ message: `User ${user.email} deleted.` });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return Response.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
// PHASE 8 END: /api/users/[id]
