import { describe, expect, test } from 'bun:test';
import { destinoSeguro } from '@/lib/auth/return-to';
import { nombreDeReporte } from '@/lib/download';

/**
 * CU-868kt4bxc — el link del correo perdía su destino, y el PDF salía en pop-up.
 */

describe('destinoSeguro (a dónde vuelve el login)', () => {
  test('una ruta interna se respeta: es el caso del correo de reporte', () => {
    // El enlace del correo es `/reports/:id`. Perderlo era el bug reportado.
    expect(destinoSeguro('/reports/abc-123')).toBe('/reports/abc-123');
  });

  test('conserva la query, que a veces ES el destino', () => {
    // `/chat?thread=xyz` es un deep-link real del producto (CU-868kfvacr).
    expect(destinoSeguro('/chat?thread=xyz')).toBe('/chat?thread=xyz');
  });

  test('sin parámetro, va a la raíz — el comportamiento de antes', () => {
    expect(destinoSeguro(null)).toBe('/');
    expect(destinoSeguro(undefined)).toBe('/');
    expect(destinoSeguro('')).toBe('/');
  });

  describe('no se convierte en un redirector abierto', () => {
    /*
     * ═══ POR QUÉ ESTOS TESTS ═══
     *
     * `?returnTo` viene de la URL, o sea de quien le mande el enlace al usuario. Sin
     * validar, `/login?returnTo=https://sitio-malo/` deja que alguien mande un enlace con
     * el dominio de Macha, la víctima vea la hosted UI REAL de WorkOS, se loguee, y
     * termine en otro sitio ya autenticada y confiada.
     *
     * Es de los pocos agujeros que se explotan sin tocar el servidor, y la clase de regla
     * que alguien "simplifica" el día que le estorbe. Por eso está probada.
     */
    test('una URL absoluta se rechaza', () => {
      expect(destinoSeguro('https://sitio-malo.example/')).toBe('/');
      expect(destinoSeguro('http://sitio-malo.example/')).toBe('/');
    });

    test('`//host` se rechaza: es absoluta disfrazada de ruta', () => {
      // El navegador lee `//evil.com` como `https://evil.com`. Empieza por `/`, así que un
      // chequeo ingenuo de "empieza por barra" la deja pasar.
      expect(destinoSeguro('//sitio-malo.example/')).toBe('/');
    });

    test('la barra invertida también, porque el navegador la normaliza', () => {
      expect(destinoSeguro('/\\\\sitio-malo.example')).toBe('/');
      expect(destinoSeguro('\\\\sitio-malo.example')).toBe('/');
    });

    test('un esquema sin barra inicial se rechaza', () => {
      expect(destinoSeguro('javascript:alert(1)')).toBe('/');
      expect(destinoSeguro('data:text/html,hola')).toBe('/');
    });

    test('espacios y control chars se rechazan', () => {
      // Es la vía clásica para colar un salto de línea en una cabecera de redirección.
      expect(destinoSeguro('/ruta con espacio')).toBe('/');
      expect(destinoSeguro('/ruta\\nX')).toBe('/');
    });
  });
});

describe('nombreDeReporte (el PDF deja de guardarse como un uuid)', () => {
  test('lleva el período adentro', () => {
    // Sin esto el archivo se guarda con el nombre que trae la URL firmada de S3 —un uuid—
    // y una carpeta con cinco reportes se vuelve ilegible.
    expect(nombreDeReporte({ desde: '2026-07-01', hasta: '2026-07-31', formato: 'pdf' })).toBe(
      'macha-reporte-2026-07-01_2026-07-31.pdf',
    );
  });

  test('sin período sigue dando un nombre usable', () => {
    // La cabecera de descarga baja "el último reporte" y no siempre conoce su rango.
    expect(nombreDeReporte({ formato: 'xlsx' })).toBe('macha-reporte.xlsx');
  });

  test('la extensión corresponde al formato', () => {
    expect(nombreDeReporte({ formato: 'pdf' }).endsWith('.pdf')).toBe(true);
    expect(nombreDeReporte({ formato: 'xlsx' }).endsWith('.xlsx')).toBe(true);
  });
});
