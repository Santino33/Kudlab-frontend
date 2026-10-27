// Adapted from ui.shadcn.com/r/styles/base-nova/sidebar.json (MIT; see LICENSE).
// Keep the used offcanvas composition; omit icon/floating variants, tooltips,
// skeletons, keyboard shortcut and preference cookie. Session data stays ephemeral.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ComponentProps, RefObject } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { PanelLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type SidebarContextValue = {
  open: boolean; openMobile: boolean; isMobile: boolean;
  setOpenMobile(open: boolean): void; toggleSidebar(): void;
  trigger: RefObject<HTMLButtonElement | null>;
};
const SidebarContext = createContext<SidebarContextValue | null>(null);
function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('Sidebar requiere SidebarProvider.');
  return context;
}

function SidebarProvider({ children, className, ...props }: ComponentProps<'div'>) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!isMobile) setOpenMobile(false); }, [isMobile]);
  useEffect(() => {
    const navigated = () => setOpenMobile(false);
    window.addEventListener('popstate', navigated);
    return () => window.removeEventListener('popstate', navigated);
  }, []);
  const toggleSidebar = () => isMobile ? setOpenMobile(value => !value) : setOpen(value => !value);
  return <SidebarContext.Provider value={{ open, openMobile, isMobile, setOpenMobile, toggleSidebar, trigger }}>
    <div data-slot="sidebar-wrapper" className={cn('group/sidebar-wrapper flex min-h-svh w-full', className)} {...props}>{children}</div>
  </SidebarContext.Provider>;
}

function Sidebar({ children, className, ...props }: ComponentProps<'div'>) {
  const { open, isMobile, openMobile, setOpenMobile, trigger } = useSidebar();
  if (isMobile) return <Sheet open={openMobile} onOpenChange={setOpenMobile}>
    <SheetContent data-sidebar="sidebar" data-mobile="true" finalFocus={trigger}>
      <div className="sr-only"><SheetTitle>Navegación de Kudlab</SheetTitle><SheetDescription>Opciones de tu espacio de profesores.</SheetDescription></div>
      <div data-slot="sidebar-inner" className={cn('flex min-h-0 flex-1 flex-col', className)} {...props}>{children}</div>
    </SheetContent>
  </Sheet>;
  return <div data-slot="sidebar" data-state={open ? 'expanded' : 'collapsed'} data-collapsible={open ? '' : 'offcanvas'} className="group peer hidden text-foreground lg:block">
    <div data-slot="sidebar-gap" className="relative w-64 bg-transparent group-data-[collapsible=offcanvas]:w-0" />
    <div data-slot="sidebar-container" inert={!open} aria-hidden={!open} className={cn('fixed inset-y-0 left-0 z-10 hidden h-svh w-64 border-r border-border lg:flex', className)} {...props}>
      <div data-slot="sidebar-inner" data-sidebar="sidebar" className="flex size-full flex-col bg-background">{children}</div>
    </div>
  </div>;
}

function SidebarTrigger({ className, onClick, ...props }: ComponentProps<typeof Button>) {
  const { toggleSidebar, trigger, isMobile, openMobile, open } = useSidebar();
  return <Button ref={trigger} data-slot="sidebar-trigger" variant="outline" className={className}
    aria-label={isMobile ? 'Abrir navegación' : 'Alternar barra lateral'} aria-expanded={isMobile ? openMobile : open}
    onClick={event => { onClick?.(event); if (!event.defaultPrevented) toggleSidebar(); }} {...props}>
    <PanelLeft aria-hidden="true" /><span>Menú</span>
  </Button>;
}

// The existing StaffLayout owns <main>; do not nest another main landmark.
function SidebarInset({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-inset" className={cn('relative flex min-w-0 flex-1 flex-col bg-background', className)} {...props} />;
}
function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-4', className)} {...props} />;
}
function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('mt-auto flex flex-col gap-4 p-4', className)} {...props} />;
}
function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('flex min-h-0 flex-1 flex-col overflow-auto', className)} {...props} />;
}
function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />;
}
function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('flex w-full min-w-0 flex-col gap-2', className)} {...props} />;
}
function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('group/menu-item relative', className)} {...props} />;
}
function SidebarMenuButton({ render, isActive = false, className, ...props }: useRender.ComponentProps<'button'> & ComponentProps<'button'> & { isActive?: boolean }) {
  return useRender({
    defaultTagName: 'button', render,
    props: mergeProps<'button'>({ className: cn(
      'flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-base no-underline hover:border-border data-active:border-border data-active:font-semibold active:outline-1 active:-outline-offset-4 [&_svg]:size-5 [&_svg]:shrink-0', className,
    ) }, props),
    state: { slot: 'sidebar-menu-button', sidebar: 'menu-button', active: isActive },
  });
}

export { Sidebar, SidebarProvider, SidebarTrigger, SidebarInset, SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton };
