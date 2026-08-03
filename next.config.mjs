import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // CU-868kjc99f. **Sin esta bandera, `instrumentation.ts` NUNCA se ejecuta.**
    //
    // En Next 14 el instrumentation hook todavía es experimental y viene apagado por
    // defecto (`node_modules/next/dist/server/config-shared.js`: `instrumentationHook:
    // false`), y `next-server.js` gatea la llamada a `register()` contra ella. Como el
    // repo nunca la activó, los dos `Sentry.init` de servidor —`sentry.server.config.ts`
    // y `sentry.edge.config.ts`— jamás corrieron: no era que llegaran stack traces
    // minificados, es que no llegaba nada, desde ninguna de las tres runtimes.
    //
    // En Next 15 el hook es estable y la bandera desaparece; al subir de versión hay que
    // borrarla (si se queda, deja un warning en cada build).
    instrumentationHook: true,
  },
};

/**
 * CU-868kjc99f: `withSentryConfig` es el plugin de build de `@sentry/nextjs`, y es lo
 * que hace que la observabilidad del frontend exista de verdad. Hace tres cosas que el
 * SDK por sí solo no puede hacer:
 *
 *  1. **Sube los source maps.** Sin esto un error de cliente llega apuntando a
 *     `page-4f2a9c.js:1:28471`, inservible para depurar.
 *  2. **Inyecta `instrumentation-client.ts` en el entry de webpack del cliente.** Esto
 *     es imprescindible acá, no un extra: `instrumentation-client.ts` es una convención
 *     de **Next 15.3+** y este proyecto corre Next 14 — Next no conoce el archivo y no
 *     lo carga jamás. Quien lo mete al bundle es el plugin de Sentry
 *     (`getInstrumentationClientFile` + `addFilesToWebpackEntryPoint` en
 *     `config/webpack.js`), no el framework. Sin el wrapper, el init del navegador es
 *     código muerto.
 *  3. Instrumenta automáticamente rutas y el router de Next en build.
 *
 * Degrada solo (criterio 5): sin `SENTRY_AUTH_TOKEN` el plugin omite la subida de mapas
 * y sigue construyendo. Por eso CI corre `bun run build` sin secretos y el gate no se
 * cae en cada PR.
 */
export default withSentryConfig(nextConfig, {
  // Identidad del proyecto en Sentry. Fuera del repo y por entorno (criterio 2, regla no
  // negociable de credenciales separadas): staging y prod apuntan a proyectos distintos.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sin token no hay nada que subir y el plugin lo anuncia en cada build; en CI eso es
  // ruido esperado, no una señal. Donde sí hay token (Vercel) conviene ver el resultado.
  silent: !process.env.SENTRY_AUTH_TOKEN,

  sourcemaps: {
    // Criterio 1. Sustituye a `hideSourceMaps`, que ya no existe en v10: en vez de
    // servirlos ocultos, los BORRA del output después de subirlos, así que no quedan
    // accesibles en el dominio público. En un producto financiero un source map es el
    // código fuente completo del cliente. Es el default del SDK — va explícito porque es
    // una decisión de seguridad, no un detalle que convenga heredar en silencio.
    deleteSourcemapsAfterUpload: true,
  },

  // Criterio 4. Los eventos salen por nuestro propio dominio en vez de ir directo a
  // ingest.sentry.io, que los bloqueadores filtran por defecto.
  //
  // Ruta FIJA y no `true` (que generaría una aleatoria por build) a propósito: hay que
  // excluirla del matcher de `middleware.ts`, y no se puede excluir lo que cambia de
  // nombre en cada deploy. Sin esa exclusión el authkitProxy exigiría sesión para el
  // túnel y los errores de la pantalla pública de login nunca se reportarían.
  tunnelRoute: '/monitoring',

  // Sube también los mapas de los chunks que Next sirve fuera de `/_next/static/chunks`;
  // sin esto parte de las stack traces del App Router queda sin resolver.
  widenClientFileUpload: true,
});
