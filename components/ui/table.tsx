import * as React from 'react';
import { cn } from '@/lib/cn';

// design guide.md §5 "Tabla" — th mono uppercase, td density-aware padding, numeric cells
// should get font-mono tabular-nums at the call site (this primitive stays generic).
//
// CU-868khvzbd, criterio 3 (<640px): el contenedor ya tenía `overflow-x-auto`, pero eso
// solo no alcanzaba — con `w-full` y celdas que envuelven, en 390px la tabla se
// comprimía hasta volverse ilegible (una palabra por línea) en vez de desbordar. El
// `whitespace-nowrap` de las celdas la hace naturalmente más ancha que el viewport, y
// ahí sí el scroll horizontal entra en acción. Se elige scroll y no layout apilado
// porque estas tablas se leen comparando filas —montos, estados, roles— y apilarlas
// destruye justo esa comparación.
export const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <table ref={ref} className={cn('w-full border-collapse text-body', className)} {...props} />
  </div>
));
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('border-b border-border', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn('border-b border-soft last:border-0', className)} {...props} />
));
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'whitespace-nowrap p-[var(--density-td-p)] text-left font-mono text-eyebrow uppercase text-faint',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('whitespace-nowrap p-[var(--density-td-p)]', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';
