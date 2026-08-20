/**
 * CU-868ktkq8r — "al aceptar la invitación sigue tirando a login normal y no hay una
 * opción de unirse a una empresa; el usuario invitado no debería crear una empresa".
 *
 * Lo que se protege acá son las dos mitades del arreglo, y ninguna se rompe de forma
 * ruidosa si alguien la deshace:
 *
 *   · el PANEL ya no depende de que la URL traiga `?token=`. Si vuelve a depender, el
 *     invitado que perdió la query en el viaje por AuthKit se queda otra vez sin ninguna
 *     puerta que no sea crear una empresa propia — y eso compila, pasa lint y se ve bien
 *     en la pantalla feliz, que es exactamente por qué llegó a producción;
 *   · el CAMINO no vuelve a mandar a nadie al alta. Son tres decisiones repartidas en
 *     tres archivos (la ruta fuera de `(app)`, la ruta pública en el middleware, el CTA
 *     de invitación antes del de registro en `/`) y las tres se pueden revertir una por
 *     una sin que nada más falle.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let ultimaPeticion: { url: string; body: unknown } | null = null;
let respuesta: { ok: boolean; error?: { kind: 'http'; status: number; body?: unknown } } = {
  ok: true,
};

/*
 * ═══ EL DOBLE REEXPORTA EL MÓDULO REAL, Y NO ES OPCIONAL ═══
 *
 * `mock.module` de Bun es GLOBAL AL PROCESO, no al archivo: una vez que este test corre,
 * TODOS los demás ven este doble. Sin `...real`, el módulo pasa a exponer únicamente
 * `requestJson` y `errorMessage` — y cualquier test posterior que importe `request` o
 * `RequestError` de ahí muere con "Export named 'request' not found".
 *
 * Localmente no se veía porque el orden de archivos de `bun test` dejaba a los afectados
 * ANTES que a este; en CI el orden cambió y tumbó dos archivos. Es el mismo modo de fallo
 * que `ia-respuesta-inservible.test.ts` documenta en el backend, por el que allá los dos
 * casos viven en un solo archivo.
 *
 * Reexportar lo real y sobreescribir solo lo que hace falta mantiene el aislamiento sin
 * mutilar el módulo para el resto de la suite.
 */
const real = await import('@/lib/api/browser');

mock.module('@/lib/api/browser', () => ({
  ...real,
  requestJson: async (url: string, _metodo: string, body: unknown) => {
    ultimaPeticion = { url, body };
    return respuesta.ok
      ? { ok: true, data: { companyId: 'empresa-1' } }
      : { ok: false, error: respuesta.error };
  },
  errorMessage: (error: { body?: unknown }) =>
    error.body && typeof error.body === 'object' && 'error' in error.body
      ? (error.body as { error: string }).error
      : undefined,
}));

mock.module('@/app/actions/set-active-company', () => ({
  setActiveCompany: async () => undefined,
}));

const { AcceptInvitationPanel } = await import('@/components/members/accept-invitation-panel');
const { getDictionary } = await import('@/lib/i18n/get-dictionary');

const t = getDictionary('es');

const INVITACION = {
  id: '11111111-1111-4111-8111-111111111111',
  companyId: 'empresa-1',
  companyName: 'Ferretería El Sol',
  role: 'admin' as const,
  expiresAt: '2030-01-01T00:00:00.000Z',
};

function montar(props: Partial<Parameters<typeof AcceptInvitationPanel>[0]> = {}) {
  return render(
    <AcceptInvitationPanel
      token=""
      invitations={[]}
      backendUnavailable={false}
      labels={t.members.accept}
      roles={t.members.role}
      {...props}
    />,
  );
}

beforeEach(() => {
  ultimaPeticion = null;
  respuesta = { ok: true };
});
afterEach(cleanup);

