'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/cn';

// design guide.md §5 "Segmented control" (`.seg .o`) and "Period pills" (`.pills`) —
// same primitive, `variant` picks the shape.
const variantClasses = {
  segment: 'rounded-md',
  pill: 'rounded-pill',
} as const;

export const ToggleGroup = ToggleGroupPrimitive.Root;

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & {
    variant?: keyof typeof variantClasses;
  }
>(({ className, variant = 'segment', ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      'px-3 py-1.5 text-body text-muted-foreground transition-colors',
      'hover:bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring',
      variantClasses[variant],
      className,
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;
