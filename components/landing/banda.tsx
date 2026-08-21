import type { ReactNode } from 'react';

/**
 * Una BANDA de la landing: fondo a todo el ancho de la ventana, contenido acotado al centro.
 *
 * ═══ POR QUÉ ESTO EXISTE, Y POR QUÉ FALTABA ═══
 *
 * La primera versión de la landing metía las catorce secciones dentro de UN contenedor de 1170px
 * y las separaba con `gap`. Se veía como un documento, no como una portada, y Keneth lo reportó
 * como "hay partes que tienen color negro" — porque en el diseño las hay y acá no había ninguna.
 *
 * Medido sobre el frame del Figma (1920 de ancho), los fondos de sección son:
 *
 *     y=0      h=64     #FFFFFF al 72 %   nav (fijo arriba)
 *     y=64     h=1148   —                 hero
 *     y=1212   h=1077   #F9F9F9           por qué existe
 *     y=2316   h=745    —                 cómo funciona
 *     y=3113   h=1041   #F9F9F9           el producto
 *     y=4158   h=910    —                 capacidades
 *     y=5068   h=966    #191919           el asesor con IA   ← la parte oscura
 *     y=6071   h=694    —                 automatización
 *     y=6765   h=867    #F9F9F9           antes y después
 *     y=7634   h=501    —                 seguridad
 *     y=8135   h=836    #F9F9F9           planes
 *     y=8971   h=867    —                 preguntas frecuentes
 *     y=9838   h=676    #F9F9F9           cierre
 *     y=10514  h=384    —                 footer
 *
 * O sea: bandas ALTERNADAS de gris casi blanco, y una sola oscura. Ese ritmo es lo que separa
 * las secciones en el diseño; el `gap` que yo había puesto hacía el trabajo a medias y encima
 * dejaba la página sin la única sección que cambia de tinta.
 *
 * ═══ LOS TONOS SON TOKENS, NO LOS HEX MEDIDOS ═══
 *
 * `sutil` es `bg-muted` (`--fill`), que en claro vale `#f7f7f7` — dos partes en 255 del `#F9F9F9`
 * del diseño, o sea imperceptible. Y a diferencia del hex, tiene su contraparte en tema oscuro
 * (`#232323`), así que la banda sigue siendo una banda cuando el visitante tiene el sistema en
 * oscuro. Un `#F9F9F9` literal se volvería un bloque blanco cegador ahí.
 *
 * `tinta` es la clase `.inverse` de `globals.css`, que redefine `--surface`/`--ink`/`--border`
 * hacia adentro: los componentes de la sección siguen usando `text-foreground` y `border-border`
 * sin saber que están sobre negro. `--surface` vale `#141414` contra el `#191919` medido — cinco
 * partes en 255, y la alternativa era un color a mano que ningún token conoce.
 *
 * ═══ EL FULL-BLEED SIN ROMPER EL ANCHO DE LA PÁGINA ═══
 *
 * La banda es un `<section>` a `width: 100%` y el contenido va en un hijo con `max-w`. No se usa
 * el truco de `margin-left: calc(50% - 50vw)`: `100vw` incluye la barra de scroll, así que en
 * Windows y Linux la página gana ~15px de desbordamiento horizontal y aparece una barra abajo.
 */
export function Banda({
  tono = 'lienzo',
  id,
  children,
  className = '',
}: {
  /** `lienzo` = fondo de página · `sutil` = la banda gris · `tinta` = la sección oscura. */
  tono?: 'lienzo' | 'sutil' | 'tinta';
  /** Ancla del nav. Va en la BANDA y no en el contenido: al saltar, el borde de la banda es el
      punto donde la sección empieza a verse. */
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  const fondo =
    tono === 'sutil' ? 'bg-muted' : tono === 'tinta' ? 'inverse bg-card text-foreground' : '';

  return (
    /*
      `scroll-mt-16` compensa los 64px del nav fijo, y va en ESTE elemento porque es el que lleva
      el `id`: el navegador alinea el destino del ancla, así que un `scroll-mt` en el hijo no
      corrige nada. Sin él, saltar a "Planes" deja el título tapado por la barra — el bug clásico
      de un nav `sticky` con anclas.
    */
    <section id={id} className={`w-full scroll-mt-16 ${fondo} ${className}`}>
      {/*
        El ancho sale de medir el diseño: el contenido va de x=375 a x=1545 sobre 1920, o sea
        1170px de caja centrada. El relleno vertical (96px en móvil, 128px en escritorio) es la
        media de los altos de banda del Figma menos su contenido; abajo de eso las bandas se
        tocan y arriba la página se estira sin motivo.
      */}
      <div className="mx-auto max-w-[1170px] px-6 py-24 app:px-8 app:py-32">{children}</div>
    </section>
  );
}
