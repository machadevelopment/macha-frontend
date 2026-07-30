'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * CU-868khvzdf: control de tema.
 *
 * El tema oscuro estaba implementado entero a nivel de tokens (light + dark completos
 * en `styles/globals.css`, `darkMode: 'class'`, `ThemeProvider` con next-themes) pero no
 * había forma de activarlo desde la UI: el único componente que tocaba `useTheme` era
 * `components/ui/sonner.tsx`, y solo para *leer* el tema y estilar los toasts. Con
 * `defaultTheme="light"` + `enableSystem`, quien tuviera el sistema operativo en claro
 * no veía el modo oscuro nunca.
 *
 * La persistencia la hace next-themes en `localStorage`. Eso NO contradice la regla de
 * CLAUDE.md: la prohibición es para prototipos/artifacts, y aquí es el mecanismo propio
 * de la librería —el mismo que evita el flash de tema incorrecto, porque su script
 * inline lo lee antes del primer paint (de ahí el `suppressHydrationWarning` que ya
 * estaba en `<html>`). Moverlo a cookie rompería precisamente eso.
 */
export function ThemeSwitcher({ labels }: { labels: Dictionary['common']['theme'] }) {
  const { theme, setTheme } = useTheme();
  // Hasta que monta, el tema resuelto no se conoce en el servidor: renderizar el ícono
  // real en SSR produce un mismatch de hidratación. Se pinta el neutro y se cambia al
  // montar — es un ícono, no contenido.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { value: 'light', label: labels.light, Icon: Sun },
    { value: 'dark', label: labels.dark, Icon: Moon },
    { value: 'system', label: labels.system, Icon: Laptop },
  ] as const;

  const current = options.find((o) => o.value === theme);
  const TriggerIcon = mounted && current ? current.Icon : Laptop;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={labels.label}
          className="flex items-center gap-1.5"
        >
          <TriggerIcon className="h-4 w-4 text-faint" strokeWidth={1.7} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon className="mr-2 h-4 w-4 text-faint" strokeWidth={1.7} />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
