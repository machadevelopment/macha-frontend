# SF Pro Display — cómo se generaron estos `.woff2`

Los archivos de esta carpeta **no son los del Brand Book**: son un subset comprimido.
Este README existe para que rehacerlos no dependa de reconstruir el razonamiento.

## Por qué

`next/font/local` sirve el archivo tal cual: **no subsetea**. Medido sobre
`macha.finance` en producción antes de este cambio, la tipografía eran **539 KB de los
1,2 MB** de la página — el 47 %.

## Los dos pasos, medidos por separado

El titular engaña, así que van con su número real:

| paso | en disco | **en la red** |
|---|---|---|
| `.otf` original | 1.275 KB | 539 KB (Vercel ya los comprimía) |
| → `.woff2` completo | 425 KB | 425 KB |
| → `.woff2` **subset** | 232 KB | **232 KB** |

**El ahorro real son 307 KB (57 % de la tipografía, ~25 % de la página).** Del total, solo
114 KB vienen de cambiar de formato; el grueso es el subset. Aun así el cambio de formato
se hace igual: `.otf` es un formato de escritorio y mandarlo al navegador obliga a
descomprimir dos veces.

## Qué se conserva y qué se cae

De 1.299 glifos por peso a **855**. Se cae cirílico, griego y otros alfabetos que un
producto ES/EN no pinta nunca. Se conservan:

- latín completo con diacríticos (incluye `ñ á é í ó ú ü ¿ ¡` y las lenguas latinas vecinas),
- puntuación tipográfica (`– — … • « » " " ' '`),
- monedas (`$ € £ ¥ ₡ ₲` — la `Q` del quetzal es una letra normal),
- operadores (`± × ÷ − ≈ ≤ ≥ % ‰`) y formas geométricas,
- **las flechas `↗ ↘ → ←`**, que no son decoración: son el canal redundante del delta de
  KPI que exige la regla de los dos verdes (quien no distingue verde de rojo lee la flecha).

Si algún día falta un glifo, la degradación es suave: cae al `fallback` de `lib/fonts.ts`.
No se rompe nada, se ve distinto.

## Cómo rehacerlo

Los `.otf` originales **no están en el repo** (1,3 MB que ya no se sirven). Vienen del Brand
Book de Macha (`Macha-Veintitres/…/SF Pro`). Con ellos en `app/fonts/`:

```bash
python3 -m pip install --user fonttools brotli
python3 - <<'PY'
from fontTools import subset
import glob, os

RANGOS = ('0000-024F,0250-02AF,0300-036F,1E00-1EFF,2000-206F,2070-209F,20A0-20CF,'
          '2100-214F,2150-218F,2190-21FF,2200-22FF,2300-23FF,25A0-25FF,2600-26FF,'
          '2700-27BF,FB00-FB4F,FEFF,FFFD')

for src in sorted(glob.glob('app/fonts/*.otf')):
    opts = subset.Options()
    opts.layout_features = ['*']   # conservar kerning y ligaduras
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    f = subset.load_font(src, opts)
    s = subset.Subsetter(options=opts)
    s.populate(unicodes=subset.parse_unicodes(RANGOS))
    s.subset(f)
    f.flavor = 'woff2'
    f.save(src[:-4] + '.woff2', reorderTables=False)
    os.remove(src)
PY
```

`lib/fonts.test.ts` comprueba que los cuatro pesos conserven los 116 caracteres que el
producto necesita. Si el subset se rehace y se come uno, **falla ahí y no en pantalla**.

## Ojo con la licencia

No cambia con esto: SF Pro es de Apple y su licencia **no cubre servirla desde web**.
Subsetear y comprimir no lo hace más legal, solo más liviano. El riesgo está asumido por
el dueño y documentado en la cabecera de `lib/fonts.ts`; revertir sigue siendo editar ese
archivo y borrar esta carpeta.
