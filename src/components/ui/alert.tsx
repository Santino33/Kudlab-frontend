// Adapted from ui.shadcn.com/r/styles/base-nova/alert.json (MIT; see LICENSE).
// Neutral feedback explicitly approved; no destructive/status colour is assigned.
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Alert({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert" role="alert" className={cn(
    'grid grid-cols-1 items-start gap-x-3 gap-y-1 rounded-lg border border-border bg-background p-4 text-base leading-normal text-foreground sm:grid-cols-[auto_minmax(0,1fr)] [&>svg]:mt-1 [&>svg]:size-5 [&>svg]:shrink-0', className,
  )} {...props} />;
}
function AlertDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="alert-description" className={cn('col-start-1 min-w-0 [overflow-wrap:anywhere] sm:col-start-2', className)} {...props} />;
}

export { Alert, AlertDescription };
