import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { audit, requestMetaFromHeaders } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, unauthorized, unprocessable, tooManyRequests, serverError } from "@/lib/http";
import { anonymizeProfile, getProfile, upsertProfile } from "@/lib/profile-service";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/safe-log";
import { FORBIDDEN_PROFILE_KEYS, profileUpdateSchema } from "@/lib/schemas/profile";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function profileResponse(
  row: Awaited<ReturnType<typeof getProfile>>,
  identity: { sub: string; preferred_username?: string; email?: string; email_verified?: boolean },
) {
  return {
    user_id: identity.sub,
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    bio: row?.bio ?? null,
    locale: row?.locale ?? null,
    timezone: row?.timezone ?? null,
    phone: row?.phone ?? null,
    address: row?.address_json ?? null,
    profile_visibility: row?.profile_visibility ?? "private",
    notification_preferences: row?.notification_preferences ?? null,
    privacy_settings: row?.privacy_settings ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    deletion_requested_at: row?.deletion_requested_at ?? null,

    // Read-only identity fields from the access token. Not persisted here.
    identity: {
      username: identity.preferred_username ?? null,
      email: identity.email ?? null,
      email_verified: identity.email_verified ?? null,
      source: "kobil_identity",
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);
    const row = await getProfile(user.sub);
    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_read",
      ...meta,
    });
    return json(profileResponse(row, user));
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "profile_get_failed", { error: err instanceof Error ? err.message : String(err) });
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);

    const limit = rateLimit(`profile:patch:${user.sub}`, 30, 60 * 60);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return unprocessable({ message: "invalid JSON body" });
    }

    if (body !== null && typeof body === "object") {
      const incomingKeys = Object.keys(body as Record<string, unknown>);
      const forbidden = incomingKeys.filter((k) =>
        (FORBIDDEN_PROFILE_KEYS as readonly string[]).includes(k),
      );
      if (forbidden.length > 0) {
        await audit({
          user_id: user.sub,
          actor_subject: user.sub,
          action: "profile_update",
          decision: "deny",
          reason: "forbidden_field",
          changed_fields: forbidden,
          ...meta,
        });
        return unprocessable({
          message: "field is owned by KOBIL Identity or is a verified claim and cannot be updated here",
          forbidden_fields: forbidden,
        });
      }
    }

    let patch;
    try {
      patch = profileUpdateSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return unprocessable({
          message: "invalid profile fields",
          issues: err.issues.map((i) => ({ path: i.path, code: i.code, message: i.message })),
        });
      }
      throw err;
    }

    const changedFields = Object.keys(patch);
    if (changedFields.length === 0) return json({ updated: false }, { status: 200 });

    const row = await upsertProfile(user.sub, patch);
    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_update",
      changed_fields: changedFields,
      ...meta,
    });

    return json(profileResponse(row, user));
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "profile_patch_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);

    const limit = rateLimit(`profile:delete:${user.sub}`, 1, 24 * 60 * 60);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

    const existing = await getProfile(user.sub);

    await prisma.$transaction(async (tx) => {
      // Anonymize editable fields + mark deletion_requested_at.
      if (existing) {
        await tx.profile.update({
          where: { user_id: user.sub },
          data: {
            display_name: null,
            avatar_url: null,
            bio: null,
            locale: null,
            timezone: null,
            phone: null,
            address_json: Prisma.DbNull,
            profile_visibility: "private",
            notification_preferences: Prisma.DbNull,
            privacy_settings: Prisma.DbNull,
            deletion_requested_at: new Date(),
            anonymized_at: new Date(),
          },
        });
      } else {
        await tx.profile.create({
          data: {
            user_id: user.sub,
            profile_visibility: "private",
            deletion_requested_at: new Date(),
            anonymized_at: new Date(),
          },
        });
      }
      await tx.privacyRequest.create({
        data: {
          user_id: user.sub,
          request_type: "deletion",
          status: "received",
        },
      });
    });

    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_deletion_requested",
      ...meta,
    });

    return json({ status: "received", request_type: "deletion" }, { status: 202 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "profile_delete_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}

// Silence the unused-import warning when anonymizeProfile isn't used directly.
void anonymizeProfile;
