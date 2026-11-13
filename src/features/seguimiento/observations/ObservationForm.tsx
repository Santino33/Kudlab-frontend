import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { areas, behaviors, descriptions, frequencies, today } from './types.ts';
import type { Field, FormValues } from './types.ts';

export const selectClass = 'staff-select';
export function ObservationFields({ value, change, disabled = false, errors = {}, prefix, contextOnly = false }: {
  value: FormValues; change(value: FormValues): void; disabled?: boolean; errors?: Partial<Record<Field, string>>; prefix: string; contextOnly?: boolean;
}) {
  const help = `${prefix}-help`;
  const select = (field: 'behavior' | 'frequency' | 'area' | 'term', label: string, choices: Record<string, string>, optional = false) => <div className="space-y-2 min-w-0">
    <Label htmlFor={`${prefix}-${field}`}>{label}</Label>
    <select id={`${prefix}-${field}`} className={selectClass} value={value[field]} required={!optional} disabled={disabled}
      aria-invalid={Boolean(errors[field])} aria-describedby={`${prefix}-${field}-error ${help}`} onChange={event => change({ ...value, [field]: event.target.value })}>
      <option value="">{optional ? field === 'area' ? 'Sin especificar' : 'Sin selección' : 'Selecciona una opción'}</option>
      {Object.entries(choices).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
    {field === 'behavior' && Object.hasOwn(descriptions, value.behavior) && <p className="text-sm">{descriptions[value.behavior as keyof typeof descriptions]}</p>}
    {errors[field] && <p id={`${prefix}-${field}-error`} className="text-sm">{errors[field]}</p>}
  </div>;
  return <div className="space-y-4">
    <p id={help} className="text-sm text-muted">Una conducta por observación. El año y el periodo se eligen manualmente; no se deducen de la fecha ni del curso.</p>
    {select('behavior', 'Conducta', behaviors)}
    {!contextOnly && select('frequency', 'Frecuencia', { ...frequencies, UNOBSERVED: 'Sin oportunidad de observar' }, true)}
    {!contextOnly && <p className="text-sm text-muted">Sin selección o sin oportunidad no crea un registro ni elimina observaciones anteriores.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 min-w-0"><Label htmlFor={`${prefix}-observedOn`}>Fecha observada</Label>
        <Input id={`${prefix}-observedOn`} type="date" required max={today()} value={value.observedOn} disabled={disabled} aria-invalid={Boolean(errors.observedOn)} aria-describedby={`${prefix}-date-help ${prefix}-observedOn-error`}
          onChange={event => change({ ...value, observedOn: event.target.value })} />
        <p id={`${prefix}-date-help`} className="text-sm text-muted">Hoy o una fecha anterior en Colombia.</p>
        {errors.observedOn && <p id={`${prefix}-observedOn-error`} className="text-sm">{errors.observedOn}</p>}
      </div>
      <div className="space-y-2 min-w-0"><Label htmlFor={`${prefix}-schoolYear`}>Año lectivo</Label>
        <Input id={`${prefix}-schoolYear`} type="number" required step="1" min="-2147483648" max="2147483647" value={value.schoolYear} disabled={disabled} aria-invalid={Boolean(errors.schoolYear)} aria-describedby={`${prefix}-schoolYear-error ${help}`}
          onChange={event => change({ ...value, schoolYear: event.target.value })} />
        {errors.schoolYear && <p id={`${prefix}-schoolYear-error`} className="text-sm">{errors.schoolYear}</p>}
      </div>
      {select('term', 'Periodo académico', { 1: 'Periodo 1', 2: 'Periodo 2', 3: 'Periodo 3', 4: 'Periodo 4' })}
      {select('area', 'Área de actividad', areas, true)}
    </div>
  </div>;
}
export function ObservationForm({ children, onSubmit, value, change, disabled, errors, correction = false, prefix = 'observation' }: {
  children?: ReactNode; onSubmit(event: FormEvent): void; value: FormValues; change(value: FormValues): void; disabled: boolean; errors: Partial<Record<Field, string>>; correction?: boolean; prefix?: string;
}) {
  return <form noValidate className="space-y-6" onSubmit={onSubmit} aria-busy={disabled}>
    <ObservationFields {...{ value, change, disabled, errors, prefix }} />
    {children}
    <Button type="submit" disabled={disabled}>{disabled ? 'Espera la comprobación…' : correction ? 'Guardar corrección' : 'Guardar observación'}</Button>
    <p className="text-sm text-muted">Autor y fecha de registro se confirman en el servidor. La captura no produce diagnósticos ni puntuaciones.</p>
  </form>;
}
