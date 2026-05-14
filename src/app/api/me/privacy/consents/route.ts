import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { audit, requestMetaFromHeaders } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, unauthorized, unprocessable, tooManyRequests, serverError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/safe-log";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  CONSENT_PURPOSES,
  ConsentPurpose,
  consentUpdateSchema,
  LEGAL_BASIS,
} from "@/lib/schemas/consents";

export const dynamic = "force-dynamic";

type ConsentState = {
  purpose: ConsentPurpose;
  granted: boolean;
  legal_basis: string;
  notice_version: string | null;
  source: string | null;
  updated_at: string | null;
};

async function currentConsents(userId: string): Promise<ConsentState[]> {
  // Get latest record per purpose.
  const rows = await prisma.userConsent.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });
  const seen = new Set<string>();
  const latestByPurpose = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (seen.has(r.purpose)) continue;
    seen.add(r.purpose);
    latestByPurpose.set(r.purpose, r);
  }
  return CONSENT_PURPOSES.map((p) => {
    const r = latestByPurpose.get(p);
    return {
      purpose: p,
      granted: r?.granted ?? false,
      legal_basis: r?.legal_basis ?? LEGAL_BASIS[p],
      notice_version: r?.notice_version ?? null,
      source: r?.source ?? null,
      updated_at: r?.created_at?.toISOString() ?? null,
    };
  });
}

export async function GET() {
  try {
    const user = await requireUser();
    const consents = await currentConsents(user.sub);
    return json({ consents });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "consents_get_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);

    const limit = rateLimit(`consents:patch:${user.sub}`, 60, 60 * 60);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return unprocessable({ message: "invalid JSON body" });
    }
    let parsed;
    try {
      parsed = consentUpdateSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return unprocessable({
          message: "invalid consent change",
          issues: err.issues.map((i) => ({ path: i.path, code: i.code, message: i.message })),
        });
      }
      throw err;
    }

    const noticeVersion = env().PRIVACY_NOTICE_VERSION;

    // Append a new immutable record per change. Never UPDATE.
    const created = await prisma.$transaction(
      parsed.changes.map((c) =>
        prisma.userConsent.create({
          data: {
            user_id: user.sub,
            purpose: c.purpose,
            legal_basis: LEGAL_BASIS[c.purpose],
            granted: c.granted,
            notice_version: noticeVersion,
            source: c.source,
            withdrawn_at: c.granted ? null : new Date(),
          },
        }),
      ),
    );

    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "consent_updated",
      changed_fields: parsed.changes.map((c) => `${c.purpose}=${c.granted}`),
      ...meta,
    });

    return json({
      consents: await currentConsents(user.sub),
      applied: created.length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "consents_patch_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
