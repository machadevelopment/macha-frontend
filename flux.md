# flux.md — Macha Finance

Contrato de trabajo entre **Kenneth Ruiz** (dueño/desarrollador) ⇄ **agente ejecutor**, con **Semi** (CTO, U3 TECH) como revisor/merger y **Jose Bustamante** como aprobador/PM en los frenos. Define quién hace qué, en qué orden, con qué estados de ClickUp, con qué modelo de ramas y dónde están los puntos de aprobación. **Fecha de acuerdo: 2026-07-24.** Si el flujo cambia, actualiza este archivo antes de operar bajo las nuevas reglas.

---

## REGLA CERO

Gana sobre todo lo demás. Ante conflicto con cualquier otra sección, obedece esta.

- **NO** mergees a `main` en ningún repo. Abre PR y espera aprobación de Semi.
- **NO** promuevas a producción. La promoción a prod es un paso manual y explícito del dueño.
- **NO** ejecutes trabajo sin plan aprobado.
- **NO** muevas tareas a `completed` ni `complete`. Esos estados son del dueño tras aceptación.
- **NO** agregues dependencias/SDK sin verificar compatibilidad con Bun.
- **NO** afirmes que "pasan los tests" si no existe test que cubra lo tocado.

Recuerda: las migraciones de schema **auto-aplican en deploy**. Un merge a `main` toca la base de STAGING. Por eso el agente **no mergea solo**.

---

## 1. Lo esencial en diez líneas

1. El dueño da una orden (ejecutar épica / tarea / retomar backlog).
2. El agente lee el contexto obligatorio (§10) del repo que toca.
3. El agente presenta un plan. **[FRENO 1]** No avanza sin aprobación del dueño.
4. Aprobado el plan, mueve la tarea `backlog → to do → in progress` y crea la rama `feat/*` (§6).
5. Implementa en commits atómicos con formato `type(scope): resumen [CU-<id>]` (§7).
6. Corre la red de seguridad: `bun run typecheck`, `bun run lint`, `bun test` en el repo tocado.
7. Verifica criterios de aceptación + la regla no negociable aplicable (§10). Autochequeo (§5).
8. Abre PR contra `main` y mueve la tarea a `in review`. **[FRENO 2]** Revisión y merge de Semi.
9. Semi mergea → deploy automático a STAGING. El agente NO mergea.
10. Promoción a PRODUCCIÓN: paso manual del dueño. **[FRENO 3 · PROD/⛔]** El agente nunca la ejecuta.

---

## 2. Actores

| Actor | Qué hace | Qué NO hace |
|---|---|---|
| **Kenneth Ruiz** (dueño/dev · ClickUp `87312126`) | Da órdenes, aprueba planes **[FRENO 1]**, ejecuta la promoción a producción **[FRENO 3]**, acepta tareas y mueve `completed`/`complete`. | No delega la promoción a prod ni la aceptación final. |
| **Agente ejecutor** | Lee contexto, planifica, implementa, commitea, corre typecheck/lint/test, abre PR, mueve estados hasta `in review`, marca `blocked` con causa. | No mergea a `main`. No promueve a prod. No ejecuta sin plan aprobado. No toca `completed`/`complete`. No afirma tests inexistentes. |
| **Semi** (CTO/revisor · ClickUp `75558139`) | Revisa el PR **[FRENO 2]**, aprueba cambios de librerías/proveedores/patrones base, mergea a `main`. | No es quien promueve a prod (eso es del dueño). |
| **Jose Bustamante** (PM/aprobador · ClickUp `81399431`) | Aprueba alcance/prioridad en los frenos, coordina insumos del cliente. | No revisa código ni mergea. |

---

## 3. Tablero de ClickUp

| Campo | Valor |
|---|---|
| Workspace | `9011309867` |
| Espacio | Shared with me (`90111392363`) |
| Lista | **MACHA FINANCE 2.0** — ID `901114202196` |
| URL | https://app.clickup.com/9011309867/v/l/li/901114202196 |

