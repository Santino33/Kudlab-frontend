// shadcn Input adaptation, source: ui.shadcn.com/r/styles/base-nova/input.json.
// Keep the native input here: password managers and imperative password clearing
// must not compete with an additional internal value store. No Radix dependency.
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(
    'min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base font-medium leading-normal text-foreground motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-disabled aria-invalid:border-2',
    className,
  )} {...props} />;
}

export { Input };