describe('panel de aceptación', () => {
  test('sin token pero con invitación al correo de la sesión, se puede unir', () => {
    // EL CASO DEL BUG. El invitado nuevo pasa por crear cuenta y verificar correo en la
    // hosted UI de WorkOS; si el `?token=` no sobrevive a ese viaje, esta es la única
    // forma de llegar a la empresa que lo invitó.
    montar({ invitations: [INVITACION] });

    expect(screen.getByText('Ferretería El Sol')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: t.members.accept.join }));
    expect(ultimaPeticion).toEqual({
      url: '/api/invitations/accept',
      body: { invitationId: INVITACION.id },
    });
  });

  test('nombra la empresa y el rol ANTES de aceptar', () => {
    // "Aceptar invitación" a secas no le dice a nadie a qué cuenta está entrando, y esto
    // da acceso a los datos financieros de una empresa.
    montar({ invitations: [INVITACION] });
    expect(screen.getByText(`Te unes como ${t.members.role.admin}`)).toBeDefined();
  });

  test('sin invitación viva pero con token, manda el token para que el backend explique', () => {
    // Vencida, ya usada, o dirigida a otro correo: las tres se distinguen solo del lado
    // del backend. Sin mandar el token, la pantalla solo podría encogerse de hombros.
    montar({ token: 'un-token-de-invitacion-larguisimo' });
    fireEvent.click(screen.getByRole('button', { name: t.members.accept.action }));
    expect(ultimaPeticion).toEqual({
      url: '/api/invitations/accept',
      body: { token: 'un-token-de-invitacion-larguisimo' },
    });
  });

  test('sin token y sin invitación, dice qué pasó — y no habla de "el enlace"', () => {
    // El mensaje viejo ("el enlace no trae token") solo tenía sentido para quien venía
    // del correo. Quien llegó por su cuenta leía un reproche sobre un enlace que no usó.
    montar();
    expect(screen.getByRole('alert').textContent).toBe(t.members.accept.noPending);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('si no se pudieron consultar las invitaciones, no se afirma que no hay', () => {
    montar({ backendUnavailable: true });
    expect(screen.getByRole('alert').textContent).toBe(t.members.accept.unavailable);
  });

  test('el rechazo se dice en el idioma del usuario, no con el español del backend', async () => {
    // Vencida / ya usada / de otro correo: cuál sea es lo accionable (pedir otra, o
    // entrar con el correo correcto). El backend manda `reason` justamente para que el
    // texto salga del diccionario — esta pantalla es la PRIMERA que ve un invitado
    // angloparlante, y era la única del producto que le contestaba en otro idioma.
    respuesta = {
      ok: false,
      error: {
        kind: 'http',
        status: 404,
        body: { error: 'La invitación venció.', reason: 'expired' },
      },
    };
    montar({ invitations: [INVITACION] });
    fireEvent.click(screen.getByRole('button', { name: t.members.accept.join }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(t.members.accept.rejection.expired);
    });
  });

  test('un motivo que este cliente no conoce cae al texto del backend, no a un genérico', async () => {
    // La red: el backend puede aprender un rechazo nuevo antes que el frontend, y
    // "algo salió mal" sería peor que su texto en español.
    respuesta = {
      ok: false,
      error: {
        kind: 'http',
        status: 409,
        body: { error: 'Un motivo que aún no traducimos.', reason: 'motivo_futuro' },
      },
    };
    montar({ invitations: [INVITACION] });
    fireEvent.click(screen.getByRole('button', { name: t.members.accept.join }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Un motivo que aún no traducimos.');
    });
  });
});

const raiz = join(import.meta.dir, '..', '..');
const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

describe('el camino del invitado nunca pasa por crear una empresa', () => {
  test('la pantalla de invitación vive FUERA del grupo (app)', () => {
    // Dentro de `(app)` el layout exige sesión, así que el enlace del correo mandaba
    // directo a la hosted UI de WorkOS sin una palabra de por medio. La captura del
    // ticket es esa pantalla: "Sign up", nombre y apellido, cero contexto.
    expect(() => leer('app/invitations/accept/page.tsx')).not.toThrow();
    expect(() => leer('app/(app)/invitations/accept/page.tsx')).toThrow();
  });

  test('y es pública en el middleware', () => {
    const mw = leer('middleware.ts');
    const paths = mw.match(/unauthenticatedPaths:\s*\[([^\]]*)\]/)?.[1] ?? '';
    expect(paths).toContain("'/invitations/accept'");
  });

  test('sin sesión ofrece entrar/registrarse conservando el token, nunca /register', () => {
    const src = leer('app/invitations/accept/page.tsx');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // El token viaja en `returnTo`, que es lo que el callback de AuthKit prefiere sobre
    // su destino por defecto.
    expect(code).toContain('/invitations/accept?token=');
    expect(code).toContain('screenHint=sign-up');
    // La regla dura del ticket: en este camino no se ofrece crear una empresa.
    expect(code).not.toContain('/register');
  });

  test('/login honra screenHint=sign-up', () => {
    // Sin esto la hosted UI abre en "entrar", y el invitado nuevo no tiene con qué.
    const code = leer('app/login/route.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).toContain("'sign-up'");
    expect(code).toContain('getSignUpUrl');
  });

  test('/ ofrece la invitación antes que el alta cuando el usuario no tiene empresa', () => {
    // Era la trampa: sin membresías, la única salida visible era "Registrar mi empresa",
    // y el invitado sin token es exactamente un usuario sin membresías.
    const code = leer('app/page.tsx');
    expect(code).toContain('href="/invitations/accept"');
    expect(code.indexOf('accept.pendingCta')).toBeLessThan(code.lastIndexOf('/register'));
  });
});
