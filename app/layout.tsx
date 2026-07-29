import type { Metadata } from 'next';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { getLocale } from '@/lib/i18n/server';
import { inter, mono } from '@/lib/fonts';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
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
  // CU-868kh8rz8: `lang` estaba fijo en "es". No es texto visible, pero es lo que los
  // lectores de pantalla usan para elegir la voz y la pronunciación, así que un cliente
  // en inglés escuchaba su UI leída con fonética española. Mismo defecto de fondo que
  // los aria-label hardcodeados de este ticket.
  const locale = getLocale();

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body>
        <AuthKitProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
