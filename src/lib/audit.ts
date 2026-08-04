import { prisma } from "./db";
import { logEvent } from "./safe-log";

export type AuditAction =
  | "profile_read"
  | "profile_update"
  | "profile_export"
  | "profile_deletion_requested"
  | "consent_updated"
  | "auth_denied"
  | "eid_verified";

export type AuditInput = {
  user_id: string;
  actor_subject: string;
  actor_client_id?: string | null;
  action: AuditAction;
  changed_fields?: string[];
  decision?: "allow" | "deny";
  reason?: string | null;
  request_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.profileAuditLog.create({
      data: {
        user_id: input.user_id,
        actor_subject: input.actor_subject,
        actor_client_id: input.actor_client_id ?? null,
        action: input.action,
        changed_fields: input.changed_fields ?? [],
        decision: input.decision ?? "allow",
        reason: input.reason ?? null,
        request_id: input.request_id ?? null,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
      },
    });
  } catch (err) {
    // Never throw from the audit path; just log safely so a failed audit write
    // doesn't take down the request.
    logEvent("warn", "audit_write_failed", {
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function requestMetaFromHeaders(headers: Headers): {
  request_id: string;
  ip_address: string | null;
  user_agent: string | null;
} {
  const xff = headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : null;
  const ua = headers.get("user-agent");
  const reqId = headers.get("x-request-id") ?? crypto.randomUUID();
  return { request_id: reqId, ip_address: ip, user_agent: ua };
}
