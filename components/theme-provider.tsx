'use client';
import { ThemeProvider as NextThemes } from 'next-themes';
import type { ReactNode } from 'react';

// darkMode via class on <html>; full light + dark themes (design guide §2.5).
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem>
      {children}
    </NextThemes>
  );
}
