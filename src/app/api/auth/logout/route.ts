import { NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getOidcConfig, postLogoutRedirectUri } from "@/lib/oidc";
import { clearSessionCookie, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  await clearSessionCookie();

  if (env().PROFILE_EMBED_MODE) {
    return NextResponse.redirect(new URL("/", env().APP_BASE_URL));
  }

  if (!session) {
    return NextResponse.redirect(new URL("/", env().APP_BASE_URL));
  }

  const config = await getOidcConfig();
  try {
    const endSession = client.buildEndSessionUrl(config, {
      post_logout_redirect_uri: postLogoutRedirectUri(),
    });
    return NextResponse.redirect(endSession);
  } catch {
    return NextResponse.redirect(new URL("/", env().APP_BASE_URL));
  }
}
