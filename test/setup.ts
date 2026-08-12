/**
 * Preload de `bun test` (ver `bunfig.toml`). Registra un DOM antes de que se cargue
 * cualquier archivo de test.
 *
 * ## Por qué happy-dom y no jsdom, y por qué `bun test` y no Jest/Vitest
 *
 * CU-868kjbxwa criterio 3 exige verificar compatibilidad con Bun antes de agregar la
 * librería — CLAUDE.md: el runtime es Bun, nada Node-only.
 *
 *   - **El corredor sigue siendo `bun test`.** Jest y Vitest traerían su propio runtime,
 *     su propia transformación de TS/JSX y su propia configuración encima de la que ya
 *     existe, para correr los mismos archivos. No hay nada que necesitemos que `bun test`
 *     no haga: tiene `mock.module`, `test.each` y ejecuta TSX sin configurar nada.
 *   - **happy-dom** se registra sobre los globales de Bun (`GlobalRegistrator`) en vez de
 *     emular un entorno Node completo. jsdom depende de módulos nativos de Node y es el
 *     tipo de dependencia que esta regla existe para evitar.
 *   - `@testing-library/react` es agnóstico del corredor: solo necesita `document` y
 *     `react-dom/client`, los dos presentes acá.
 *
 * El registro es global (preload) y no por archivo porque `screen` de testing-library se
 * enlaza a `document.body` **al importarse**: si el DOM aparece después, `screen` ya quedó
 * atado a la nada. Los tests de rutas BFF conviven con esto sin problema — reemplazan
 * `globalThis.fetch` por su propio espía y no tocan el DOM.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();
