import { requireUserOrRedirect } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { DataAccount } from "@/components/data/DataAccount";

export const dynamic = "force-dynamic";

export default async function DataAccountPage() {
  const user = await requireUserOrRedirect("/profile/data-and-account");
  const rows = await prisma.privacyRequest.findMany({
    where: { user_id: user.sub },
    orderBy: { requested_at: "desc" },
    take: 50,
  });
  const initialRequests = rows.map((r) => ({
    id: r.id,
    request_type: r.request_type,
    status: r.status,
    requested_at: r.requested_at.toISOString(),
    completed_at: r.completed_at?.toISOString() ?? null,
  }));

  return <DataAccount initialRequests={initialRequests} locale="en" />;
}
