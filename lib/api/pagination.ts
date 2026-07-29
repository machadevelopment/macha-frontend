import 'server-only';

/**
 * CU-868kh913c: reenvía `limit`/`offset` de una request BFF hacia macha-backend.
 *
 * Sin esto, las rutas BFF descartan los parámetros y el "load more" del cliente
 * quedaría pidiendo siempre la primera página. Solo se reenvían estas dos llaves —
 * nunca la query entera — para que un parámetro inesperado del cliente no llegue al
 * backend por accidente.
 *
 * Los valores no se validan aquí a propósito: el backend ya acota `limit` (techo 200)
 * y normaliza `offset`, y duplicar esa validación en el BFF crearía dos fuentes de
 * verdad que se desincronizan.
 */
export function paginationSuffix(request: Request): string {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ['limit', 'offset'] as const) {
    const value = searchParams.get(key);
    if (value) qs.set(key, value);
  }
  return qs.size > 0 ? `?${qs}` : '';
}
