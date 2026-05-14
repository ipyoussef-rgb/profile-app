import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { audit, requestMetaFromHeaders } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { json, serverError, tooManyRequests, unauthorized, unprocessable } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/safe-log";
import { getProvider } from "@/lib/verification/provider";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    purpose: z.string().min(1).max(60).default("identity_verification"),
    return_url: z.string().url().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);

    const limit = rateLimit(`verif:eid:start:${user.sub}`, 5, 60 * 60);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    let parsed;
    try {
      parsed = bodySchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) return unprocessable({ issues: e.issues.map((i) => i.message) });
      throw e;
    }

    const provider = getProvider();
    const result = await provider.start({
      user_id: user.sub,
      purpose: parsed.purpose,
      return_url: parsed.return_url ?? `${env().APP_BASE_URL}/profile/verified`,
    });

    await prisma.userVerification.create({
      data: {
        user_id: user.sub,
        verification_type: "eid",
        method: result.method,
        status: "pending",
        purpose: parsed.purpose,
        session_id: result.session_id,
        provider_reference: result.provider_reference,
      },
    });

    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_update", // re-use existing action; future: dedicated eid_verification_started
      changed_fields: [`eid_verification_started:${result.session_id}`],
      ...meta,
    });

    // The frontend will prefer launching `eid://...?tcTokenURL=...` if the
    // provider supplied a tc_token_url; otherwise it just navigates to
    // `verification_url`.
    return json({
      session_id: result.session_id,
      status: "pending",
      verification_url: result.verification_url,
      tc_token_url: result.tc_token_url,
      method: result.method,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "eid_start_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
