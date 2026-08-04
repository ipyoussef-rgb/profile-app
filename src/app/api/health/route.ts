// Lightweight liveness endpoint. Does not touch Prisma or any external
// service so it can answer immediately on cold start, which lets the
// chart's startupProbe transition to readiness within ~120 s (no DB)
// or ~180 s (with DB plus first-start `prisma db push`). Smoke test
// asserts the literal `{"status":"ok"}` response.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ status: "ok" });
}
