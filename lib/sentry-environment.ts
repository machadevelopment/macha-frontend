/**
 * CU-868kmr1tb — de dónde sale el `environment` que Sentry pone en cada evento.
 *
 * **`NODE_ENV` no sirve para esto en Vercel.** Un deploy de preview se construye igual
 * que producción: `NODE_ENV === 'production'` en los dos. Sin un `environment` explícito,
 * cada PR abierto habría estado disparando eventos etiquetados `production` al mismo
 * tablero que el cliente real — que es peor que no tener monitoreo, porque el ruido
 * entierra los errores de verdad y deja la sensación de estar mirando.
 *
 * Quien distingue los tres casos es `VERCEL_ENV` (`production` / `preview` /
 * `development`), que la plataforma inyecta sola.
 *
 * La función es **pura y recibe los valores** en vez de leer `process.env` adentro: en el
 * cliente, Next solo sustituye las referencias literales `process.env.NEXT_PUBLIC_*` del
 * código fuente en tiempo de build. Leídas dentro de un helper importado no se
 * reemplazarían por nada y el navegador vería `undefined`.
 */
export function resolveSentryEnvironment(
  explicit: string | undefined,
  vercelEnv: string | undefined,
  nodeEnv: string | undefined,
): string {
  // `||` y no `??`: una variable presente pero VACÍA es el estado normal cuando se
  // guarda la clave sin valor en la UI de Vercel, y `''` no es un nombre de entorno.
  return explicit || vercelEnv || nodeEnv || 'development';
}
