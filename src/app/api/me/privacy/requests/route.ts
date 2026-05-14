import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, unauthorized, serverError } from "@/lib/http";
import { logEvent } from "@/lib/safe-log";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await prisma.privacyRequest.findMany({
      where: { user_id: user.sub },
      orderBy: { requested_at: "desc" },
      take: 50,
    });
    return json({
      requests: rows.map((r) => ({
        id: r.id,
        request_type: r.request_type,
        status: r.status,
        requested_at: r.requested_at,
        completed_at: r.completed_at,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "privacy_requests_get_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
