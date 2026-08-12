/**
 * CU-868kjbxwa criterios 1 y 2: el contrato de seguridad de TODAS las rutas BFF.
 *
 * Las rutas de `app/api/**` no son un proxy tonto. Cada una es el punto donde se decide
 * quién pregunta y por qué empresa, y hace tres cosas que hasta hoy nadie verificaba:
 *
 *   1. exigir sesión (`requireSession`, directo o a través de `adminFetch`);
 *   2. adjuntar el access token **del servidor**, nunca uno que venga del navegador;
 *   3. adjuntar el `X-Company-Id` que sale de la cookie `macha-company-id` leída
 *      server-side — nunca del header ni del cuerpo que mande el cliente.
 *
 * La auditoría del ticket revisó las 36 rutas de entonces a mano y estaban todas bien. El
 * hueco nunca fue el estado actual sino la **ausencia de red**: alguien agrega una ruta
 * copiando mal una existente y typecheck, lint y build siguen los tres en verde.
 *
 * Por eso el barrido es estructural y **ejecuta de verdad cada handler**: descubre los
 * `route.ts` recorriendo el disco, importa cada uno, invoca cada método HTTP que exporte
 * y mira qué petición sale hacia macha-backend. No hay ninguna lista de rutas que
 * mantener: una ruta nueva entra al test el día que se crea, y si está mal, rompe.
 *
 * ## Cómo se ejecuta un Route Handler fuera de Next
 *
 * Tres cosas hay que sustituir, y las tres son sustituciones honestas:
 *   - `server-only`: su `index.js` lanza al importarse fuera de un Server Component. Es
 *     una guardia de bundling, no comportamiento; se neutraliza.
 *   - `@workos-inc/authkit-nextjs`: `withAuth({ ensureSignedIn: true })` llama a
 *     `redirect()` de Next cuando no hay sesión, y `redirect()` **lanza**. El doble lanza
 *     igual, así que "sin sesión" se prueba con la misma mecánica que en producción.
 *   - `next/headers`: `cookies()` necesita el almacenamiento asíncrono de una request
 *     real. El doble devuelve la cookie de empresa que el servidor "leyó".
 *
 * El resto —`NextRequest`, `NextResponse`, `apiFetch`, `proxyMutation`, `adminFetch`— es
 * el código de producción, sin tocar.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

/** Base del backend. Se fija ANTES de importar nada: `lib/api/client.ts` la lee al cargarse. */
const API_BASE = 'http://backend.de.prueba';
process.env.NEXT_PUBLIC_API_URL = API_BASE;

const TOKEN_DEL_SERVIDOR = 'token-de-la-sesion-verificada';
const EMPRESA_DE_LA_COOKIE = 'empresa-resuelta-server-side';

/** Lo que mandaría un cliente hostil. Nada de esto debe llegar al backend. */
const TOKEN_DEL_CLIENTE = 'token-inventado-por-el-navegador';
const EMPRESA_DEL_CLIENTE = 'empresa-ajena-pedida-por-el-cliente';

let haySesion = true;

/** Imita el throw de `redirect()` que hace `withAuth({ ensureSignedIn: true })` sin sesión. */
class RedireccionAlLogin extends Error {}

mock.module('server-only', () => ({}));

mock.module('@workos-inc/authkit-nextjs', () => ({
  withAuth: async (opts?: { ensureSignedIn?: boolean }) => {
    if (!haySesion) {
      if (opts?.ensureSignedIn) throw new RedireccionAlLogin('NEXT_REDIRECT;/login');
      return { user: null, accessToken: undefined };
    }
    return { user: { id: 'user-1', email: 'quien@sea.gt' }, accessToken: TOKEN_DEL_SERVIDOR };
  },
}));

mock.module('next/headers', () => ({
  cookies: () => ({
    get: (nombre: string) =>
      nombre === ACTIVE_COMPANY_COOKIE ? { value: EMPRESA_DE_LA_COOKIE } : undefined,
  }),
}));

// ---------------------------------------------------------------------------
// Espía del fetch saliente hacia macha-backend
// ---------------------------------------------------------------------------

interface PeticionSaliente {
  url: string;
  metodo: string;
  headers: Headers;
}

let salientes: PeticionSaliente[] = [];
const fetchReal = globalThis.fetch;

