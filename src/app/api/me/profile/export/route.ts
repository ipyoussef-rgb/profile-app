import { NextRequest, NextResponse } from "next/server";
import { audit, requestMetaFromHeaders } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/safe-log";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);

    const limit = rateLimit(`profile:export:${user.sub}`, 3, 60 * 60);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

    const [profile, consents, requests, auditTail] = await Promise.all([
      prisma.profile.findUnique({ where: { user_id: user.sub } }),
      prisma.userConsent.findMany({ where: { user_id: user.sub }, orderBy: { created_at: "asc" } }),
      prisma.privacyRequest.findMany({
        where: { user_id: user.sub },
        orderBy: { requested_at: "desc" },
      }),
      prisma.profileAuditLog.findMany({
        where: { user_id: user.sub },
        orderBy: { created_at: "desc" },
        take: 200,
        select: { action: true, changed_fields: true, decision: true, created_at: true },
      }),
    ]);

    const exportPayload = {
      _meta: {
        generated_at: new Date().toISOString(),
        identityFieldsHeldBy: "kobil_identity",
        note:
          "Login email, username, email verification, password, MFA settings, roles, and groups are managed by KOBIL Identity and are not included in this export.",
      },
      profile: profile && {
        user_id: profile.user_id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        locale: profile.locale,
        timezone: profile.timezone,
        phone: profile.phone,
        address: profile.address_json,
        profile_visibility: profile.profile_visibility,
        notification_preferences: profile.notification_preferences,
        privacy_settings: profile.privacy_settings,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        deletion_requested_at: profile.deletion_requested_at,
        anonymized_at: profile.anonymized_at,
      },
      consent_history: consents.map((c) => ({
        id: c.id,
        purpose: c.purpose,
        legal_basis: c.legal_basis,
        granted: c.granted,
        notice_version: c.notice_version,
        source: c.source,
        created_at: c.created_at,
        withdrawn_at: c.withdrawn_at,
      })),
      privacy_requests: requests.map((r) => ({
        id: r.id,
        request_type: r.request_type,
        status: r.status,
        requested_at: r.requested_at,
        completed_at: r.completed_at,
      })),
      audit_summary: auditTail.map((a) => ({
        action: a.action,
        changed_fields: a.changed_fields,
        decision: a.decision,
        at: a.created_at,
      })),
    };

    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_export",
      ...meta,
    });

    const filename = `profile-export-${user.sub}-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "profile_export_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
