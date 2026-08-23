import { redirect } from 'next/navigation';

import { ThemeProvider, type ModeName, type ThemeName } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';
import { getSessionUser } from '@/lib/permissions';

/**
 * Edge-to-edge routes: no app chrome, no bottom nav. Used for the immersive
 * message and letter experiences that notifications deep-link into.
 */
export default async function FullLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');

  return (
    <ThemeProvider
      initialTheme={user.themePreference.toLowerCase() as ThemeName}
      initialMode={user.modePreference.toLowerCase() as ModeName}
    >
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
