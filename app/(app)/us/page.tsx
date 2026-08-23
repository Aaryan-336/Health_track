import type { Metadata } from 'next';

import { CoupleDashboard } from '@/features/couple/CoupleDashboard';
import { getCoupleDashboard } from '@/features/couple/queries';
import { requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Together' };
export const dynamic = 'force-dynamic';

export default async function UsPage() {
  const user = await requireUser();
  const data = await getCoupleDashboard(user);

  return <CoupleDashboard data={data} firstName={user.displayName.split(' ')[0] ?? user.displayName} />;
}
