import { useRef } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function AccountMenu({ signOut }: { signOut(): void }) {
  const close = useRef<HTMLButtonElement>(null);
  return <Popover>
    <PopoverTrigger render={<Button variant="outline" className="workspace-account-trigger" aria-label="Menú de cuenta" />}>
      <UserRound aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent align="end" className="workspace-account-popup" aria-label="Opciones de cuenta" initialFocus={close}>
      <Button ref={close} variant="outline" onClick={signOut}><LogOut aria-hidden="true" />Cerrar sesión</Button>
    </PopoverContent>
  </Popover>;
}
