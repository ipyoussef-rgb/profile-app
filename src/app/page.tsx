import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { requireUserOrRedirect } from "@/lib/current-user";
import { resumeResetGrace } from "@/lib/env";
import { ResumeToStart } from "@/components/layout/ResumeToStart";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Same auth gate as /profile. The landing is the KOBIL Super-App style
  // settings menu; the "Profil" entry opens the full profile-app experience.
  const user = await requireUserOrRedirect("/");
  const name = user.preferred_username ?? null;
  const email = user.email ?? null;
  const grace = resumeResetGrace();

  return (
    <>
      {/* This page IS the reset target, so the guard never navigates from here.
          It is mounted only to keep the heartbeat ticking while the user is on
          the menu — otherwise the timestamp would go stale and opening /profile
          would look like a return from a long absence. */}
      <ResumeToStart pristineSeconds={grace.pristine} dirtySeconds={grace.dirty} />
      <ProfileMenu name={name} email={email} />
    </>
  );
}
