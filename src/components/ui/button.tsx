// Adapted from ui.shadcn.com/r/styles/base-nova/button.json (MIT; see LICENSE).
// Only approved variants; Kudlab colours, 44px targets and no reduced text opacity.
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { LoaderCircle } from 'lucide-react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 max-w-full shrink-0 items-center justify-center gap-2 whitespace-normal rounded-lg border border-input px-4 py-2 text-base font-medium leading-normal [overflow-wrap:anywhere] motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-disabled disabled:text-foreground [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'staff-button-primary bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover disabled:hover:bg-disabled',
        outline: 'bg-background text-foreground hover:bg-disabled active:inset-ring-1 active:inset-ring-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & {
  loading?: boolean;
  loadingLabel?: string;
};

function Button({ className, variant, loading, loadingLabel = 'Cargando…', disabled, children, ...props }: ButtonProps) {
  return <ButtonPrimitive {...props} data-slot="button" data-loading={loading || undefined}
    aria-busy={loading || props['aria-busy']} disabled={disabled || loading}
    className={cn(buttonVariants({ variant }), className)}>
    {loading === undefined ? children : <span className="staff-button-labels">
      <span aria-hidden={loading} style={{ visibility: loading ? 'hidden' : 'visible' }}>{children}</span>
      <span aria-hidden={!loading} style={{ visibility: loading ? 'visible' : 'hidden' }}><LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />{loadingLabel}</span>
    </span>}
  </ButtonPrimitive>;
}

export { Button, buttonVariants };