**Filtro cross-repo por tag de capa.** La lista cubre ambos repos. Identifica el repo por el tag principal de la tarea:

- `frontend` → **macha-frontend** (Vercel).
- `backend` / `infra` → **macha-backend** (Railway). `infra` puede tocar ambos repos.
- `qa` / `calidad` → transversales; el repo se deduce del sistema que valida la tarea.

### Diagrama de estados

```
[backlog] --> [to do] --> [in progress] --> [in review] --> ((completed)) --> ((complete))
    |            |             |                 |                 ^                ^
    |            |             +--> [blocked] ---+                 |                |
    |            |                    |                            |                |
    |            +--------------------+                    DUEÑO tras          DUEÑO cierre
    +--- el agente mueve hasta aquí --^                    aceptación          administrativo
```

| Estado | Quién lo pone | Significa |
|---|---|---|
| `backlog` | Agente / creación | Tarea creada, sin arrancar. Estado de nacimiento. |
| `to do` | Agente | Plan aprobado; lista para ejecutar. |
| `in progress` | Agente | En implementación activa. |
| `in review` | Agente | PR abierto contra `main`; esperando revisión de Semi. |
| `blocked` | Agente | Bloqueada; comentario con causa + desbloqueo + a quién se avisa (§8). |
| `completed` (done) | **Dueño** | Aceptada por el dueño tras verificación. **El agente NO la toca.** |
| `complete` (closed) | **Dueño** | Cierre administrativo. **El agente NO la toca.** |

---

## 4. Sistemas y asignación

| Sistema | Qué cubre | Repo | Tag de capa | Responsable (ClickUp · user ID) |
|---|---|---|---|---|
| **frontend** | UI cliente, pantallas, componentes, navegación, i18n de interfaz, design system | macha-frontend | `frontend` | Kenneth Ruiz · `87312126` |
| **admin** | Panel `/admin/*` role-gated (staff/super_admin) dentro del frontend | macha-frontend | `frontend` (backend en su API) | Kenneth Ruiz · `87312126` |
| **backend** | API Elysia, lógica de negocio, Drizzle/SQL, jobs pg-boss, integraciones server-side (WorkOS, Anthropic, S3, Resend, Recurrente) | macha-backend | `backend` | Kenneth Ruiz · `87312126` |
| **infra** | Vercel, Railway, Postgres, Redis, S3, CI/CD, migraciones de despliegue, backups | ambos | `infra` | Kenneth Ruiz · `87312126` |

Revisión/merge: **Semi** (`75558139`) en todos los sistemas. Aprobación de alcance/prioridad: **Jose Bustamante** (`81399431`).

### Reglas de tagging (un solo tag principal por tarea)

- UI, pantallas, componentes, navegación, UX, design system, i18n de interfaz → **`frontend`**.
- API Elysia, servicios, lógica de negocio, Drizzle/SQL, jobs, integraciones server-side → **`backend`**.
- Provisión de infra, deploy, envs, Redis/S3, Dockerfile, CI/CD, migraciones de despliegue, backups → **`infra`**.
- Validación funcional, regresión, pruebas de acceso cruzado entre empresas → **`qa`**.
- Lint, typecheck, code review, hardening, performance, accesibilidad, seguridad técnica → **`calidad`**.

**Un solo tag principal.** Si una tarea cruza capas, divídela en tareas separadas; no mezcles tags.

---

## 5. El ciclo, paso a paso

