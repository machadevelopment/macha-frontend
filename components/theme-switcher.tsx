'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Laptop, Moon, Sun } from 'lucide-react';
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
 *
 * ═══ CU-868kt5zfu: "Sistema no hace nada al seleccionarla" ═══
 *
 * El mecanismo NUNCA estuvo roto. `ThemeProvider` ya lleva `enableSystem`, y elegir
 * "Sistema" llama a `setTheme('system')`, que es literalmente lo que next-themes espera:
 * a partir de ahí sigue `prefers-color-scheme` y reacciona cuando el sistema operativo
 * cambia. La segunda hipótesis del ticket era la correcta — con el SO en claro y la app en
 * claro, elegir "Sistema" no cambia ningún píxel.
 *
 * Pero **sí había un defecto de producto**, y es el que se arregla acá: el menú no mostraba
 * cuál opción estaba activa. Sin esa señal, "elegí Sistema y no pasó nada" es
 * indistinguible de un botón roto — el usuario no tiene forma de saber si su clic se
 * registró. Ahora:
 *
 *   · la opción activa lleva un check, así que el clic SIEMPRE produce un cambio visible;
 *   · y "Sistema" dice a qué se resolvió ("Sistema · Oscuro"), que es la única manera de
 *     confirmar que de verdad está siguiendo al SO cuando ambos coinciden.
 *
 * Arreglar la percepción no es un consuelo: en un control de tres estados donde dos pueden
 * verse igual, mostrar el estado ES la funcionalidad.
 */
export function ThemeSwitcher({ labels }: { labels: Dictionary['common']['theme'] }) {
  // `resolvedTheme` es a qué se resolvió de verdad: con `theme === 'system'` dice si el SO
  // pidió claro u oscuro. Es lo que permite confirmar que "Sistema" está haciendo algo.
  const { theme, resolvedTheme, setTheme } = useTheme();
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
        {options.map(({ value, label, Icon }) => {
          const activa = mounted && theme === value;
          return (
            <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
              <Icon className="mr-2 h-4 w-4 text-faint" strokeWidth={1.7} />
              <span className="flex-1">
                {label}
                {/* "Sistema · Oscuro": sin esto, con el SO en claro la opción se ve idéntica
                    a "Claro" y no hay forma de saber que está siguiendo al sistema. */}
                {value === 'system' && activa && resolvedTheme && (
                  <span className="text-faint">
                    {` · ${resolvedTheme === 'dark' ? labels.dark : labels.light}`}
                  </span>
                )}
              </span>
              {/* El check es lo que vuelve VISIBLE el clic. `aria-hidden` porque el estado
                  ya va anunciado por `aria-checked` del propio item de Radix. */}
              {activa && <Check className="ml-2 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
