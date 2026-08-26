import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/cn';

// design guide.md §5 "Field + label + hint" (`.field`) — label + input + hint/error slot.
export interface FieldProps extends InputProps {
  label: string;
  hint?: string;
  error?: boolean;
  errorMessage?: string;
  id: string;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL ASTERISCO DE CAMPO OBLIGATORIO (reporte de Jose, formulario de demo en móvil)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `required` ya llegaba acá dentro de `...inputProps` y se pasaba de largo al `<input>`, así
 * que la VALIDACIÓN ya funcionaba: el navegador no deja enviar el formulario sin llenar esos
 * campos. Lo que faltaba era puramente visual — nada en pantalla decía cuál era obligatorio
 * hasta que la persona intentaba enviar y le rebotaba.
 *
 * Se arregla en el componente COMPARTIDO y no en el formulario que lo reportó: `Field` lo usan
 * ocho archivos (el formulario de demo de la landing, el wizard de registro, miembros,
 * inventario, compra de créditos y tres paneles de `/admin/*`), así que el mismo hueco estaba
 * en los ocho.
 *
 * ═══ POR QUÉ SE DESESTRUCTURA Y SE VUELVE A PASAR ═══
 *
 * `required` sale de `...inputProps` para poder mirarlo, y se le devuelve explícitamente al
 * `<Input>`. Quitárselo dejaría el asterisco pintado sobre un campo que el navegador ya no
 * exige: el indicador visual mentiría, que es peor que no tenerlo.
 *
 * ═══ EL ASTERISCO ES SOLO VISUAL, Y LA ACCESIBILIDAD YA LA DA `required` ═══
 *
 * El `*` va `aria-hidden` porque un asterisco suelto no comunica nada a quien no lo ve: según
 * el lector de pantalla se anuncia como "asterisco" o se omite.
 *
 * Lo que sí lo comunica es el atributo `required` del `<input>`, que ya estaba y sigue estando:
 * los lectores de pantalla anuncian ese estado de forma nativa **y en el idioma del usuario**.
 * Un `<span className="sr-only"> (obligatorio)</span>` —que fue la primera versión de esto—
 * habría sido peor por dos motivos: duplica lo que el navegador ya dice, y mete una cadena en
 * español dentro de un componente que también usan las ocho pantallas de `/admin/*`, que son
 * bilingües por decisión de producto. Field no recibe diccionario, así que ese texto habría
 * quedado quemado en un idioma o habría obligado a un prop nuevo en los ocho llamadores.
 *
 * El color sale de `--danger` (token del sistema), que es el mismo que ya usa el mensaje de
 * error de este componente: el indicador de "esto te va a frenar" ya tenía un color asignado.
 */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, errorMessage, id, className, required, ...inputProps }, ref) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        ) : null}
      </Label>
      <Input
        ref={ref}
        id={id}
        error={error}
        required={required}
        className={className}
        {...inputProps}
      />
      {error && errorMessage ? (
        <p className="text-body text-danger">{errorMessage}</p>
      ) : hint ? (
        <p className={cn('text-body text-muted-foreground')}>{hint}</p>
      ) : null}
    </div>
  ),
);
Field.displayName = 'Field';
