import { NextRequest, NextResponse } from "next/server";
import { verifyEidSession } from "@/lib/eid";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** RefreshAddress — AusweisApp redirects here after the PAOS flow finishes
 *  (success or failure). We don't have the verified attributes at this point;
 *  the eID-Server delivers those out-of-band via POST /api/eid/result.
 *  We just bounce the user back to /profile with a status flag. */
export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  const result = req.nextUrl.searchParams.get("ResultMajor") ?? "ok";
  const base = env().APP_BASE_URL.replace(/\/$/, "");

  const session = sid ? await verifyEidSession(sid) : null;
  const status =
    !session
      ? "expired"
      : result.toLowerCase().includes("error")
        ? "failed"
        : "pending";

  // pending = AusweisApp returned but eID-Server hasn't called /api/eid/result yet
  return NextResponse.redirect(`${base}/profile?eid=${status}`);
}
