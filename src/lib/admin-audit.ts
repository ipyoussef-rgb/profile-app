import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { logEvent } from "./safe-log";

export type AdminAuditAction =
  | "user_audit_viewed"
  | "admin_audit_viewed"
  | "catalog_created"
  | "catalog_updated"
  | "catalog_deactivated"
  | "catalog_value_added"
  | "catalog_value_updated"
  | "catalog_value_deactivated";

export type AdminAuditInput = {
  admin_subject: string;
  admin_username?: string | null;
  target_user_id?: string | null;
  action: AdminAuditAction;
  resource?: string | null;
  metadata?: Record<string, unknown> | null;
  request_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

export async function adminAudit(input: AdminAuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        admin_subject: input.admin_subject,
        admin_username: input.admin_username ?? null,
        target_user_id: input.target_user_id ?? null,
        action: input.action,
        resource: input.resource ?? null,
        metadata: input.metadata == null ? Prisma.DbNull : (input.metadata as Prisma.InputJsonValue),
        request_id: input.request_id ?? null,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
      },
    });
  } catch (err) {
    logEvent("warn", "admin_audit_write_failed", {
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
