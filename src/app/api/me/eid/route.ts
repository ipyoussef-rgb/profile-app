import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ verification: null }, { status: 401 });
  }
  const v = await prisma.eidVerification.findUnique({ where: { user_id: user.sub } });
  return NextResponse.json({
    verification: v
      ? {
          verified_at: v.verified_at.toISOString(),
          given_names: v.given_names,
          family_names: v.family_names,
          date_of_birth: v.date_of_birth,
          place_of_birth: v.place_of_birth,
          street: v.street,
          city: v.city,
          zip_code: v.zip_code,
          country: v.country,
        }
      : null,
  });
}
