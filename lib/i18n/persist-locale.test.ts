import { describe, expect, test } from 'bun:test';
import { avisarIdiomaAlServidor } from '@/lib/i18n/persist-locale';

/**
 * CU-868krvuct — el selector de idioma tiene que llegar al servidor, y no puede romperse
 * al intentarlo.
 *
 * Hasta este ticket, cambiar de idioma solo escribía una cookie que el backend nunca veía;
 * por eso un reporte generado con la plataforma en español salía en inglés. Lo que se fija
 * acá es la política del aviso: cuándo se manda, y qué pasa cuando el envío falla.
 *
 * Sin un solo `mock.module`: el envío se inyecta. En Bun los mocks de módulo son globales
 * al proceso, y fingir `@/lib/api/client` acá rompería `app/api/bff-contract.test.ts`, que
 * barre todas las rutas BFF ejecutando el `apiFetch` de verdad.
 */
describe('avisarIdiomaAlServidor', () => {
  test('con sesión, manda el idioma elegido y el token de la sesión', async () => {
    const enviados: Array<[string, string]> = [];

    const r = await avisarIdiomaAlServidor('en', 'tok_123', async (locale, token) => {
      enviados.push([locale, token]);
    });

    expect(r).toBe('enviado');
    expect(enviados).toEqual([['en', 'tok_123']]);
  });

  test('sin sesión no manda nada, y eso NO es un error', async () => {
    // El selector también aparece en login y registro. Ahí no hay a quién guardarle la
    // preferencia, y la cookie ya hizo todo el trabajo.
    let seLlamo = false;

    const r = await avisarIdiomaAlServidor('es', null, async () => {
      seLlamo = true;
    });

    expect(r).toBe('sin-sesion');
    expect(seLlamo).toBe(false);
  });

  test('un token indefinido se trata igual que la ausencia de sesión', async () => {
    // `getOptionalSession()` devuelve `undefined`, no `null`, cuando no hay sesión.
    // Distinguirlos acá sería una trampa esperando a que alguien cambie esa firma.
    const r = await avisarIdiomaAlServidor('es', undefined, async () => {
      throw new Error('no debería llamarse');
    });

    expect(r).toBe('sin-sesion');
  });

  test('si el envío FALLA, no propaga: el idioma de la pantalla cambia igual', async () => {
    /*
     * La regla que importa. Cambiar de idioma es una acción de interfaz: si el backend está
     * caído, lo único que debe quedar desactualizado es el idioma de un reporte futuro — no
     * la capacidad del usuario de leer el producto en su idioma. Que esto lanzara dejaría
     * al usuario atrapado en el idioma equivocado por un fallo ajeno a lo que pidió.
     */
    const r = await avisarIdiomaAlServidor('en', 'tok_123', async () => {
      throw new Error('503 Service Unavailable');
    });

    expect(r).toBe('fallo');
  });
});
