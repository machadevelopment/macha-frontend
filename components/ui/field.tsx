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

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, errorMessage, id, className, ...inputProps }, ref) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input ref={ref} id={id} error={error} className={className} {...inputProps} />
      {error && errorMessage ? (
        <p className="text-body text-danger">{errorMessage}</p>
      ) : hint ? (
        <p className={cn('text-body text-muted-foreground')}>{hint}</p>
      ) : null}
    </div>
  ),
);
Field.displayName = 'Field';
