# macha-frontend

Customer app + admin backoffice for **Macha Finance** — Next.js (App Router) + Tailwind +
shadcn/ui (Radix) + Tremor Raw. Design tokens are the source of truth (`../docs/design guide.md`);
never hardcode hex. See `CLAUDE.md` for the non-negotiable rules and `flux.md` for the git flow.

## Getting started
```bash
bun install
cp .env.example .env
bun run dev
```

## Environment variables

Secrets live only in platform-native envs (Vercel) or a local untracked `.env` —
never committed (`.gitignore` blocks `.env*` except `.env.example`). **Non-prod
credentials are fully separate values from prod** for every external service below;
staging/preview never point at prod WorkOS or Sentry, so an incident in staging
can't touch prod auth or pollute prod error tracking. See `.env.example` for the
full list; summary:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | No (has default) | Display name. |
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of `macha-backend` (Railway). |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Yes | AuthKit hosted UI callback. |
| `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` | Yes | AuthKit session verification — no login/password UI of our own. |
| `NEXT_PUBLIC_SENTRY_DSN` | Prod/staging | Client-side error capture. No-op without it. |
| `SENTRY_DSN` | Prod/staging | Server/edge error capture (`instrumentation.ts`). No-op without it. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Prod/staging | Solo build time: sin el token los stack traces llegan minificados (el build sigue verde). |
| `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | No (se deducen) | Etiqueta del entorno. Por omisión `VERCEL_ENV` / `NEXT_PUBLIC_VERCEL_ENV`. |

## Observabilidad (Sentry) — runbook de despliegue (CU-868kmr1tb)

El cableado está completo desde CU-868kjc99f (`withSentryConfig` + `instrumentationHook`
+ los tres `Sentry.init`) y es **no-op sin DSN** a propósito. Lo que falta es
**configuración de plataforma**, y no puede hacerla el repo.

> **Estado según la auditoría de producción del 2026-08-05:** en `macha6/macha-finance`
> no están configuradas ni `SENTRY_DSN` ni `NEXT_PUBLIC_SENTRY_DSN`. Producción sirve a un
> cliente real sin captura de errores de navegador ni de servidor.
> *(No revalidado el 2026-08-12: el CLI de Vercel de esta máquina está autenticado en una
> cuenta personal sin acceso al equipo — ver la nota de cuentas de despliegue. Confirmar
> desde la consola antes de dar el paso 1 por hecho.)*

Pasos, en orden. **Los ejecuta el dueño** — requieren cuenta de Sentry y acceso al
proyecto de Vercel:

1. **Crear DOS proyectos en Sentry**, uno por entorno (regla no negociable de credenciales
   de no-prod separadas). Plataforma **Next.js**. Nombres sugeridos:
   `macha-frontend-prod` y `macha-frontend-staging`. Son distintos de los del backend:
   cuatro proyectos en total, dos repos × dos entornos.
2. **Copiar el DSN de cada uno**: *Settings → Projects → `<proyecto>` → Client Keys (DSN)*.
3. **Crear un auth token de subida de source maps**: *Settings → Auth Tokens* (o
   *Organization → Developer Settings*), con alcance `project:releases`. Es un token de
   **escritura**: va en Vercel, jamás en el repo ni en `.env.local`.
4. **Setear las variables en Vercel** (`macha6/macha-finance` → *Settings → Environment
   Variables*), **marcando el entorno de cada una** — este es el paso donde se pierde la
   separación si se marca "todos los entornos":

   | Variable | Entorno de Vercel | Valor |
   |---|---|---|
   | `NEXT_PUBLIC_SENTRY_DSN` | Production | DSN de `macha-frontend-prod` |
   | `SENTRY_DSN` | Production | el mismo DSN |
   | `SENTRY_ORG` | Production (+ Preview) | slug de la organización en Sentry |
   | `SENTRY_PROJECT` | Production | `macha-frontend-prod` |
   | `SENTRY_AUTH_TOKEN` | Production (+ Preview) | el token del paso 3 |

   Las dos variantes del DSN son necesarias: `NEXT_PUBLIC_*` es la única que llega al
   navegador, la otra es la que ven Server Components, route handlers y el middleware.
   Para el entorno *Preview* se usa el DSN y el `SENTRY_PROJECT` de **staging**, nunca los
   de producción.
5. **Redesplegar.** Las variables se leen en build (las `NEXT_PUBLIC_*` quedan incrustadas
   en el bundle), así que un cambio de variable **no** aplica al deploy ya publicado.
6. **Verificar**: en el build log, que el plugin diga que subió los source maps; en la app,
   provocar un error de render y confirmar que llega con `environment: production` y stack
   trace legible (no `page-4f2a9c.js:1:28471`). Si falta `SENTRY_DSN`, los Runtime Logs de
   Vercel muestran el aviso `[sentry] SIN MONITOREO DE ERRORES: ...`.

> **Por qué el `environment` no sale de `NODE_ENV`** (CU-868kmr1tb): en Vercel un deploy de
> preview compila con `NODE_ENV=production` igual que el de verdad. Etiquetando por
> `NODE_ENV`, cada PR abierto habría mandado eventos marcados `production` al tablero del
> cliente. Se resuelve con `VERCEL_ENV` / `NEXT_PUBLIC_VERCEL_ENV` en
> `lib/sentry-environment.ts`, y hay tests que lo fijan.

## Layout
```
app/
  (app)/          # customer app
  admin/          # backoffice (role-gated, inverse orgbar surface)
  layout.tsx      # fonts + ThemeProvider
