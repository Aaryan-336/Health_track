import { redirect } from 'next/navigation';

import { BlobBackdrop } from '@/components/ui/Blob';
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
      <BlobBackdrop />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
