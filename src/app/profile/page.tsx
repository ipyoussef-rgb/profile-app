import { redirect } from "next/navigation";

// The attributes overview moved to the app root: opening the mini-app shows the
// data directly instead of a settings menu. This route stays so older links and
// deep links keep working.
export default function ProfileOverviewPage() {
  redirect("/");
}