components/
  ui/             # shadcn/ui (to add)
  charts/         # Tremor Raw (to add)
  theme-provider.tsx
lib/
  fonts.ts        # Inter + JetBrains Mono (next/font)
  format/         # formatMoney/formatDate/formatPct (locale-aware, explicit currency)
  i18n/           # es-GT / en-US
  cn.ts
styles/globals.css  # two-layer tokens, full light + dark
tailwind.config.ts  # exact token set (design guide §11.3)
```

## Estado (auditoría 2026-07-28)

F1–F7 + M8 implementados y mergeados a `main` (staging). `typecheck`/`lint`/`test`
verdes. Dashboard, upload, chat, reportes, registro autoservicio, compra de créditos
y panel admin son pantallas reales, no esqueletos.

**Deuda conocida y verificada** (cada una con ticket en ClickUp, lista MACHA FINANCE
2.0):

- **i18n incompleto en UI de cliente**: varios textos están hardcodeados en español
  aunque el diccionario ES/EN tiene paridad completa (93 claves) — cabeceras de tabla
  en `report-list`/`document-list`, los KPI de `report-detail` ("Ingresos", "Costo de
  ventas", "Margen"), las tablas `sr-only` de los charts y los `aria-label="Cerrar"`
  de `dialog`/`sheet`. Un cliente con `locale='en'` ve español en esos puntos.
- **Moneda hardcodeada**: `report-detail.tsx` fija `'GTQ'` en vez de leer la moneda
  base de la empresa (el dashboard sí la lee bien de `/metrics`). Rompe la regla
  "moneda base por empresa" para empresas en USD.
- **Deep-link de chat con id equivocado**: `report-detail.tsx` manda el `reportId`
  como `reportVersionId` al crear el hilo; no hay FK, así que se guarda silenciosamente
  una referencia incorrecta.
- **`/admin/*` no tiene gate a nivel de ruta**: cualquier usuario autenticado renderiza
  el shell del panel; solo las llamadas a la API devuelven 403. El dato está protegido,
  la superficie no.
- **Panel admin sin i18n**: todos sus textos están hardcodeados en español (decisión no
  documentada — puede ser aceptable para staff interno, pero hay que decidirlo
  explícitamente).
- **Listados sin paginar**: `companies-panel`, `report-list` y `document-list` traen
  todo de una vez (`staging-rows` y `documents` del admin sí pagina desde CU-868kfvaz9).
