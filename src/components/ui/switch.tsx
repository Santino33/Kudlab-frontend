import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

// The compact visual track sits inside the real 44px Base UI interaction target.
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return <SwitchPrimitive.Root data-slot="switch" className={cn(
    'group inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground data-disabled:cursor-not-allowed', className)} {...props}>
    <span data-slot="switch-track" aria-hidden="true" className="pointer-events-none inline-flex h-6 w-10 items-center rounded-full border border-foreground bg-muted p-px group-data-checked:bg-switch-active">
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-5 rounded-full border border-foreground bg-background transition-transform motion-reduce:transition-none data-checked:translate-x-4" />
    </span>
  </SwitchPrimitive.Root>;
}