beforeEach(() => {
  salientes = [];
  haySesion = true;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    salientes.push({
      url: String(input),
      metodo: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
    });
    return new Response(JSON.stringify({ items: [], hasMore: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = fetchReal;
});

// ---------------------------------------------------------------------------
// Descubrimiento de rutas
// ---------------------------------------------------------------------------

const DIR_API = import.meta.dir;
const RAIZ = join(DIR_API, '..', '..');

const METODOS_HTTP = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type MetodoHttp = (typeof METODOS_HTTP)[number];

interface RutaBff {
  /** Ruta relativa a la raíz del repo, p. ej. `app/api/documents/[id]/route.ts`. */
  id: string;
  archivo: string;
  /** URL pública, con los segmentos dinámicos ya rellenados. */
  url: string;
  params: Record<string, string>;
  esAdmin: boolean;
  /** El handler consume `request.formData()` — hay que mandarle un cuerpo multipart. */
  usaFormData: boolean;
}

function buscarRoutes(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) buscarRoutes(ruta, acc);
    else if (entrada === 'route.ts') acc.push(ruta);
  }
  return acc;
}

function describirRuta(archivo: string): RutaBff {
  const id = archivo
    .slice(RAIZ.length + 1)
    .split(sep)
    .join('/');
  const segmentos = id.slice('app/'.length, -'/route.ts'.length).split('/');
  const params: Record<string, string> = {};

  const url = segmentos
    .map((segmento) => {
      const dinamico = /^\[(.+)\]$/.exec(segmento);
      if (!dinamico) return segmento;
      const nombre = dinamico[1];
      // Valor reconocible: si aparece en la URL saliente, el handler propagó el param.
      params[nombre] = `param-${nombre}`;
      return params[nombre];
    })
    .join('/');

  return {
    id,
    archivo,
    url: `/${url}`,
    params,
    esAdmin: id.startsWith('app/api/admin/'),
    usaFormData: /\.formData\s*\(/.test(readFileSync(archivo, 'utf8')),
  };
}

const RUTAS = buscarRoutes(DIR_API)
  .map(describirRuta)
  .sort((a, b) => a.id.localeCompare(b.id));

/**
 * Rutas de cliente que legítimamente NO adjuntan `X-Company-Id`, con el motivo escrito
 * acá y no en un comentario suelto: cada excepción es una decisión de aislamiento de
 * tenant y tiene que costar justificarla. Agregar una entrada es un cambio revisable;
 * olvidarse de adjuntarlo, no lo era.
 */
const SIN_COMPANY_ID: Record<string, string> = {
  'app/api/register/route.ts':
    'quien se registra todavía no tiene empresa — este endpoint es justamente el que la crea (identityDerive, no tenantDerive).',
  'app/api/invitations/accept/route.ts':
    'quien acepta la invitación aún no es miembro; la empresa sale del token de la invitación. Mandar la cookie haría que el backend scopeara a OTRA empresa del usuario.',
  'app/api/memberships/route.ts':
    'es la ruta con la que se descubren las empresas del usuario: scoparla por una de ellas sería circular.',
  'app/api/register/plans/route.ts':
    'catálogo de planes del wizard de alta: quien lo mira todavía no tiene empresa. Cuelga de `identityDerive` (sesión y nada más), no de `tenantDerive`, y adjuntar una cookie vieja de otra sesión sería peor que no mandar nada.',
};

// ---------------------------------------------------------------------------
// Invocación de un handler
// ---------------------------------------------------------------------------

async function metodosDe(ruta: RutaBff): Promise<MetodoHttp[]> {
  const mod = (await import(ruta.archivo)) as Record<string, unknown>;
  return METODOS_HTTP.filter((m) => typeof mod[m] === 'function');
}

async function invocar(ruta: RutaBff, metodo: MetodoHttp): Promise<void> {
  const mod = (await import(ruta.archivo)) as Record<string, unknown>;
  const handler = mod[metodo] as (req: unknown, ctx: unknown) => Promise<unknown>;
  const { NextRequest } = await import('next/server');

  // Headers y cuerpo tal y como los mandaría un cliente que intenta escalar: su propio
  // Authorization y su propio X-Company-Id. El handler no debe reenviar ninguno.
  const headers = new Headers({
    authorization: `Bearer ${TOKEN_DEL_CLIENTE}`,
    'x-company-id': EMPRESA_DEL_CLIENTE,
    cookie: `${ACTIVE_COMPANY_COOKIE}=${EMPRESA_DEL_CLIENTE}`,
  });

  let body: BodyInit | undefined;
  if (metodo !== 'GET') {
    if (ruta.usaFormData) {
      const fd = new FormData();
      fd.append('file', new File(['xlsx'], 'carga.xlsx'));
      body = fd;
    } else {
      headers.set('content-type', 'application/json');
      body = JSON.stringify({ companyId: EMPRESA_DEL_CLIENTE, valor: 1 });
    }
  }

  const req = new NextRequest(`http://macha.test${ruta.url}?limit=10&offset=0`, {
    method: metodo,
    headers,
    ...(body === undefined ? {} : { body }),
  });

  await handler(req, { params: ruta.params });
}

/** Cada (ruta, método) como caso propio, para que el fallo diga cuál se rompió. */
const CASOS: Array<[etiqueta: string, ruta: RutaBff, metodo: MetodoHttp]> = [];
for (const ruta of RUTAS) {
  for (const metodo of await metodosDe(ruta)) {
    CASOS.push([`${metodo} ${ruta.id}`, ruta, metodo]);
  }
}

// ---------------------------------------------------------------------------
// Los tests
// ---------------------------------------------------------------------------

describe('inventario de rutas BFF', () => {
  /**
   * El barrido solo vale si de verdad encuentra rutas. Sin este tope, un cambio de
   * layout que dejara `RUTAS` vacío haría pasar todo lo de abajo por vacuidad.
   */
  test('el barrido encuentra las rutas y sus métodos', () => {
    expect(RUTAS.length).toBeGreaterThanOrEqual(50);
    expect(CASOS.length).toBeGreaterThan(RUTAS.length);
  });

  test('toda excepción declarada en SIN_COMPANY_ID sigue existiendo', () => {
    const ids = new Set(RUTAS.map((r) => r.id));
    // Una excepción sobre una ruta borrada es permiso muerto: se quita del test o se
    // acumulan justificaciones de algo que ya no existe.
    expect(Object.keys(SIN_COMPANY_ID).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe('criterio 1 — ninguna ruta BFF responde sin sesión', () => {
  test.each(CASOS)('%s no llega al backend sin sesión', async (_etiqueta, ruta, metodo) => {
    haySesion = false;

    // Sin sesión el handler o lanza (la redirección de AuthKit) o responde un error.
    // Lo que NO puede pasar, en ninguno de los dos casos, es que salga una petición al
    // backend: eso significaría una ruta que no exige sesión.
    await invocar(ruta, metodo).catch(() => undefined);

    expect(salientes).toEqual([]);
  });
});

describe('criterio 2 — token y empresa salen del servidor, no del cliente', () => {
  test.each(CASOS)('%s reenvía al backend con el token del servidor', async (_e, ruta, metodo) => {
    await invocar(ruta, metodo);

    // Si un handler no llama al backend es que se cortó antes: o falta el reenvío o
    // este test dejó de ejercitarlo. En ambos casos hay que mirarlo.
    expect(salientes.length).toBeGreaterThanOrEqual(1);

    for (const saliente of salientes) {
      expect(saliente.url.startsWith(API_BASE)).toBe(true);
      expect(saliente.headers.get('authorization')).toBe(`Bearer ${TOKEN_DEL_SERVIDOR}`);
      // El token que mandó el navegador no se reenvía jamás.
      expect(saliente.headers.get('authorization')).not.toContain(TOKEN_DEL_CLIENTE);
    }
  });

  test.each(CASOS)('%s ignora el X-Company-Id que manda el cliente', async (_e, ruta, metodo) => {
    await invocar(ruta, metodo);

    for (const saliente of salientes) {
      expect(saliente.headers.get('x-company-id')).not.toBe(EMPRESA_DEL_CLIENTE);
    }
  });
});

describe('criterio 2 — tenant-scoping', () => {
  const deCliente = CASOS.filter(([, ruta]) => !ruta.esAdmin);
  const deAdmin = CASOS.filter(([, ruta]) => ruta.esAdmin);

  test.each(deCliente)(
    '%s adjunta el companyId de la cookie (o está exceptuada)',
    async (_etiqueta, ruta, metodo) => {
      await invocar(ruta, metodo);
      const exceptuada = ruta.id in SIN_COMPANY_ID;

      for (const saliente of salientes) {
        if (exceptuada) {
          // La excepción es "no lo manda", no "manda cualquier cosa".
          expect(saliente.headers.get('x-company-id')).toBeNull();
        } else {
          expect(saliente.headers.get('x-company-id')).toBe(EMPRESA_DE_LA_COOKIE);
        }
      }
    },
  );

  /**
   * El namespace admin del backend está gateado por la tabla `staff`, no por
   * `company_users` (ver `src/guards/admin.guard.ts`). Mandarle un `X-Company-Id` sería
   * afirmar un scope de tenant que ahí no significa nada — y la empresa sobre la que
   * opera cada endpoint admin viaja en la URL, que es donde el backend la valida.
   */
  test.each(deAdmin)('%s no manda X-Company-Id', async (_etiqueta, ruta, metodo) => {
    await invocar(ruta, metodo);
    for (const saliente of salientes) {
      expect(saliente.headers.get('x-company-id')).toBeNull();
    }
  });
});

describe('propagación del segmento dinámico', () => {
  const conParams = CASOS.filter(([, ruta]) => Object.keys(ruta.params).length > 0);

  /**
   * `/api/reports/[id]` que llame a `/reports` sin el id devolvería la lista entera en
   * vez del detalle. No lo detecta el typecheck: `params.id` existe y compila igual
   * aunque nadie lo use.
   */
  test.each(conParams)('%s lleva sus params a la URL del backend', async (_e, ruta, metodo) => {
    await invocar(ruta, metodo);
    for (const valor of Object.values(ruta.params)) {
      expect(salientes.some((s) => s.url.includes(valor))).toBe(true);
    }
  });
});
