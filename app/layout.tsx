import type { Metadata, Viewport } from 'next';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'Bloom · together', template: '%s · Bloom' },
  description:
    'A soft, private space for two people to look after their health — and each other.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Bloom',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Bloom' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FBF6EE',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="blush" data-mode="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Applies the saved theme before first paint so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bloom-theme'),m=localStorage.getItem('bloom-mode');var r=document.documentElement;if(t)r.dataset.theme=t;if(m){r.dataset.mode=m==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
