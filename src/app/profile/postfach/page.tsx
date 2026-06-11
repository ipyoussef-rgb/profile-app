import { redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/current-user";

export const dynamic = "force-dynamic";

// Postfach is "Coming soon" — disabled for now. The form/action/DB column
// remain in the codebase; to re-enable, restore the PostfachForm render
// below (see git history) and drop this redirect + the `disabled` flag on
// the nav item in Header.tsx.
export default async function PostfachPage() {
  await requireUserOrRedirect("/profile/postfach");
  redirect("/profile");
}
