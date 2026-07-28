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

## F1 status
Foundations only: tokens, tailwind config, fonts, theming, format/i18n helpers and
route skeletons. Components (shadcn/Tremor) and real screens land in F2+.
Not yet compiled against the npm registry in this environment.
