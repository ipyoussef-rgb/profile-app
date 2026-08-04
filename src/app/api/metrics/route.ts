// Prometheus scrape endpoint. instrumentation.ts wires
// `prom-client`'s default Node.js metrics into the registry on app
// boot; this handler exposes the registry's text format. The chart's
// ServiceMonitor (when `global.serviceMonitor.enabled: true`) scrapes
// this path on the named port.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return new Response("metrics only available on the nodejs runtime", {
      status: 503,
    });
  }
  const { register } = await import("prom-client");
  const body = await register.metrics();
  return new Response(body, {
    headers: { "Content-Type": register.contentType },
  });
}
