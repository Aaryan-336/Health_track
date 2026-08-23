import type { Metadata } from 'next';

import { AppearanceScreen } from '@/features/profile/AppearanceScreen';
import { requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Look & feel' };
export const dynamic = 'force-dynamic';

export default async function AppearancePage() {
  await requireUser();
  return <AppearanceScreen />;
}
