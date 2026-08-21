import { LocaleSwitcher } from '@/components/locale-switcher';
import { MachaMark } from '@/components/ui/macha-mark';
import { ShowcaseFrame } from '@/components/ui/showcase';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';

/**
 * El marco de las pantallas que viven FUERA del shell de la app.
 *
 * Son las que no cuelgan de `app/(app)/layout.tsx` y por lo tanto no tienen sidebar: la
 * landing (`app/page.tsx`) y el enrutador post-login (`app/continue/page.tsx`). Les da las
 * dos cosas que el shell les daría y no puede: el wordmark y el selector de idioma.
 *
 * El selector es lo que menos parece necesario y más lo es: quien llega sin sesión tiene que
 * poder cambiar el idioma ANTES de entrar, no después.
 *
 * ═══ POR QUÉ ES UN COMPONENTE COMPARTIDO Y NO UNA COPIA EN CADA UNA ═══
 *
 * Vivía dentro de `app/page.tsx` cuando esa ruta hacía las dos cosas a la vez: ser la
 * portada pública Y decidir a dónde mandar a quien acababa de iniciar sesión. Al separarlas
 * (2026-08-21), copiarlo habría sido la forma de que la landing y el post-login se vieran
 * distintos con el tiempo, empezando por el primero que ajustara un padding.
 */
export function PublicScreen({
  locale,
  children,
  /**
   * `center` (default) — el bloque va centrado vertical, como una portada. Es lo correcto
   * para un mensaje corto: un titular con un botón debajo.
   *
   * `top` — el contenido arranca arriba y fluye. Es lo que necesita una landing con varias
   * secciones, donde centrar vertical dejaría la primera pantalla vacía por arriba y por
   * abajo mientras el resto queda fuera de vista.
   */
  align = 'center',
}: {
  locale: Locale;
  children: React.ReactNode;
  align?: 'center' | 'top';
}) {
  return (
    <ShowcaseFrame className="min-h-dvh">
      <main
        data-density="comfortable"
        className={cn(
          'mx-auto flex min-h-dvh flex-col p-[var(--density-main-p)]',
          // La landing necesita más ancho que un mensaje centrado: 880px es la medida de
          // lectura de un párrafo, no de una portada con secciones.
          align === 'center' ? 'max-w-[880px]' : 'max-w-[1120px]',
        )}
      >
        <div className="flex items-center justify-between">
          {/* Wordmark, no clave de i18n: es la marca (design guide.md §7), igual que en el
              sidebar del shell. */}
          <span className="flex items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground">
            <MachaMark />
            Macha
          </span>
          <LocaleSwitcher locale={locale} />
        </div>
        <div
          className={cn(
            'flex flex-col gap-6',
            align === 'center' ? 'my-auto items-center py-10' : 'mt-12',
          )}
        >
          {children}
        </div>
      </main>
    </ShowcaseFrame>
  );
}
