import { requireUserOrRedirect } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { VerifiedPanel } from "@/components/profile/VerifiedPanel";

export const dynamic = "force-dynamic";

export default async function VerifiedPage() {
  const user = await requireUserOrRedirect("/profile/verified");
  const [eid, ageClaims] = await Promise.all([
    prisma.userVerification.findFirst({
      where: { user_id: user.sub, verification_type: "eid", status: "verified" },
      orderBy: { verified_at: "desc" },
    }),
    prisma.userVerifiedClaim.findMany({
      where: {
        user_id: user.sub,
        claim_name: { in: ["age_over_16", "age_over_18", "age_over_21"] },
      },
      orderBy: { verified_at: "desc" },
    }),
  ]);

  const ageMap = new Map<string, (typeof ageClaims)[number]>();
  for (const c of ageClaims) if (!ageMap.has(c.claim_name)) ageMap.set(c.claim_name, c);

  const identity = eid
    ? {
        status: eid.status,
        method: eid.method,
        assurance_level: eid.assurance_level,
        verified_at: eid.verified_at,
        expires_at: eid.expires_at,
      }
    : ({ status: "not_verified" } as const);

  const age = (["age_over_16", "age_over_18", "age_over_21"] as const).map((claim) => {
    const c = ageMap.get(claim);
    if (!c) return { claim, verified: false };
    return {
      claim,
      verified: c.claim_value === "true",
      method: c.source,
      assurance_level: c.assurance_level,
      verified_at: c.verified_at,
      expires_at: c.expires_at,
    };
  });

  return <VerifiedPanel identity={identity} age={age} />;
}
