import { Info } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { PEDAGOGICAL_NOTICE, SOURCE_LABEL } from './copy.ts';

// Presente en todas las vistas de indicadores; no desaparece al filtrar ni con estados vacíos.
export function PedagogicalNotice() {
  return <Alert role="note"><Info aria-hidden="true" /><div className="min-w-0"><p>{PEDAGOGICAL_NOTICE}</p><p className="mt-1 text-sm">{SOURCE_LABEL}</p></div></Alert>;
}
