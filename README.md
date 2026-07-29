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
