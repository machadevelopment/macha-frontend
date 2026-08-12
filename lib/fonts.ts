import { Inter, JetBrains_Mono } from 'next/font/google';

/**
 * Fuentes del producto (design guide.md §11.4, revisado por CU-868knx0vh).
 *
 * LA FUENTE DE INTERFAZ DEL BRAND BOOK ES SF PRO DISPLAY, Y NO ESTÁ ACÁ. No es un olvido:
 * SF Pro es propiedad de Apple, su licencia la restringe a desarrollo sobre plataformas
 * Apple, y no está en Google Fonts — así que ni `next/font/google` la sirve ni se puede
 * auto-hospedar el archivo en una web pública sin violar la licencia.
 *
 * Lo que sí es legítimo es pedirla por el stack del sistema, y eso es lo que hace
 * `--font-ui-stack` en `styles/globals.css`: `-apple-system` y `BlinkMacSystemFont`
 * resuelven a SF en macOS y iOS, y en Windows y Android caen a Inter.
 *
 * POR ESO INTER SE SIGUE CARGANDO. Dejó de ser la fuente de interfaz para pasar a ser el
 * respaldo, pero es el respaldo de aproximadamente la mitad de los dispositivos, así que
 * no se puede quitar: sin ella, Windows y Android caerían a Segoe UI y Roboto, que no son
 * una decisión de nadie.
 *
 * CONSECUENCIA QUE HAY QUE ACEPTAR: el producto NO se ve igual en Mac que en Windows. En
 * Mac se ve el Brand Book; en Windows, la aproximación más cercana que la licencia
 * permite. La alternativa sería comprar una tipografía de reemplazo con licencia web.
 *
 * JetBrains Mono deja de pintar las CIFRAS (ese fue el cambio de mayor impacto visual del
 * rediseño) y se queda para eyebrows y labels en mayúscula con tracking, que son rasgo de
 * identidad y no dato. Ver la regla mono reescrita en `globals.css`.
 */
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