```
 DUEÑO: "ejecuta <épica|tarea>"
        |
        v
 [Agente] lee contexto obligatorio (§10) del repo que toca
        |
        v
 [Agente] presenta PLAN  ------------------------------------> [FRENO 1] Aprobación del dueño
        |                                                            | (sin OK: no avanza)
        v <----------------------------- OK -------------------------+
 [Agente] mueve tarea: backlog -> to do -> in progress
        |
        v
 [Agente] crea rama feat/<sistema>-<slug>-CU<idTarea>
        |
        v
 [Agente] implementa en commits atómicos  ->  type(scope): resumen [CU-<id>]
        |
        v
 [Agente] typecheck + lint + test (bun) en el repo tocado
        |
        +--- ¿falla / falta insumo / dependencia? --> [blocked] + comentario (§8) + aviso mismo día
        |
        v
 [Agente] autochequeo (abajo)  ->  abre PR contra main  ->  mueve tarea a in review
        |
        v
 [FRENO 2] Semi revisa y MERGEA  ->  deploy automático a STAGING   (el agente NO mergea)
        |
        v
 [FRENO 3 · PROD/⛔] Promoción a PRODUCCIÓN = paso MANUAL del dueño (el agente NUNCA la ejecuta)
        |
        v
 DUEÑO acepta  ->  mueve tarea a completed / complete
```

### Checklist de autorrevisión (antes de mover a `in review`)

- [ ] `bun run typecheck` verde en el repo tocado.
- [ ] `bun run lint` verde en el repo tocado.
- [ ] `bun test` verde **si existe** test que cubra lo tocado; si no existe, decláralo explícito (no finjas cobertura).
- [ ] Criterios de aceptación de la tarea cumplidos, uno por uno.
- [ ] Regla no negociable aplicable verificada (§10): p. ej. `company_id` del JWT, RLS activo, ledger append-only, dinero en `numeric`, webhook idempotente, `ai_usage_events` por llamada.
- [ ] Traza en ClickUp: estado actualizado y commits referencian `[CU-<id>]`.

---

## 6. Ramas y deploy

```
 feat/<sistema>-<slug>-CU<idTarea>
        |
        |  push + PR
        v
   [ PR ] --> preview efímero (Vercel por PR / entorno de preview)
        |
        |  [FRENO 2] revisión + merge de Semi
        v
      main  --> deploy AUTOMÁTICO a STAGING (migraciones de schema auto-aplican)
        |
        |  [FRENO 3 · PROD/⛔] promoción MANUAL y explícita del dueño
        v
   PRODUCCIÓN
```

Modelo: **trunk-based sobre `main`**. Sin `develop`. Una rama `feat/*` por tarea.
Nombre de rama: `feat/<sistema>-<slug>-CU<idTarea>` — ej. `feat/backend-tenant-guard-CU868kfva5w`.

| Acción | ¿Despliega? | ¿Permitido / quién? |
|---|---|---|
| Push a `feat/*` + abrir PR | Sí → **preview efímero** | Sí, el agente. |
| Merge de PR a `main` | Sí → **STAGING** (auto) | **Solo Semi.** El agente NO mergea. [FRENO 2] |
| Ejecutar migración de schema | Sí, en el deploy del merge | Indirecto vía merge de Semi; el agente no fuerza deploy. |
| Correr migración de datos/seed | No (script manual) | Ejecución manual y separada; nunca mezclada con schema. |
| **Promoción a PRODUCCIÓN** | **Sí → PROD** | **Solo el dueño, manual y explícito.** [PROD/⛔] El agente NUNCA. |

---

## 7. Commits

Formato exacto (idioma: **español**):

```
type(scope): resumen en imperativo [CU-<idTarea>]
```

Ejemplo: `feat(auth): agrega guard de tenant-scoping por company_id [CU-868kfva5w]`

