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
