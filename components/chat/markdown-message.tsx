'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renderiza el Markdown que devuelve el asesor (CU-868knx181).
 *
 * ANTES esto no existía: `chat-client.tsx` pintaba `{m.content}` como texto plano dentro
 * de un `<div>`, así que el usuario leía literalmente `**Margen bruto**`, los guiones de
 * las listas colgando al inicio de línea y las tablas como una tira de `|---|---|`. El
 * modelo escribe Markdown —es lo que hace un modelo de chat por defecto— y nadie lo
 * estaba interpretando.
 *
 * DECISIONES
 *
 * `remark-gfm` no es opcional: sin él las TABLAS no son Markdown válido, y las tablas son
 * justamente lo que el asesor usa para comparar meses o productos. También trae tachado y
 * listas de tareas, que vienen de regalo.
 *
 * NO se instala `rehype-raw` ni se activa `skipHtml={false}`. Por defecto `react-markdown`
 * ignora el HTML crudo, y esa es la postura correcta acá: el contenido lo genera un modelo
 * a partir de datos financieros del cliente, y habilitar HTML sería abrir XSS almacenado
 * en el hilo de chat. El Markdown puro cubre todo lo que el asesor necesita escribir.
 *
 * NO se usa `@tailwindcss/typography`. El plugin no está instalado y traerlo significaría
 * heredar su escala tipográfica y sus colores, que no son los del design guide — habría
 * que sobreescribir casi todo con `prose-*`. Mapear los ocho elementos que el asesor
 * realmente emite es menos código y usa los tokens directamente.
 *
 * Las TABLAS van envueltas en su propio `overflow-x-auto`. Una tabla de seis columnas
 * dentro de una burbuja de chat en móvil no cabe, y sin el envoltorio empuja el ancho del
 * layout: sería reintroducir por el eje X el mismo bug que CU-868knx16t acaba de cerrar
 * por el eje Y. El scroll se queda DENTRO de la tabla.
 */

/** Cifras con `tabular-nums`: en una tabla de meses las columnas tienen que alinearse. */
const cell = 'border border-border px-2 py-1.5 text-left align-top tabular-nums';

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="marker:text-faint">{children}</li>,

  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  /*
   * El asesor no debería emitir enlaces (responde sobre datos propios, no cita fuentes),
   * pero si lo hace se abre en pestaña nueva: perder el hilo de conversación por un click
   * es peor que un tab de más. `rel` obligatorio con `target="_blank"`.
   */
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),

  code: ({ className, children }) => {
    // `react-markdown` distingue bloque de inline por la clase `language-*` que le pone
    // el parser; el bloque lo envuelve además en un `<pre>`, que se estiliza abajo.
    const isBlock = typeof className === 'string' && className.startsWith('language-');
    if (isBlock) return <code className="font-mono text-[12.5px]">{children}</code>;
    return (
      <code className="rounded-sm bg-soft px-1 py-0.5 font-mono text-[12.5px]">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md border border-border bg-soft p-2 last:mb-0">
      {children}
    </pre>
  ),

  table: ({ children }) => (
    <div className="mb-2 w-full overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-soft">{children}</thead>,
  th: ({ children }) => <th className={`${cell} font-semibold`}>{children}</th>,
  td: ({ children }) => <td className={cell}>{children}</td>,

  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),

  /*
   * Los encabezados se aplanan a un solo peso. Dentro de una burbuja de chat de ~14px un
   * `<h1>` real (27px, `text-h1`) es más grande que el título de la pantalla que lo
   * contiene; el modelo usa `#` para separar secciones de su respuesta, no para competir
   * con la jerarquía de la página.
   */
  h1: ({ children }) => <p className="mb-1 mt-3 font-semibold first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mb-1 mt-3 font-semibold first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mb-1 mt-3 font-semibold first:mt-0">{children}</p>,
  h4: ({ children }) => <p className="mb-1 mt-3 font-semibold first:mt-0">{children}</p>,

  hr: () => <hr className="my-3 border-border" />,
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
