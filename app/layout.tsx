import type { Metadata } from 'next';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { inter, mono } from '@/lib/fonts';
import { ThemeProvider } from '@/components/theme-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Macha Finance',
  description: 'CFO-layer para PYMEs.',
};

// The two font variables are attached at <html>; components pick font-ui / font-mono.
// AuthKitProvider wraps everything so client components (org-switcher, etc.) can
// call useAuth() — it reads the session middleware.ts already resolved, it does
// not itself gate access.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body>
        <AuthKitProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
