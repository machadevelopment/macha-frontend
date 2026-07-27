import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/cn';

// shadcn-style Button, restyled onto this project's own tokens (design guide.md
// §11.3) instead of shadcn's default CSS-var set — keeps a single token system
// rather than layering a second one for just this component.
const variantClasses = {
  default: 'bg-primary text-primary-foreground hover:opacity-90',
  ghost: 'hover:bg-muted',
  outline: 'border border-border bg-transparent hover:bg-muted',
} as const;

const sizeClasses = {
  default: 'px-[var(--density-btn-px)] py-[var(--density-btn-py)]',
  sm: 'px-[var(--density-btn-sm-px)] py-[var(--density-btn-sm-py)]',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-body transition-colors disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
