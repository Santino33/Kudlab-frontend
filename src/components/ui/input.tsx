// shadcn Input adaptation, source: ui.shadcn.com/r/styles/base-nova/input.json.
// Keep the native input here: password managers and imperative password clearing
// must not compete with an additional internal value store. No Radix dependency.
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(
    'staff-input min-h-11 w-full min-w-0 text-base font-medium leading-normal motion-safe:transition-colors motion-safe:duration-150',
    className,
  )} {...props} />;
}

export { Input };
