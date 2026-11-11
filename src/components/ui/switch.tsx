import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

// shadcn base-nova, adapted to Kudlab's contrast and 44px target.
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return <SwitchPrimitive.Root data-slot="switch" className={cn(
    'group inline-flex h-11 w-14 shrink-0 cursor-pointer items-center rounded-full border border-foreground bg-muted p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground data-checked:bg-primary data-disabled:cursor-not-allowed', className)} {...props}>
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-7 rounded-full border border-foreground bg-background transition-transform motion-reduce:transition-none data-checked:translate-x-4" />
  </SwitchPrimitive.Root>;
}
