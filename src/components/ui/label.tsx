// Adapted from ui.shadcn.com/r/styles/base-nova/label.json (MIT; see LICENSE).
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label data-slot="label" className={cn('block text-base font-medium leading-normal', className)} {...props} />;
}

export { Label };
