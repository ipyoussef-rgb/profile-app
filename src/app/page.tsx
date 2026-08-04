import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { requireUserOrRedirect } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Same auth gate as /profile. The landing is the KOBIL Super-App style
  // settings menu; the "Profil" entry opens the full profile-app experience.
  const user = await requireUserOrRedirect("/");
  const name = user.preferred_username ?? null;
  const email = user.email ?? null;

  return <ProfileMenu name={name} email={email} />;
}
