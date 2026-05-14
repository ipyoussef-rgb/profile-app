import { requireUserOrRedirect } from "@/lib/current-user";
import { Header } from "@/components/layout/Header";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserOrRedirect("/profile");
  return (
    <div className="min-h-screen bg-[var(--color-kobil-surface-muted)]">
      <Header username={user.preferred_username ?? user.email ?? null} />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
