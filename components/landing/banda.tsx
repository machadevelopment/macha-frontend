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
 * `tinta` es la clase `.tinta` de `globals.css`, que redefine la paleta completa hacia adentro:
 * los componentes de la sección siguen usando `text-foreground` y `border-border` sin saber que
 * están sobre negro. `--surface` vale `#171717` contra el `#191919` medido — dos partes en 255.
 *
 * ⚠️ NO es `.inverse`, y confundirlas fue un bug real. `.inverse` existe para la barra de
 * organización del admin: define `--border` IGUAL a la superficie (deliberado en una tira sin
 * hijos con contorno) y no toca `--fill`. Con ella, el panel y los chips de esta sección salían
 * sin borde visible y el chip activo quedaba blanco sobre blanco. La explicación larga está en
 * `globals.css`, arriba de `.tinta`.
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
  paddingSuperior,
  paddingInferior,
  children,
  className = '',
}: {
  /** `lienzo` = fondo de página · `sutil` = la banda gris · `tinta` = la sección oscura. */
  tono?: 'lienzo' | 'sutil' | 'tinta';
  /** Ancla del nav. Va en la BANDA y no en el contenido: al saltar, el borde de la banda es el
      punto donde la sección empieza a verse. */
  id?: string;
  /**
   * Relleno SUPERIOR distinto, solo para el hero. Ver el bloque de abajo.
   *
   * Es un override completo de las tres clases de `pt` y no un modificador: pasar `pt-8` sin
   * apagar el `py-20 md:py-24 lg:py-32` dejaría al `md:`/`lg:` ganando por especificidad de
   * media query y el cambio solo se vería en móvil.
   */
  paddingSuperior?: string;
  /**
   * Relleno INFERIOR distinto, y hoy lo usa solo el hero (CU-868kx4374).
   *
   * Mismo mecanismo y misma advertencia que `paddingSuperior`: es un override completo de las
   * tres clases, no un modificador — pasar `pb-8` sin apagar el `md:`/`lg:` deja al media query
   * ganando y el cambio solo se ve en móvil.
   *
   * Existe porque el hero pasó a ocupar el alto de la ventana: con el `pb-32` de una banda
   * normal SUMADO al `min-h`, el conjunto siempre mide más que la pantalla y el mockup vuelve a
   * quedar cortado — justo lo que el ticket vino a arreglar.
   */
  paddingInferior?: string;
  children: ReactNode;
  className?: string;
}) {
  /*
   * `tinta` ya pinta fondo y color en CSS (ver `.tinta` en globals.css). No se suma
   * `bg-card`: si esa utilidad pierde la cascada, la banda vuelve a verse blanca — el bug
   * que Keneth reportó sobre el asesor.
   */
  const fondo = tono === 'sutil' ? 'bg-muted' : tono === 'tinta' ? 'tinta' : '';

  return (
    /*
      ═══ `overflow-hidden` NO ES DECORATIVO: EVITA UNA BARRA HORIZONTAL ═══

      El hero y el asesor llevan la mancha de marca (`InsightPoint variant="ambient"`) posicionada
      fuera de su caja a propósito: `-left-48`, `-top-56`, `-right-40`. Sin nada que las recorte,
      esos negativos son ANCHO DE PÁGINA: la mancha del asesor mide 460px, así que en un
      teléfono de 375px se sale por el lado y el documento entero gana scroll horizontal.

      Y el síntoma no aparece donde está la causa. Una barra horizontal al pie de la página se ve
      como "la landing está corrida" en CUALQUIER sección, no en la que tiene la mancha. Recortar
      en la banda lo resuelve para todas de una vez y para las que vengan.

      Efecto colateral que hay que conocer: `overflow-hidden` rompe `position: sticky` de los
      descendientes. No hay ninguno dentro de las bandas —el nav está fuera de `<main>`— y si
      algún día hace falta uno, el arreglo es sacarlo de la banda, no quitar esta clase.

      `scroll-mt-16` compensa los 64px del nav fijo, y va en ESTE elemento porque es el que lleva
      el `id`: el navegador alinea el destino del ancla, así que un `scroll-mt` en el hijo no
      corrige nada. Sin él, saltar a "Planes" deja el título tapado por la barra — el bug clásico
      de un nav `sticky` con anclas.
    */
    <section
      id={id}
      className={`relative w-full overflow-hidden scroll-mt-16 ${fondo} ${className}`}
    >
      {/*
        El ancho sale de medir el diseño: el contenido va de x=375 a x=1545 sobre 1920, o sea
        1170px de caja centrada. El relleno vertical (96px en móvil, 128px en escritorio) es la
        media de los altos de banda del Figma menos su contenido; abajo de eso las bandas se
        tocan y arriba la página se estira sin motivo.
      */}
      {/*
        ═══ EL HERO LLEVA MENOS RELLENO ARRIBA (reporte de Jose, móvil) ═══

        El `py-20 md:py-24 lg:py-32` sale de medir el Figma y funciona como espacio ENTRE dos
        secciones seguidas — se queda igual para las otras trece.

        El hero es el único lugar de la página donde no hay una sección anterior con la que
        promediar: arriba solo está el nav fijo, que ya aporta sus 64px medidos. Ahí los dos
        espacios se SUMAN y el titular queda flotando, que es lo que Jose reportó.

        Por eso el override es solo del relleno de ARRIBA: el de abajo se conserva, porque el
        espacio hacia "Por qué existe" sí es un espacio entre secciones y ya estaba bien.
      */}
      <div
        className={`mx-auto max-w-[1170px] px-6 lg:px-8 ${
          paddingSuperior ?? 'pt-20 md:pt-24 lg:pt-32'
        } ${paddingInferior ?? 'pb-20 md:pb-24 lg:pb-32'}`}
      >
        {children}
      </div>
    </section>
  );
}
