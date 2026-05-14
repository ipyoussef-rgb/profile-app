import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { audit } from "@/lib/audit";
import { Overview } from "@/components/profile/Overview";

export const dynamic = "force-dynamic";

export default async function ProfileOverviewPage() {
  const user = await requireUserOrRedirect("/profile");
  const row = await getProfile(user.sub);

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_read",
  });

  const profile = {
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    bio: row?.bio ?? null,
    locale: row?.locale ?? null,
    timezone: row?.timezone ?? null,
    profile_visibility: row?.profile_visibility ?? "private",
    identity: {
      username: user.preferred_username ?? null,
      email: user.email ?? null,
      email_verified: user.email_verified ?? null,
    },
  };

  return <Overview profile={profile} locale="en" />;
}
