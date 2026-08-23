import { prisma } from '@/lib/db/client';
import { jsonBody, ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { safeTimezone } from '@/lib/dates';
import { healthProfileSchema, profileUpdateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  const healthProfile = await prisma.healthProfile.findUnique({ where: { userId: user.id } });

  return ok({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    themePreference: user.themePreference,
    modePreference: user.modePreference,
    healthProfile,
  });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const body = (await jsonBody(req)) as Record<string, unknown>;

  const profile = profileUpdateSchema.parse(body);
  const health = healthProfileSchema.parse(body.healthProfile ?? {});

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: user.id },
      data: {
        ...(profile.displayName !== undefined ? { displayName: profile.displayName } : {}),
        ...(profile.avatarUrl !== undefined ? { avatarUrl: profile.avatarUrl } : {}),
        ...(profile.timezone !== undefined ? { timezone: safeTimezone(profile.timezone) } : {}),
        ...(profile.themePreference !== undefined ? { themePreference: profile.themePreference } : {}),
        ...(profile.modePreference !== undefined ? { modePreference: profile.modePreference } : {}),
      },
    });

    const hp = Object.keys(health).length
      ? await tx.healthProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...health },
          update: health,
        })
      : await tx.healthProfile.findUnique({ where: { userId: user.id } });

    return { u, hp };
  });

  return ok({
    displayName: updated.u.displayName,
    timezone: updated.u.timezone,
    themePreference: updated.u.themePreference,
    modePreference: updated.u.modePreference,
    healthProfile: updated.hp,
  });
});
