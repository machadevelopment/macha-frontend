import * as React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

// design guide.md §5 "Input" — error state: --danger border + hint slot handled by
// the caller (Field pattern), not this primitive.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border bg-card text-body text-foreground outline-none transition-colors',
        'px-[var(--density-input-px)] py-[var(--density-input-py)]',
        'placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:ring-2 focus-visible:ring-ring',
        error ? 'border-danger' : 'border-border',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
