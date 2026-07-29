'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// design guide.md §7 "Navegación móvil": drawer para el sidebar colapsado en <1080px.
// Same Radix Dialog primitive as components/ui/dialog.tsx, positioned as a side panel.
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;

const sideClasses = {
  left: 'left-0 top-0 h-full w-[212px] border-r',
  right: 'right-0 top-0 h-full w-[212px] border-l',
} as const;

/** `closeLabel` obligatorio por el mismo motivo que en `dialog.tsx` — ver la nota ahí. */
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: keyof typeof sideClasses;
    closeLabel: string;
  }
>(({ className, children, side = 'left', closeLabel, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 border-border bg-card p-[var(--density-card-p)] shadow-tab',
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 text-faint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={closeLabel}
      >
        <X className="h-4 w-4" strokeWidth={1.7} />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';
