// shadcn/ui registry item `popover`, style base-nova (https://ui.shadcn.com/r/styles/base-nova/popover.json).
// Adapted to Kudlab tokens: opaque surface with Dark 1 border, 16px text, no shadow or decorative motion.
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({ className, align = 'center', alignOffset = 0, side = 'bottom', sideOffset = 4, ...props }: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return <PopoverPrimitive.Portal>
    <PopoverPrimitive.Positioner align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} collisionPadding={16} className="isolate z-50">
      <PopoverPrimitive.Popup data-slot="popover-content" className={cn(
        'z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg border border-foreground bg-background p-3 text-base leading-normal font-normal text-foreground outline-hidden', className,
      )} {...props} />
    </PopoverPrimitive.Positioner>
  </PopoverPrimitive.Portal>;
}

export { Popover, PopoverContent, PopoverTrigger };
