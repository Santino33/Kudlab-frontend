import { useEffect, useRef, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { navigationAvailable, registerLeaveGuard } from '../../../lib/navigation.ts';
import type { CaptureLifecycle } from './use-capture.ts';

export function useLeaveGuard(lease: CaptureLifecycle, dirty: () => boolean) {
  const [available, setAvailable] = useState(navigationAvailable), [open, setOpen] = useState(false);
  const source = useRef({ lease, dirty }); source.current = { lease, dirty };
  const decision = useRef<((accepted: boolean) => void) | undefined>(undefined);
  const cancelButton = useRef<HTMLButtonElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  function finish(accepted: boolean) { const resolve = decision.current; decision.current = undefined; setOpen(false); resolve?.(accepted); }
  useEffect(() => {
    setAvailable(navigationAvailable());
    const dispose = registerLeaveGuard({
      valid: () => source.current.lease.valid(), dirty: () => source.current.dirty(),
      decide: () => { finish(false); previousFocus.current = document.activeElement as HTMLElement | null; setOpen(true); return new Promise<boolean>(resolve => { decision.current = resolve; }); },
      cancel: () => finish(false), discard: () => source.current.lease.discard(), unavailable: () => setAvailable(false),
    });
    const remove = lease.onStop(dispose);
    return () => { remove(); dispose(); finish(false); };
  }, [lease]);
  return { available, dialog: <AlertDialog open={open} onOpenChange={value => { if (!value) finish(false); }}>
    <AlertDialogContent className="max-[360px]:p-2 [overflow-wrap:anywhere]" initialFocus={cancelButton} finalFocus={() => source.current.lease.valid() && previousFocus.current?.isConnected ? previousFocus.current : false}>
      <AlertDialogHeader><AlertDialogTitle>¿Salir de esta captura?</AlertDialogTitle><AlertDialogDescription>Se descarta este borrador. Los envíos sin confirmar conservan sus referencias: salir no los deshace ni los reenvía.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel className="px-2" ref={cancelButton} onClick={() => finish(false)}>Permanecer</AlertDialogCancel><AlertDialogAction className="px-2" onClick={() => finish(true)}>Descartar y salir</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog> };
}
