import type { Metadata } from 'next';

import { HomeDashboard } from '@/features/tracking/HomeDashboard';
import { greetingFor } from '@/lib/dates';
import { requireUser } from '@/lib/permissions';
import { getHomeData } from '@/features/tracking/queries';

export const metadata: Metadata = { title: 'Home' };
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requireUser();
  const data = await getHomeData(user);

  return (
    <HomeDashboard
      data={data}
      greeting={greetingFor(user.timezone)}
      displayName={user.displayName}
      avatarUrl={user.avatarUrl}
    />
  );
}
