// Adapted from ui.shadcn.com/r/styles/base-nova/button.json (MIT; see LICENSE).
// Only approved variants; Kudlab colours, 44px targets and no reduced text opacity.
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-base font-medium leading-normal motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:outline-1 active:-outline-offset-4 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-foreground [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground enabled:hover:bg-brand-hover',
        outline: 'bg-background text-foreground enabled:hover:bg-disabled',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Button({ className, variant, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export { Button, buttonVariants };
