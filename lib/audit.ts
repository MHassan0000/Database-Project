// Phase 3 — lib/audit.ts
// Centralised audit-logging helper.
// Imported by every mutating API route to write to the audit_log table.
// Non-fatal: errors are caught and logged to console rather than thrown,
// so a logging failure never breaks the primary operation.

import { query } from "@/lib/db";

export interface AuditParams {
  action: string;         // create | update | delete | stock_adjust | bulk_update | bulk_delete | import | receive_po
  entityType: string;     // product | supplier | purchase_order | user
  entityId?: number | null;
  entityName?: string | null;
  details?: Record<string, unknown>;
  performedBy?: string;   // email or 'system'
  ipAddress?: string | null;
}

/**
 * logAudit — writes one row to the audit_log table.
 * Intentionally non-throwing: a logging failure must never
 * surface as an API error to the consumer.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log
         (action, entity_type, entity_id, entity_name, details, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        params.action,
        params.entityType,
        params.entityId   ?? null,
        params.entityName ?? null,
        JSON.stringify(params.details ?? {}),
        params.performedBy ?? "system",
        params.ipAddress   ?? null,
      ]
    );
  } catch (err) {
    // Phase 3: intentional — log but never re-throw
    console.error("[audit] Failed to write audit log:", err);
  }
}

/**
 * buildDiff — compares two plain objects and returns an object
 * containing only the keys whose values changed, with { old, new } pairs.
 * Used by PUT routes to capture field-level diffs in the details JSON.
 */
export function buildDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    // Skip internal timestamps — they always change
    if (key === "updated_at" || key === "created_at") continue;
    if (String(before[key]) !== String(after[key])) {
      diff[key] = { old: before[key], new: after[key] };
    }
  }
  return diff;
}
