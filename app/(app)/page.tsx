import { getSignInUrl, signOut } from '@workos-inc/authkit-nextjs';
import { getOptionalSession } from '@/lib/auth/session';

// Customer app entry (placeholder). Real dashboard lands in F2+.
// `/` is the one unauthenticated path (middleware.ts) — it's both the landing
// page and the hosted-login entry point (CU-868kfva59). No custom form: 100%
// hosted UI, per CLAUDE.md ("app verifies session, it does not implement
// login/password/email-verification").
// Density: dashboards/tables use data-density="compact".
export default async function Home() {
  const { user } = await getOptionalSession();

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[26px]">
      <p className="font-mono text-eyebrow uppercase text-faint">MACHA FINANCE</p>
      <h1 className="text-h1">Fundaciones F1</h1>
      <p className="text-body text-muted-foreground">
        Scaffolding listo: tokens de diseño, tipografía Inter/JetBrains Mono y temas claro/oscuro.
      </p>

      {user ? (
        <form
          action={async () => {
            'use server';
            await signOut({ returnTo: '/' });
          }}
        >
          <p className="font-mono text-body">{user.email}</p>
          <button type="submit" className="text-body underline">
            Cerrar sesión
          </button>
        </form>
      ) : (
        <a href={await getSignInUrl()} className="text-body underline">
          Iniciar sesión
        </a>
      )}
    </main>
  );
}
