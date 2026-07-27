import * as React from 'react';
import { cn } from '@/lib/cn';

// design guide.md §5 "Chip / tag" (`.chip .g/.r/.a/.n`) — the 4 semantic variants,
// always text+bg+border together (§1 rule 3), never color-only.
const variantClasses = {
  success: 'text-success bg-success-bg border-success-bd',
  danger: 'text-danger bg-danger-bg border-danger-bd',
  warning: 'text-warning bg-warning-bg border-warning-bd',
  neutral: 'text-muted-foreground bg-muted border-border',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[5px] border px-1.5 py-0.5 font-mono text-chip uppercase',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
