import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/current-user";
import { eidClientUrl, eidEnabled, signEidSession } from "@/lib/eid";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!eidEnabled()) return new NextResponse(null, { status: 404 });
  try {
    const user = await requireUser();
    const sid = await signEidSession({ sub: user.sub, nonce: randomUUID() });
    const base = env().APP_BASE_URL.replace(/\/$/, "");
    const tcTokenUrl = `${base}/api/eid/tctoken?sid=${encodeURIComponent(sid)}`;
    return NextResponse.json({ ok: true, clientUrl: eidClientUrl(tcTokenUrl) });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
}
