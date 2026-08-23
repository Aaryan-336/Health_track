import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/permissions';

export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? (user.onboardedAt ? '/home' : '/onboarding') : '/welcome');
}
