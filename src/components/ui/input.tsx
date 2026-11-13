// shadcn Input adaptation, source: ui.shadcn.com/r/styles/base-nova/input.json.
// Keep the native input here: password managers and imperative password clearing
// must not compete with an additional internal value store. No Radix dependency.
import type { ComponentProps } from 'react';
import { useId, useImperativeHandle, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  if (type === 'file') return <FileInput className={className} {...props} />;
  return <input type={type} data-slot="input" className={cn(
    'staff-input min-h-11 w-full min-w-0 text-base font-medium leading-normal motion-safe:transition-colors motion-safe:duration-150',
    className,
  )} {...props} />;
}

// The input/FileList remains the source of truth. Only its display name is mirrored;
// password/text inputs above never acquire an internal value store.
function FileInput({ className, ref, onChange, disabled, id, ...props }: ComponentProps<'input'>) {
  const generated = useId();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [dragging, setDragging] = useState(false);
  const promptId = `${id ?? generated}-file-prompt`;
  useImperativeHandle(ref, () => input.current!);
  const readName = () => Array.from(input.current?.files ?? [], file => file.name).join(', ');
  // Parent consumers clear input.value imperatively after removal/confirmation.
  useLayoutEffect(() => { const current = readName(); if (current !== name) setName(current); });
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => { setName(''); setDragging(false); };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  return <div data-slot="file-drop" data-disabled={disabled || undefined}
    data-invalid={props['aria-invalid'] === true || props['aria-invalid'] === 'true' || undefined}
    data-dragging={!disabled && dragging || undefined} className="staff-file-drop"
    onDragEnter={() => { if (!disabled) setDragging(true); }}
    onDragLeave={() => setDragging(false)}
    onDragOver={event => { if (disabled) event.preventDefault(); }}
    onDrop={event => { setDragging(false); if (disabled) event.preventDefault(); }}>
    <FileUp aria-hidden="true" className="staff-file-icon" />
    <span id={promptId} className="staff-file-prompt">{name ? 'Selecciona otro archivo o arrástralo aquí' : 'Selecciona un archivo o arrástralo aquí'}</span>
    {name && <span className="staff-file-name" aria-hidden="true">{name}</span>}
    <input {...props} ref={input} id={id} type="file" data-slot="input" disabled={disabled}
      aria-describedby={[props['aria-describedby'], promptId].filter(Boolean).join(' ')}
      className={cn('staff-file-input', className)} onChange={event => {
        onChange?.(event);
        setName(readName());
        setDragging(false);
      }} />
  </div>;
}

export { Input };
