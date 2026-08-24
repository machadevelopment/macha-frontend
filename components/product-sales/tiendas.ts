import type { StoreBreakdownResponse } from '@/lib/api/dashboard';

/**
 * En qué estado está la tarjeta de "Ventas por tienda" (CU-868kuw1e3).
 *
 * Vive fuera del componente porque es lo ÚNICO de esta tarjeta que puede estar mal sin que
 * nada se vea roto: los tres estados se pintan igual de bien, y elegir el equivocado
 * produce una pantalla correcta que dice una mentira.
 *
 * `rows` vacío significa dos cosas distintas y hay que separarlas:
 *
 *   · `sin-columna` — la empresa VENDIÓ y ninguna venta trae tienda. Es el caso normal: la
 *     mayoría de los Excel de una PYME no traen esa columna. Es un hueco que el dueño puede
 *     cerrar solo, así que la tarjeta le dice cómo.
 *   · `sin-ventas` — no hubo ventas en el período. No hay nada que agregar a ningún archivo.
 *
 * Con un solo mensaje para los dos, el dueño que SÍ tiene sucursales abre un lunes sin ventas,
 * lee "tus ventas no traen tienda" y concluye que el producto no las soporta.
 *
 * `unattributedTotal` es lo único que los separa, y por eso el backend lo manda siempre,
 * también en cero.
 */
export type EstadoDeTiendas = 'ranking' | 'sin-columna' | 'sin-ventas';

export function estadoDeTiendas(data: StoreBreakdownResponse): EstadoDeTiendas {
  if (data.rows.length > 0) return 'ranking';
  return data.unattributedTotal > 0 ? 'sin-columna' : 'sin-ventas';
}
