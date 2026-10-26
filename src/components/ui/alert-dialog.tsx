// Adapted from ui.shadcn.com/r/styles/base-nova/alert-dialog.json (MIT; see LICENSE).
// Neutral opaque overlay; no semantic colours, blur, shadows or preset animation.
import { AlertDialog as Primitive } from '@base-ui/react/alert-dialog';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AlertDialog = Primitive.Root;
const AlertDialogTrigger = Primitive.Trigger;

function AlertDialogContent({ className, ...props }: Primitive.Popup.Props) {
  return <Primitive.Portal>
    <Primitive.Backdrop className="fixed inset-0 z-50 bg-background" />
    <Primitive.Popup data-slot="alert-dialog-content" className={cn(
      'fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-xl border border-border bg-background p-6 text-foreground sm:p-8', className,
    )} {...props} />
  </Primitive.Portal>;
}
function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-3', className)} {...props} />;
}
function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-3 sm:flex-row sm:justify-end', className)} {...props} />;
}
function AlertDialogTitle({ className, ...props }: Primitive.Title.Props) {
  return <Primitive.Title className={cn('text-xl font-semibold leading-snug', className)} {...props} />;
}
function AlertDialogDescription({ className, ...props }: Primitive.Description.Props) {
  return <Primitive.Description className={cn('text-base leading-normal', className)} {...props} />;
}
function AlertDialogCancel(props: Primitive.Close.Props) {
  return <Primitive.Close render={<Button variant="outline" />} {...props} />;
}
const AlertDialogAction = Button;

export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction };
