import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';

/**
 * Fuentes del producto (design guide.md §3 y §11.4).
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️ SF PRO DISPLAY SE AUTO-HOSPEDA POR DECISIÓN DEL DUEÑO, Y ESO TIENE UN COSTO
 *    LEGAL QUE HAY QUE CONOCER ANTES DE TOCAR ESTE ARCHIVO.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * SF Pro Display es propiedad de Apple. Su licencia (Apple Font License / EULA de los
 * SF Fonts) permite usarla para DISEÑAR interfaces destinadas a plataformas Apple; NO
 * autoriza incrustarla ni servirla desde un sitio web. Tener los archivos `.otf` —que es
 * lo que el Brand Book entregó— es justamente lo que la licencia permite: trabajo de
 * diseño. Servirlos al navegador de cualquier visitante, que es lo que hace este archivo,
 * queda fuera de ese permiso.
 *
 * La alternativa cumplidora es el stack del sistema (`-apple-system, BlinkMacSystemFont,
 * 'SF Pro Display', …`), que resuelve a SF en Mac/iPhone sin servir el archivo y cae a
 * Inter en Windows/Android. Es lo que este archivo hacía antes.
 *
 * SE ELIGE AUTO-HOSPEDARLA porque el Brand Book la fija como identidad y el dueño quiere
 * la marca idéntica en todos los dispositivos, no solo en Apple. Es una decisión de
 * negocio suya sobre un riesgo suyo, tomada con el dato encima de la mesa.
 *
 * REVERTIRLO ES UN CAMBIO DE ESTE ARCHIVO Y NADA MÁS: se cambia `localFont` por el stack
 * de sistema en `--font-ui-stack` (globals.css) y se borra `app/fonts/`. Ningún componente
 * conoce el nombre de la fuente — todos usan `font-ui`.
 *
 * Se empaquetan CUATRO pesos y no los dieciocho que trae el Brand Book: 400/500/600/700
 * son los que el design guide usa. Cada `.otf` pesa ~330 KB y `next/font/local` los sirve
 * tal cual (no subsetea), así que cada peso extra es peso real en la primera carga. Las
 * cursivas no entran: el sistema de diseño no usa ninguna.
 */
export const sfPro = localFont({
  src: [
    { path: '../app/fonts/SF-Pro-Display-Regular.otf', weight: '400', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Display-Medium.otf', weight: '500', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Display-Semibold.otf', weight: '600', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Display-Bold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-ui',
  // `swap` y no `optional`: la identidad tipográfica del Brand Book importa lo bastante
  // para aceptar un parpadeo de fallback antes que renderizar en Inter y quedarse así.
  display: 'swap',
  // Fallback declarado en el propio `@font-face`, para que el salto de métricas mientras
  // carga sea el menor posible. `next/font` calcula los ajustes de tamaño a partir de esto.
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
});

/**
 * JetBrains Mono sobrevive SOLO para contexto técnico real: eyebrows y labels en mayúscula
 * con tracking, claves de `platform_settings`, bloques de código del chat.
 *
 * NO pinta cifras. Retirar la monoespaciada de los números fue el cambio de mayor impacto
 * visual del rediseño: hacía que el producto se leyera como terminal de trading y no como
 * producto financiero. Lo que mantiene las columnas alineadas es
 * `font-variant-numeric: tabular-nums`, que es independiente de la familia. Ver la regla
 * mono reescrita en `styles/globals.css`.
 */
export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});
