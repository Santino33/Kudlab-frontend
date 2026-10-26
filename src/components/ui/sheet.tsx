// Adapted from ui.shadcn.com/r/styles/base-nova/sheet.json (MIT; see LICENSE).
// Left sheet only; opaque Kudlab surfaces, no blur, shadows or decorative motion.
import { Dialog as Primitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Sheet = Primitive.Root;
const SheetTitle = Primitive.Title;
const SheetDescription = Primitive.Description;

function SheetContent({ children, className, ...props }: Primitive.Popup.Props) {
  return <Primitive.Portal>
    <Primitive.Backdrop data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-background" />
    <Primitive.Popup data-slot="sheet-content" className={cn(
      'fixed inset-y-0 left-0 z-50 flex h-svh w-72 max-w-[calc(100%-2rem)] flex-col border-r border-border bg-background text-foreground', className,
    )} {...props}>
      {children}
      <Primitive.Close render={<Button variant="outline" className="absolute right-4 top-4 min-w-11 px-2" />} aria-label="Cerrar navegación">
        <X aria-hidden="true" />
      </Primitive.Close>
    </Primitive.Popup>
  </Primitive.Portal>;
}

export { Sheet, SheetContent, SheetTitle, SheetDescription };
