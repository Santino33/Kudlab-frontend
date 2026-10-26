// Adapted from ui.shadcn.com/r/styles/base-nova/table.json (MIT; see LICENSE).
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table data-slot="table" className={cn('w-full border-collapse text-left text-base', className)} {...props} />;
}
function TableHeader(props: ComponentProps<'thead'>) {
  return <thead data-slot="table-header" {...props} />;
}
function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" {...props} />;
}
function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('border-b border-border', className)} {...props} />;
}
function TableHead({ className, scope = 'col', ...props }: ComponentProps<'th'>) {
  return <th data-slot="table-head" scope={scope} className={cn('p-4 align-top font-semibold', className)} {...props} />;
}
function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('p-4 align-top [overflow-wrap:anywhere]', className)} {...props} />;
}
function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" className={cn('pb-4 text-left text-base', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption };
