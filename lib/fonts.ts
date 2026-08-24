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
 * son los que el design guide usa. Las cursivas no entran: el sistema de diseño no usa
 * ninguna.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * SON `.woff2` SUBSETEADOS, Y LOS DOS PASOS SE MIDIERON POR SEPARADO (CU-868kfvah8)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este archivo servía los `.otf` del Brand Book tal cual, y su propio comentario ya
 * anotaba el problema: `next/font/local` NO subsetea, así que cada peso era peso real en
 * la primera carga. Medido sobre `macha.finance` en producción: 539 KB de tipografía de
 * los 1,2 MB de la página — el 47 %.
 *
 * Dos cambios, y conviene no confundirlos porque el titular engaña:
 *
 *   1. `.otf` → `.woff2`. En disco es un 67 % menos (1.275 → 425 KB), pero en la RED
 *      el ahorro es mucho menor: Vercel ya servía los `.otf` comprimidos (~135 KB cada
 *      uno). El ahorro real de este paso son 114 KB. Aun así se hace: `.otf` es un
 *      formato de escritorio y mandarlo al navegador obliga a descomprimir dos veces.
 *   2. SUBSET a lo que el producto usa. Ahí está el grueso: 1.299 → 855 glifos por peso,
 *      539 → 232 KB en la red. Se cae cirílico, griego y otros alfabetos que un producto
 *      ES/EN no pinta nunca; se conservan latín completo con diacríticos, puntuación
 *      tipográfica, monedas, operadores, formas geométricas y —esto importa— las FLECHAS
 *      ↗ ↘ del delta de KPI, que son el canal redundante de la regla de los dos verdes.
 *
 * Total medido: 539 → 232 KB, o sea 307 KB menos (57 % de la tipografía, ~25 % de la
 * página). Hay test que comprueba que los cuatro pesos conservan los 116 caracteres que
 * el producto necesita; si el subset se rehace y se come uno, falla ahí y no en pantalla.
 *
 * Si algún día hace falta un glifo fuera del subset, la degradación es suave: cae al
 * `fallback` de abajo. No se rompe nada, se ve distinto.
 *
 * REHACER EL SUBSET: los `.otf` originales NO están en el repo (pesaban 1,3 MB y ya no se
 * sirven). Vienen del Brand Book, `Macha-Veintitres/LOGO/…/SF Pro`. El procedimiento y
 * los rangos exactos están en `app/fonts/README.md`.
 */
export const sfPro = localFont({
  src: [
    { path: '../app/fonts/SF-Pro-Display-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Display-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Display-Semibold.woff2', weight: '600', style: 'normal' },
    { path: '../app/fonts/SF-Pro-Display-Bold.woff2', weight: '700', style: 'normal' },
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
