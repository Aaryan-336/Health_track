import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/permissions';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (user?.onboardedAt) redirect('/home');

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 pb-10 pt-safe">
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
