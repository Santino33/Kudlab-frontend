// Adapted from ui.shadcn.com/r/styles/base-nova/skeleton.json (MIT; see LICENSE).
// Neutral placeholder: tone step only (no gradient or shadow); motion respects prefers-reduced-motion.
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('rounded-lg bg-disabled motion-safe:animate-pulse', className)} {...props} />;
}

export { Skeleton };
