import { NextRequest, NextResponse } from "next/server";
import { eidEnabled, verifyEidSession } from "@/lib/eid";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** TR-03124 TcToken response, fetched by AusweisApp. */
export async function GET(req: NextRequest) {
  if (!eidEnabled()) return new NextResponse(null, { status: 404 });
  const sid = req.nextUrl.searchParams.get("sid");
  if (!sid) return new NextResponse("missing sid", { status: 400 });
  const session = await verifyEidSession(sid);
  if (!session) return new NextResponse("invalid sid", { status: 400 });

  const e = env();
  const paosUrl = e.EID_PAOS_URL;
  if (!paosUrl) {
    // No eID-Server configured. Return a TcToken that would still trigger
    // AusweisApp, but with a placeholder PAOS URL — the user will see an
    // error in AusweisApp. The dev-mock route is the path forward in this
    // setup. We still return a syntactically-valid TcToken to make the
    // misconfiguration visible end-to-end.
    return new NextResponse("eID-Server not configured (set EID_PAOS_URL)", {
      status: 503,
    });
  }

  const base = e.APP_BASE_URL.replace(/\/$/, "");
  const refresh = `${base}/api/eid/refresh?sid=${encodeURIComponent(sid)}`;

  // Per BSI TR-03124-1 §2.6.3 the TcToken XML carries the eID-Server PAOS
  // endpoint, session id, PSK (random per session — handled by the eID-Server
  // when it gets called via SOAP), and RefreshAddress.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TCTokenType>
  <ServerAddress>${escapeXml(paosUrl)}</ServerAddress>
  <SessionIdentifier>${escapeXml(session.nonce)}</SessionIdentifier>
  <RefreshAddress>${escapeXml(refresh)}</RefreshAddress>
  <Binding>urn:liberty:paos:2006-08</Binding>
</TCTokenType>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;",
  );
}
