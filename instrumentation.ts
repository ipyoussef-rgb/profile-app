// Next.js App-Router init hook. Used here for one-time prom-client
// default-metrics collection wired to /api/metrics. Dynamic import
// keeps prom-client out of the edge runtime bundle (it depends on
// Node.js built-ins).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { register: promRegister, collectDefaultMetrics } = await import(
      "prom-client"
    );
    collectDefaultMetrics({ register: promRegister });
  }
}
