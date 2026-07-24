import type { Metadata } from 'next';
import { inter, mono } from '@/lib/fonts';
import { ThemeProvider } from '@/components/theme-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Macha Finance',
  description: 'CFO-layer para PYMEs.',
};

// The two font variables are attached at <html>; components pick font-ui / font-mono.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
