"use client";
// PHASE 8 START: components/UserManagement.tsx
// Admin-only panel for viewing, creating, editing, and deleting users.
// Rendered in the "users" tab of app/page.tsx (admin-only).

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Pencil, Trash2, Shield, User, Eye,
  CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import type { SafeUser, UserRole } from "@/lib/types";

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  admin:   { label: "Admin",   color: "text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/20", icon: <Shield  className="w-3 h-3" /> },
  manager: { label: "Manager", color: "text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20", icon: <User    className="w-3 h-3" /> },
  viewer:  { label: "Viewer",  color: "text-[#a1a1aa] bg-[#a1a1aa]/10 border-[#a1a1aa]/20", icon: <Eye     className="w-3 h-3" /> },
};

// ── User form modal ───────────────────────────────────────────────────────────

interface UserFormModalProps {
  user: SafeUser | null;       // null = create mode
  onClose: () => void;
  onSuccess: () => void;
}

function UserFormModal({ user, onClose, onSuccess }: UserFormModalProps) {
  const { showToast } = useToast();
  const [name, setName]         = useState(user?.name   ?? "");
  const [email, setEmail]       = useState(user?.email  ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<UserRole>(user?.role ?? "viewer");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEdit = !!user;
      const url    = isEdit ? `/api/users/${user!.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const body: Record<string, unknown> = { role };
      if (!isEdit || name !== user!.name)   body.name  = name;
      if (!isEdit)                           body.email = email;
      if (!isEdit || password)               body.password = password || undefined;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save user.");

      showToast(isEdit ? "User updated." : "User created.", "success");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md ambient-card rounded-3xl p-6 animate-scale-in">
        <h2 className="text-lg font-semibold text-white mb-6">
          {user ? "Edit User" : "Create User"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#71717a] mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full px-3 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#52525b] focus:border-[#3f3f46]"
              placeholder="Full name"
            />
          </div>

          {/* Email (create only) */}
          {!user && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#71717a] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#52525b] focus:border-[#3f3f46]"
                placeholder="user@example.com"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#71717a] mb-1.5">
              Password {user && <span className="normal-case text-[#52525b]">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!user}
              minLength={!user ? 8 : undefined}
              className="w-full px-3 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#52525b] focus:border-[#3f3f46]"
              placeholder={user ? "••••••••" : "Min. 8 characters"}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#71717a] mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm"
            >
              <option value="admin">Admin — Full access</option>
              <option value="manager">Manager — CRUD except delete &amp; user mgmt</option>
              <option value="viewer">Viewer — Read-only products</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#27272a] text-sm text-[#a1a1aa] hover:bg-[#18181b] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-[#e4e4e7] transition-colors disabled:opacity-50"
            >
              {loading ? "Saving…" : (user ? "Save Changes" : "Create User")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function UserManagement() {
  const { user: currentUser }           = useAuth();
  const { showToast }                   = useToast();
  const [users, setUsers]               = useState<SafeUser[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [modalUser, setModalUser]       = useState<SafeUser | "new" | null>(null);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  const LIMIT = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/users?page=${page}&limit=${LIMIT}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (u: SafeUser) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !u.is_active }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`User ${u.is_active ? "deactivated" : "activated"}.`, "success");
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update user.", "error");
    }
  };

  const handleDelete = async (u: SafeUser) => {
    if (!confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) return;
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("User deleted.", "success");
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete user.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Client-side search filter (simple, against already-fetched page)
  const filtered = users.filter(
    (u) =>
      search === "" ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#18181b] text-white border border-[#27272a]">
            <Users className="w-3.5 h-3.5" />
            User Management
          </div>
          <p className="text-sm text-[#71717a]">
            {total} user{total !== 1 ? "s" : ""} total
          </p>
        </div>

        <button
          onClick={() => setModalUser("new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-black text-sm font-semibold hover:bg-[#e4e4e7] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#111113] border border-[#27272a] text-sm text-white placeholder-[#52525b]"
        />
      </div>

      {/* Table */}
      <div className="ambient-card rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#52525b]">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a] text-xs uppercase tracking-wider text-[#71717a]">
                  <th className="px-6 py-4 text-left">User</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1d]">
                {filtered.map((u) => {
                  const badge = ROLE_BADGE[u.role];
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#18181b]/40 transition-colors">
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                            {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {u.name}
                              {isSelf && (
                                <span className="ml-2 text-[10px] text-[#71717a] font-normal">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-[#71717a]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${badge.color}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#34d399]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#f87171]">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Last login */}
                      <td className="px-6 py-4 text-[#71717a] text-xs">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString(undefined, {
                              month: "short", day: "numeric", year: "numeric",
                            })
                          : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => setModalUser(u)}
                            title="Edit user"
                            className="p-2 rounded-xl text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle active */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              title={u.is_active ? "Deactivate user" : "Activate user"}
                              className={`p-2 rounded-xl transition-colors ${
                                u.is_active
                                  ? "text-[#fbbf24] hover:bg-[#fbbf24]/10"
                                  : "text-[#34d399] hover:bg-[#34d399]/10"
                              }`}
                            >
                              {u.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Delete */}
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={deletingId === u.id}
                              title="Delete user"
                              className="p-2 rounded-xl text-[#f87171] hover:bg-[#f87171]/10 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272a]">
            <p className="text-xs text-[#71717a]">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#18181b] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modalUser !== null && (
        <UserFormModal
          user={modalUser === "new" ? null : modalUser}
          onClose={() => setModalUser(null)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
// PHASE 8 END: components/UserManagement.tsx
