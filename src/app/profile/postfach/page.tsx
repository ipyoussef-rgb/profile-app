import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { PostfachForm } from "@/components/profile/PostfachForm";
import { DEFAULT_LOCALE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function PostfachPage() {
  const user = await requireUserOrRedirect("/profile/postfach");
  const row = await getProfile(user.sub);

  return (
    <PostfachForm
      current={row?.postfach_email ?? null}
      loginEmail={user.email ?? null}
      locale={DEFAULT_LOCALE}
    />
  );
}
