import { requireUserOrRedirect } from "@/lib/current-user";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  await requireUserOrRedirect("/profile");
  return (
    <div className="min-h-screen bg-[var(--color-kobil-surface-muted)]">
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
