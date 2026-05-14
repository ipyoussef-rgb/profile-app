import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { audit } from "@/lib/audit";
import { loadIdpProfile } from "@/lib/idp-prefill";
import { Overview } from "@/components/profile/Overview";
import { DEFAULT_LOCALE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function ProfileOverviewPage() {
  const user = await requireUserOrRedirect("/profile");
  const [row, idp] = await Promise.all([getProfile(user.sub), loadIdpProfile(user.sub)]);

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_read",
  });

  const profile = {
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    profile_visibility: row?.profile_visibility ?? "private",
  };

  // Fall back to access-token identity fields if the service client isn't
  // configured yet (so the page is still useful in dev).
  if (!idp.configured) {
    idp.data.username = user.preferred_username ?? null;
    idp.data.email = user.email ?? null;
    idp.data.email_verified = user.email_verified ?? null;
  }

  return <Overview profile={profile} idp={idp} locale={DEFAULT_LOCALE} />;
}
