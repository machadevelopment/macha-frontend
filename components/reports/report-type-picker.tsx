'use client';

import { CircleCheck, Circle } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Selector de TIPO de reporte — CU-868ktkn9w.
 *
 * ═══ QUÉ SE REPORTÓ ═══
 *
 * QA: *"En el área de reportes, incluir qué tipo de reporte desean generar como Lovable"*.
 * El prototipo abre su generador con un desplegable "Tipo de reporte" y seis opciones
 * nombradas; en nuestra pantalla la palabra "tipo" no aparecía por ningún lado.
 *
 * No era que faltara la funcionalidad: el catálogo del backend (`GET /reports/catalog`)
 * devuelve tipos con sus secciones por defecto desde el ticket B2, y `ReportBuilder` ya
 * sabía elegir uno. Lo que pasaba es que el control **se escondía** cuando el catálogo
 * traía un solo tipo, con este razonamiento: *"un desplegable con una sola opción solo
 * ocupa espacio y sugiere una elección que no existe"*.
 *
 * Ese razonamiento era correcto SOBRE UN `<Select>` y equivocado sobre el problema. Como
 * `REPORT_TYPES` en el backend tiene hoy exactamente un elemento (`executive_summary`), la
 * condición se cumplía siempre: el resultado neto es que la pantalla NUNCA decía qué clase
 * de documento estaba a punto de cobrarle créditos al usuario. Esconder el control no
 * ahorró una elección falsa, borró una respuesta verdadera.
 *
 * ═══ POR QUÉ TARJETAS Y NO UN `<Select>` ═══
 *
 * El desplegable esconde todo menos el nombre elegido, y "Resumen ejecutivo" a secas no
 * dice qué sale del otro lado. La tarjeta muestra el nombre **y** la descripción sin
 * abrir nada, que es justo lo que faltaba, y a la vez resuelve el reparo original: con un
 * solo tipo no es un control muerto que promete una elección inexistente — es la ficha de
 * lo que se va a generar. Cuando `REPORT_TYPES` crezca, el mismo componente pasa a ser una
 * elección real sin tocar una línea.
 *
 * ═══ ACCESIBILIDAD ═══
 *
 * `role="radiogroup"` + `aria-checked` y no un grupo de `aria-pressed`: esto es una
 * elección EXCLUYENTE (elegir un tipo reemplaza al anterior), a diferencia de las píldoras
 * de secciones de abajo, que sí son interruptores independientes. Usar el mismo patrón
 * para las dos cosas le diría al lector de pantalla que puede marcar dos tipos a la vez.
 * El ícono de estado repite la señal sin depender del color, igual que las píldoras.
 */
export function ReportTypePicker({
  types,
  value,
  onChange,
  labels,
}: {
  /** Los `type` tal como los devuelve `GET /reports/catalog`, en su orden. */
  types: string[];
  value: string;
  onChange: (tipo: string) => void;
  labels: Dictionary['reports']['builder'];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p id="report-type-label" className="font-mono text-eyebrow uppercase text-faint">
        {labels.typeLabel}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="report-type-label"
        className="grid gap-2 sm:grid-cols-2"
      >
        {types.map((tipo) => {
          const activo = tipo === value;
          // El nombre cae al `type` crudo y la descripción a nada: un tipo que el backend
          // agregue antes de que exista su texto sale sin explicar, nunca en blanco.
          const nombre = labels.type[tipo] ?? tipo;
          const descripcion = labels.typeDescription[tipo];
          return (
            <button
              key={tipo}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onChange(tipo)}
              className={cn(
                'flex items-start gap-2 rounded-lg border p-3 text-left transition-colors',
                activo
                  ? 'border-foreground bg-muted'
                  : 'border-border bg-card hover:border-muted-foreground',
              )}
            >
              {/* `aria-hidden`: el estado ya lo anuncia `aria-checked`; leerlo dos veces
                  solo alarga lo que oye quien navega con lector de pantalla. */}
              {activo ? (
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                  strokeWidth={1.9}
                  aria-hidden
                />
              ) : (
                <Circle
                  className="mt-0.5 h-4 w-4 shrink-0 text-faint"
                  strokeWidth={1.7}
                  aria-hidden
                />
              )}
              <span className="min-w-0">
                <span className="block text-body font-medium text-foreground">{nombre}</span>
                {descripcion && (
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    {descripcion}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
