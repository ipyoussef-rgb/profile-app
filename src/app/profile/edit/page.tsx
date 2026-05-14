import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { loadIdpProfile } from "@/lib/idp-prefill";
import { EditForm } from "@/components/profile/EditForm";
import { DEFAULT_LOCALE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await requireUserOrRedirect("/profile/edit");
  const [row, idp] = await Promise.all([getProfile(user.sub), loadIdpProfile(user.sub)]);

  if (!idp.configured) {
    idp.data.username = user.preferred_username ?? null;
    idp.data.email = user.email ?? null;
    idp.data.email_verified = user.email_verified ?? null;
  }

  const initial = {
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    profile_visibility: row?.profile_visibility ?? "private",
  };

  return <EditForm initial={initial} idp={idp} locale={DEFAULT_LOCALE} />;
}
