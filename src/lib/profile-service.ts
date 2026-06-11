import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { sanitizeText } from "./sanitize";
import { ProfileUpdateInput } from "./schemas/profile";

export async function getProfile(userId: string) {
  return prisma.profile.findUnique({ where: { user_id: userId } });
}

export async function upsertProfile(userId: string, patch: ProfileUpdateInput) {
  const data: Prisma.ProfileUpdateInput = {};

  if (patch.display_name !== undefined)
    data.display_name = sanitizeText(patch.display_name) || null;
  if (patch.avatar_url !== undefined) data.avatar_url = patch.avatar_url;
  if (patch.postfach_email !== undefined) data.postfach_email = patch.postfach_email;
  if (patch.profile_visibility !== undefined) data.profile_visibility = patch.profile_visibility;
  if (patch.notification_preferences !== undefined)
    data.notification_preferences = patch.notification_preferences as Prisma.InputJsonValue;
  if (patch.privacy_settings !== undefined)
    data.privacy_settings = patch.privacy_settings as Prisma.InputJsonValue;

  const createData: Prisma.ProfileCreateInput = {
    user_id: userId,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  } as Prisma.ProfileCreateInput;

  return prisma.profile.upsert({
    where: { user_id: userId },
    create: createData,
    update: data,
  });
}

export async function anonymizeProfile(userId: string) {
  return prisma.profile.update({
    where: { user_id: userId },
    data: {
      display_name: null,
      avatar_url: null,
      postfach_email: null,
      profile_visibility: "private",
      notification_preferences: Prisma.DbNull,
      privacy_settings: Prisma.DbNull,
      deletion_requested_at: new Date(),
      anonymized_at: new Date(),
    },
  });
}
