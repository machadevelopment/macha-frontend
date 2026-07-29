/**
 * Nombre de la cookie que recuerda la empresa activa del org-switcher.
 *
 * Vive aquí y NO en `app/actions/set-active-company.ts` porque ese archivo lleva la
 * directiva `'use server'`, y Next.js prohíbe exportar de un módulo `"use server"`
 * cualquier cosa que no sea una función async — todo export se convierte en un
 * endpoint RPC invocable desde el cliente, y una constante no puede serlo. Exportarla
 * desde ahí rompía `next build` por completo (CU-868khttg2), aunque `typecheck`,
 * `lint` y `bun test` pasaran los tres en verde.
 *
 * Es solo el nombre de la cookie. La cookie en sí es una preferencia de UI, nunca una
 * concesión de autorización: el `X-Company-Id` que se construye con ella se valida
 * contra las membresías reales del usuario en `tenant.derive.ts` del backend, en cada
 * request (CLAUDE.md — `company_id` nunca se confía desde el cliente).
 *
 * Sin `import 'server-only'` a propósito: es una constante inerte y varias rutas la
 * consumen desde contextos distintos; marcarla server-only no aporta garantía real y
 * sí volvería a acoplar el módulo a un entorno concreto.
 */
export const ACTIVE_COMPANY_COOKIE = 'macha-company-id';
