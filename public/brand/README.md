# `public/brand/`

Assets de marca servidos **públicamente**, sin sesión. Hoy hay uno: `isotipo.png`.

## Por qué existe este directorio

El logo de los **correos transaccionales** se sirve desde acá. No es una decisión de
organización — es la única forma de que Gmail lo pinte.

El primer intento incrustó el PNG como `data:image/png;base64,…` dentro del HTML del correo,
razonando que "Gmail y Outlook bloquean imágenes remotas por defecto". Eso está al revés en
las dos mitades:

- **Gmail SÍ carga imágenes remotas** desde 2013, a través de su propio proxy
  (`googleusercontent.com`), sin pedirle permiso a quien lee.
- **Gmail NO renderiza `data:` URIs** en el cuerpo de un correo: los descarta. Por eso el
  logo salía roto, mostrando solo su texto alternativo.

## Dos cosas que hay que respetar al tocar esto

1. **`brand` está excluido del matcher del middleware** (`middleware.ts`). Sin eso,
   `authkitProxy` responde 307 hacia WorkOS a quien pida el archivo — y un cliente de correo
   no sigue redirecciones para cargar una imagen, así que el logo se rompe igual.
2. **La URL es parte del contrato de un correo ya enviado.** Un correo de hace seis meses
   sigue apuntando acá. Renombrar o mover este archivo rompe el logo de todo el historial,
   no solo de los correos nuevos.

El backend lo consume vía `BRAND_ASSET_BASE_URL` (ver `src/lib/brand-asset.ts` en
`macha-backend`). El PNG del **reporte** sigue incrustado y eso es correcto: un PDF se abre
fuera de la app y a veces sin red, así que ahí el binario tiene que viajar dentro.
