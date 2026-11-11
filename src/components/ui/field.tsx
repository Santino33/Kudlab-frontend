// Adapted from ui.shadcn.com/r/styles/base-nova/field.json (MIT; see LICENSE).
// Groups one control with its persistent label, help and error text; no Radix dependency.
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Field({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field" className={cn('min-w-0 space-y-2', className)} {...props} />;
}
function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-sm text-muted', className)} {...props} />;
}
// Error text stays visible next to the field, tied to it by aria-describedby; never colour alone.
function FieldError({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-error" className={cn('text-sm font-medium', className)} {...props} />;
}
function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('min-w-0 space-y-2 border-0 p-0', className)} {...props} />;
}
function FieldLegend({ className, ...props }: ComponentProps<'legend'>) {
  return <legend data-slot="field-legend" className={cn('mb-2 block p-0 text-base font-medium leading-normal', className)} {...props} />;
}

export { Field, FieldDescription, FieldError, FieldSet, FieldLegend };
