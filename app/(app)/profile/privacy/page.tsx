import type { Metadata } from 'next';

import { PrivacyScreen } from '@/features/profile/PrivacyScreen';
import { prisma } from '@/lib/db/client';
import { getCoupleContext, requireUser } from '@/lib/permissions';
import { SHARE_CATEGORIES, SHARE_CATEGORY_COPY, ensureSharingDefaults } from '@/lib/permissions/sharing';

export const metadata: Metadata = { title: 'Privacy & sharing' };
export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const user = await requireUser();
  await ensureSharingDefaults(user.id);

  const [rows, ctx] = await Promise.all([
    prisma.sharingPreference.findMany({ where: { userId: user.id } }),
    getCoupleContext(user.id),
  ]);

  const byCategory = new Map(rows.map((r) => [r.category, r]));

  return (
    <PrivacyScreen
      partnerName={ctx?.couple.status === 'ACTIVE' ? (ctx.partner?.displayName ?? null) : null}
      categories={SHARE_CATEGORIES.map((category) => {
        const row = byCategory.get(category);
        const copy = SHARE_CATEGORY_COPY[category];
        return {
          category,
          label: copy.label,
          description: copy.description,
          levels: copy.levels.filter((l) => l !== 'NONE'),
          shareEnabled: row?.shareEnabled ?? false,
          detailLevel: row?.detailLevel ?? 'NONE',
        };
      })}
    />
  );
}
