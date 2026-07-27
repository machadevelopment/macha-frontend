'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setLocale } from '@/app/actions/set-locale';
import { locales, type Locale } from '@/lib/i18n/config';

const labels: Record<Locale, string> = { es: 'Español', en: 'English' };

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      void setLocale(next).then(() => router.refresh());
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-faint" strokeWidth={1.7} />
          <span className="font-mono text-eyebrow uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => select(l)}>
            {labels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
