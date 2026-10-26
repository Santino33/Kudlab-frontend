// Adapted from ui.shadcn.com/r/styles/base-nova/card.json (MIT; see LICENSE).
// Opaque surfaces, functional borders, 12px panel radius; no preset shadow/rings.
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('flex w-full flex-col rounded-xl border border-border bg-card text-card-foreground', className)} {...props} />;
}
function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('grid grid-cols-1 gap-3 p-6 pb-0 sm:p-8 sm:pb-0', className)} {...props} />;
}
function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('grid grid-cols-1 gap-6 p-6 sm:p-8', className)} {...props} />;
}
function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('border-t border-border px-6 py-4 text-sm leading-normal sm:px-8', className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardFooter };
