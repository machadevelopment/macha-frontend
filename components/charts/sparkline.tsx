/**
 * Sparkline del prototipo "MVP Macha": una polilínea sin ejes, sin cuadrícula y sin
 * relleno, en el color del texto al 55% de opacidad.
 *
 * SVG a mano y no `@tremor/react`: Tremor trae Recharts, que monta un contenedor
 * responsive y un ciclo de medición por gráfico. Para 80×32 píxeles dentro de una
 * tarjeta de KPI eso es un coste desproporcionado, y además obligaría a que la tarjeta
 * fuera un componente de cliente solo para dibujar seis puntos.
 *
 * No lleva color semántico a propósito. En este producto el color señala estado
 * financiero (design guide §1) y esa señal ya la da el delta con su flecha; pintar
 * además la línea de verde o rojo repetiría el mismo dato dos veces y le quitaría fuerza.
 */
export function Sparkline({
  data,
  /** Sistema de coordenadas del viewBox, NO píxeles: el ancho real lo decide el CSS. */
  width = 80,
  height = 32,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  // Con menos de dos puntos no hay línea que trazar — y `(i / (n - 1))` dividiría por 0.
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  // Una serie plana da rango 0: sin este guardo, todos los puntos caen en NaN y el SVG
  // se renderiza vacío. Con 1 la línea queda recta a media altura, que es lo correcto.
  const range = max - min || 1;

  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(' ');

  return (
    // `viewBox` + `preserveAspectRatio="none"` en vez de `width`/`height` fijos: así el
    // sparkline OCUPA el ancho que le den en vez de exigir 80px.
    //
    // El ancho fijo tenía un efecto que no se veía hasta que llegaron datos reales: dentro de
    // la tarjeta de KPI el sparkline era `shrink-0` al lado del valor, así que de un ancho de
    // ~148px útiles se llevaba 96 (80 + el gap) y al número le quedaban 52 para escribir
    // `GTQ 480,663.00`, que necesita ~192. El texto no se recortaba: se DESBORDABA y se
    // pintaba encima de la tarjeta vecina — el `86.1%` del margen quedaba tapado por el valor
    // de utilidad bruta. Visto en producción el 2026-08-07 con el filtro "Este año".
    //
    // Sin ancho por clase el SVG toma el del contenedor, que es el comportamiento que se
    // quiere: la tarjeta decide, no el componente.
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      // El tamaño lo pone el CSS, no atributos: quien lo usa le da el ancho con una clase
      // (`w-full` en la tarjeta de KPI) y `height` queda como alto fijo. `width` sobrevive solo
      // como sistema de coordenadas del viewBox — la relación entre puntos, no píxeles.
      height={height}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.25"
        // Obligatorio junto con `preserveAspectRatio="none"`: al estirar el viewBox de 80 a
        // ~240px el trazo se escalaría con él y la línea saldría gruesa en horizontal y fina
        // en vertical. Con esto mantiene 1.25px reales en cualquier ancho.
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
