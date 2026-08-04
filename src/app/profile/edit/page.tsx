import { requireUserOrRedirect } from "@/lib/current-user";
import { loadIdpProfile } from "@/lib/idp-prefill";
import { EditForm } from "@/components/profile/EditForm";
import { DEFAULT_LOCALE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await requireUserOrRedirect("/profile/edit");
  const idp = await loadIdpProfile(user.email);

  if (!idp.configured) {
    idp.data.username = user.preferred_username ?? null;
    idp.data.email = user.email ?? null;
    idp.data.email_verified = user.email_verified ?? null;
  }

  return <EditForm idp={idp} locale={DEFAULT_LOCALE} />;
}
