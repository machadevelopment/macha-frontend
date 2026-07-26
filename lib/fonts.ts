import { Inter, JetBrains_Mono } from 'next/font/google';

// UI = Inter, Data = JetBrains Mono. Exposed as CSS variables (design guide §11.4).
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
});
export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});
