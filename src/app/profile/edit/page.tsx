import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { EditForm } from "@/components/profile/EditForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await requireUserOrRedirect("/profile/edit");
  const row = await getProfile(user.sub);

  const initial = {
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    bio: row?.bio ?? null,
    locale: row?.locale ?? null,
    timezone: row?.timezone ?? null,
    phone: row?.phone ?? null,
    address: (row?.address_json as Record<string, string> | null) ?? null,
    profile_visibility: row?.profile_visibility ?? "private",
  };

  return (
    <EditForm
      initial={initial}
      identity={{
        username: user.preferred_username ?? null,
        email: user.email ?? null,
        email_verified: user.email_verified ?? null,
      }}
      locale="en"
    />
  );
}
