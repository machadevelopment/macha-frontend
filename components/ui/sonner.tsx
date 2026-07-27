'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

// design guide.md §8 "Feedback" — toasts for ephemeral confirmations (gap the mockup
// didn't define). Themed via CSS vars so it follows light/dark without its own palette.
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast !bg-card !text-foreground !border-border !shadow-tab !text-body font-ui',
          description: '!text-muted-foreground',
        },
      }}
    />
  );
}
