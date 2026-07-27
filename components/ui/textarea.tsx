import * as React from 'react';
import { cn } from '@/lib/cn';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-md border border-border bg-card text-body text-foreground outline-none transition-colors',
      'px-[var(--density-input-px)] py-[var(--density-input-py)]',
      'placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