- **type** válidos: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`.
- **scope** válidos (sistema/módulo): `auth`, `ingesta`, `dashboard`, `chat`, `reportes`, `alertas`, `admin`, `creditos`, `infra`, `db`, `ui`.
- **Granularidad:** 1 tarea = 1 o más commits atómicos. Un commit **nunca** mezcla dos tareas.

Reglas duras:

- **Nunca `git add -A`.** Añade solo los archivos de la tarea, explícitos.
- Verificación limpia (`typecheck` + `lint` verdes) **antes** de commitear.
- Todo commit referencia su `[CU-<id>]` de ClickUp.

---

## 8. Bloqueos

Una tarea va a **`blocked`** cuando: falta un insumo del cliente (correo `development@machafinance.com`, cuenta corporativa de Anthropic / contrato ZDR, Excel de muestra, Figma de la landing, industrias objetivo), faltan credenciales de servicio, hay una decisión de negocio abierta, o depende de otra tarea sin terminar.

El agente **puede marcar `blocked` por su cuenta** (no pregunta antes), pero:

- Deja un comentario en la tarea con este formato:

  ```
  BLOQUEO
  Causa: <qué falta exactamente>
  Desbloquea: <qué evento/insumo/decisión la libera>
  Avisado a: <Kenneth / Jose / Semi según corresponda> — <fecha>
  ```

- Avisa **el mismo día**. Los bloqueos silenciosos están prohibidos.
- **Se salta la subtarea bloqueada** y continúa con lo desbloqueado de la épica. **No aborta la épica completa.**

---

## 9. Generación de tareas

Las 80 tareas del backlog **ya existen** en `backlog` en la lista MACHA FINANCE 2.0 (`901114202196`). **Este flujo las EJECUTA, no las recrea.**

Al reanudar, filtra por estado y tag; no dupliques.

Si hay que crear una tarea nueva:

- **Lista destino:** `901114202196` (misma lista).
- **Estado inicial:** `backlog`.
- **Orden de construcción:** respeta las fases F1→F7 del PRD (fundaciones → datos → auth → design system → ingesta → dashboard → chat → reportes/alertas → admin → landing → observabilidad/calidad).
- **Estructura de cada tarea:** nombre con prefijo de épica, un solo tag principal, descripción, objetivo, ≥3 criterios de aceptación (con la regla no negociable aplicable), subtareas accionables, dependencias, prioridad y notas técnicas citando la sección del PRD/ADR.
- **Creación secuencial:** crea la épica → obtén su ID → agrega subtareas/dependencias con ese ID.
- **Reanudación sin duplicar:** antes de crear, verifica por nombre exacto que no exista ya en la lista.

---

## 10. Contexto obligatorio y trampas conocidas

### Archivos a leer antes de ejecutar cualquier tarea

| Archivo | Qué aporta |
|---|---|
| `CLAUDE.md` del repo que toca | Constraints y convenciones que NO se infieren del código. |
| `PRD.md` (Brief Técnico) | Especificación por módulo, reglas no negociables, plan de trabajo, criterios de aceptación. |
| `data model.md` | Entidades, taxonomía, particionado, índices, reglas del modelo. |
| `design guide.md` | Tokens, densidades, regla mono, formatters, color como señal. |
| `docs/map.md` | Mapa de decisiones de arquitectura y su justificación. |
| `docs/architecture-report.md` | Detalle consolidado de arquitectura por módulo. |

### TRAMPAS CONOCIDAS (imperativo — no las redescubras)

- **Usa BUN, no Node.** Verifica compatibilidad Bun antes de agregar cualquier dependencia/SDK. Nada Node-only.
- **Usa DRIZZLE, nunca Prisma.** `drizzle-kit` **NO** genera `PARTITION OF`, RLS, índices parciales/de expresión ni `REVOKE UPDATE,DELETE`: escríbelos como **SQL crudo dentro de las migraciones**. Crea las particiones por empresa **al aprovisionar la empresa**, no en una migración global.
- **Inyecta `company_id` siempre server-side** desde el JWT verificado (guard/derive de Elysia). Nunca del cliente ni del modelo de IA.
- **Usa FKs cross-tenant compuestas** (incluyen `company_id`) y **PK compuesta `(company_id, id)`** en tablas particionadas.
- **Trata los ledgers como append-only** (`ai_usage_events`, `credit_transactions`, `admin_audit_log`, `report_versions`, `industry_template_versions`): solo INSERT; aplica `REVOKE UPDATE,DELETE`. Las correcciones son **filas compensatorias**.
- **Guarda dinero en `numeric`, nunca float.** Persiste monto+moneda originales y `amount_base` + snapshot de FX por fila.
- **Registra cada llamada a Claude** como 1 fila en `ai_usage_events` con su `kind`. `insight` debita créditos; `excel_correction` **no** debita.
- **Mantén la selección de modelo de IA en configuración, nunca en el código.** Revalida ZDR ante cualquier cambio de modelo.
- **Haz los webhooks de Recurrente idempotentes:** un webhook repetido nunca duplica créditos ni cobros.
- **Separa migraciones de schema (auto-aplican en deploy) de las de datos/seed (scripts manuales aparte).** Nunca las mezcles.
- **Separa totalmente las credenciales de no-prod** (WorkOS, Anthropic, S3, Redis, Recurrente). Staging solo con datos sintéticos.
- **Guarda binarios en S3; la DB guarda solo keys** (presigned URLs cortas, keys prefijadas por `company_id`).
- **Valida en backend con TypeBox de Elysia** (no zod por defecto). La auth UI es **WorkOS AuthKit** (no login/password propio).
- **En frontend:** los tokens de diseño son la fuente de verdad (light+dark) — no hardcodees hex; **Tremor Raw** para charts/KPIs y **shadcn/ui** para el resto (no los mezcles); regla mono (**JetBrains Mono** para números/IDs, **Inter** para el resto); formatters centralizados locale-aware; **nada de `localStorage`/`sessionStorage`** en prototipos.

---

## 11. Principios

- **Puntos de aprobación inequívocos:** [FRENO 1] plan aprobado antes de ejecutar · [FRENO 2] revisión de Semi antes de merge · [FRENO 3 · PROD/⛔] promoción a producción manual del dueño.
- **Honestidad en el reporte:** no afirmes lo que no verificaste; no declares "pasan los tests" cuando no hay tests que cubran lo tocado; reporta lo que corriste y su resultado real.
- **Trazabilidad en ClickUp, no en la conversación:** el estado, los comentarios y los commits `[CU-<id>]` son la fuente de verdad del progreso.
- **El código manda sobre la documentación:** ante discrepancia, corrige el código o la doc, no la ignores; si la doc de proceso cambia, actualiza este `flux.md`.
- **Los bloqueos se comunican el mismo día.** Un bloqueo silencioso de dos días cuesta más que el bloqueo mismo.

---

## 12. Comandos especiales

El dueño invoca estos comandos en lenguaje natural; el agente ejecuta la acción indicada respetando los frenos.

| Comando | Acción del agente |
|---|---|
| `ejecuta épica <fase|nombre>` | Lee contexto (§10), presenta plan de la épica **[FRENO 1]**; tras OK, ejecuta sus tareas en orden de dependencias, saltando bloqueadas (§8). |
| `ejecuta tarea <CU-<id>>` | Lee contexto, presenta plan de esa tarea **[FRENO 1]**; tras OK, implementa, verifica y abre PR (`in review`). |
| `verifica tarea <CU-<id>>` | Corre typecheck/lint/test del repo tocado y el checklist (§5); reporta resultado real sin mover a `completed`. |
| `retoma backlog` | Filtra la lista `901114202196`, identifica la siguiente tarea desbloqueada por orden de fase/dependencia y propone plan **[FRENO 1]**. |
| `marca bloqueo <CU-<id>>` | Mueve la tarea a `blocked`, escribe el comentario de bloqueo (§8) y avisa el mismo día. |
| `abre PR <CU-<id>>` | Abre PR contra `main` desde la rama `feat/*`, mueve a `in review` y notifica a Semi **[FRENO 2]**. No mergea. |
