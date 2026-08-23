import { redirect } from 'next/navigation';

import { AddSheet } from '@/components/layout/AddSheet';
import { BottomNav } from '@/components/layout/BottomNav';
import { CelebrationOverlay } from '@/components/layout/Celebration';
import { PWARegistrar } from '@/components/layout/PWARegistrar';
import { ThemeProvider, type ModeName, type ThemeName } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';
import { getSessionUser } from '@/lib/permissions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  if (!user.onboardedAt) redirect('/onboarding');

  return (
    <ThemeProvider
      initialTheme={user.themePreference.toLowerCase() as ThemeName}
      initialMode={user.modePreference.toLowerCase() as ModeName}
    >
      <div className="relative mx-auto min-h-dvh w-full max-w-md">
        <main className="px-4 pb-32 pt-safe">{children}</main>
        <BottomNav />
      </div>
      <AddSheet />
      <Toaster />
      <CelebrationOverlay />
      <PWARegistrar />
    </ThemeProvider>
  );
}
