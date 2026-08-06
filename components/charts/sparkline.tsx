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
    <svg width={width} height={height} className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
