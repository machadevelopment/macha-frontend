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
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let ultimaPeticion: { url: string; body: unknown } | null = null;
let respuesta: { ok: boolean; error?: { kind: 'http'; status: number; body?: unknown } } = {
  ok: true,
};

/*
 * ═══ SE SUSTITUYE `fetch`, NO EL MÓDULO ═══
 *
 * Antes esto hacía `mock.module('@/lib/api/browser', …)`, y los mocks de módulo de Bun son
 * GLOBALES AL PROCESO: `lib/api/browser.test.ts`, que prueba ese módulo de verdad, recibía
 * este doble y sus catorce tests fallaban comparando contra respuestas fingidas. En CI
 * —donde el orden de archivos difiere del de macOS— tumbaba la suite entera.
 *
 * Se intentó arreglar tres veces por el lado del doble (completar sus exports, reexportar el
 * módulo real, cargarlo por ruta de archivo) y ninguna sirvió: mientras exista el mock, el
 * módulo queda reemplazado para todo el proceso. Un diagnóstico impreso desde CI lo confirmó
 * — `request.toString()` devolvía el cuerpo del doble.
 *
 * Sustituir `globalThis.fetch` prueba lo mismo sin tocar el registro de módulos: el panel
 * ejecuta su `requestJson` DE VERDAD, que es incluso mejor cobertura, y ningún otro archivo
 * se entera. Es exactamente lo que hace `browser.test.ts`.
 */
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  ultimaPeticion = {
    url: String(input),
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
  return respuesta.ok
    ? Response.json({ companyId: 'empresa-1' })
    : Response.json(respuesta.error?.body ?? {}, { status: respuesta.error?.status ?? 400 });
}) as unknown as typeof fetch;

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
      sessionEmail="invitado@ejemplo.com"
      onUseAnotherAccount={() => {}}
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

// Se devuelve el `fetch` real al terminar: dejar el global sustituido afectaría a cualquier
// archivo que corra después, que es justo el defecto que este cambio vino a quitar.
afterAll(() => {
  globalThis.fetch = realFetch;
});

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

/**
 * El archivo SIN comentarios, para las aserciones NEGATIVAS.
 *
 * Un `not.toContain('memberships')` sobre el fuente completo falla en cuanto un comentario
 * menciona la palabra para explicar por qué eso NO está ahí — y ese comentario es justamente lo
 * que evita que alguien lo reintroduzca. Un chequeo negativo tiene que mirar CÓDIGO, no prosa.
 *
 * Los tests de más abajo ya hacían este `replace` a mano cada uno. Extraerlo es lo que hace que
 * el próximo no se olvide: acá se olvidó, y el test pasó a acusar al comentario en vez al código.
 */
const leerCodigo = (rel: string) =>
  leer(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

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

  test('el post-login ofrece la invitación antes que el alta cuando no hay empresa', () => {
    /*
     * Era la trampa: sin membresías, la única salida visible era "Registrar mi empresa", y el
     * invitado sin token es exactamente un usuario sin membresías.
     *
     * La bifurcación vivía en `app/page.tsx` y se mudó a `app/continue/page.tsx` el 2026-08-21,
     * cuando `/` pasó a ser la landing pública. Lo que se protege no cambió — el ORDEN de las
     * dos salidas—, así que este test siguió al código en vez de relajarse.
     */
    const code = leer('app/continue/page.tsx');
    expect(code).toContain('href="/invitations/accept"');
    expect(code.indexOf('accept.pendingCta')).toBeLessThan(code.lastIndexOf('/register'));
  });

  test('la landing NO decide nada del post-login', () => {
    /*
     * La otra mitad de la mudanza, y la que evita que vuelva a mezclarse: si alguien reintroduce
     * la lógica de membresías en `/`, la landing vuelve a depender del backend —una caída de
     * Railway se llevaría la portada del producto— y quien tenga sesión dejaría de ver la
     * landing, que es justo lo que se pidió.
     */
    const landing = leerCodigo('app/page.tsx');
    expect(landing).not.toContain('memberships');
    expect(landing).not.toContain('/invitations/pending');
    expect(landing).not.toMatch(/redirect\(['"]\/dashboard/);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL CALLEJÓN SIN SALIDA DE "no pudimos usar esta invitación" (Jose, 2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Su captura mostraba el error en rojo y UN botón, que reintentaba exactamente lo mismo.
 * Medido en producción: de 10 invitaciones creadas, **ninguna se aceptó jamás** — y varios
 * invitados (`dbarnoya@gmail.com`, cinco veces) nunca llegaron a tener cuenta.
 *
 * Llegar a ese estado —token en la URL y cero invitaciones para el correo de la sesión— casi
 * siempre significa lo mismo: entraste con otra cuenta. El texto lo insinuaba ("revisa con qué
 * correo iniciaste sesión") sin decir cuál era ni ofrecer cómo cambiarlo.
 */
describe('con token pero sin invitaciones para esta sesión', () => {
  test('dice con qué cuenta estás, antes de que aprietes nada', () => {
    montar({ token: 'tok_abc', sessionEmail: 'otro@ejemplo.com' });
    // El correo va en pantalla desde el arranque: leerlo ANTES es lo que evita el intento
    // fallido; después del error ya perdió la mitad de su valor.
    expect(screen.getByText(/otro@ejemplo\.com/)).toBeTruthy();
  });

  test('ofrece salir a otra cuenta, conservando el token de la invitación', () => {
    const { container } = montar({ token: 'tok_abc', sessionEmail: 'otro@ejemplo.com' });
    const oculto = container.querySelector('input[name="token"]') as HTMLInputElement | null;
    // Sin el token en el formulario, cerrar sesión devuelve a una pantalla vacía y el invitado
    // tiene que volver a buscar el correo del enlace.
    expect(oculto?.value).toBe('tok_abc');
    expect(screen.getByText(t.members.accept.useAnotherAccount)).toBeTruthy();
  });

  /*
   * La contraparte: con invitaciones que SÍ son de esta sesión no hay nada que diagnosticar, y
   * un "entrar con otra cuenta" ahí solo invita a perder la que ya sirve.
   */
  test('no aparece cuando la sesión sí tiene invitaciones', () => {
    montar({ token: '', invitations: [INVITACION], sessionEmail: 'invitado@ejemplo.com' });
    expect(screen.queryByText(t.members.accept.useAnotherAccount)).toBeNull();
  });
});
