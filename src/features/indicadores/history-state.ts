import type { HttpResult } from '../usuarios/types.ts';
import type { HistoryPage, HistorySession } from './types.ts';

// Estado de carga de la historia (CA-09). «Última carga correcta» solo ante fallos transitorios (red, timeout, 5xx, JSON inválido);
// ante 401/403/404 se retira el contenido protegido y nunca se muestra uno anterior.
export type Good = { key: string; items: HistorySession[]; nextCursor: string | null };
export type FailureKind = 'transient' | 'invalid' | 'denied' | 'missing';
export type HistoryState = {
  key: string; status: 'loading' | 'ready' | 'empty' | 'error'; items: HistorySession[]; nextCursor: string | null;
  failure?: FailureKind; moreFailed: boolean; good?: Good; fetching: boolean;
};
export type HistoryEvent =
  | { type: 'load'; key: string; append: boolean }
  | { type: 'result'; key: string; append: boolean; result: HttpResult<HistoryPage> };

export const initialState = (key: string): HistoryState => ({ key, status: 'loading', items: [], nextCursor: null, moreFailed: false, fetching: true });

export function classify(result: HttpResult<unknown>): FailureKind | 'ok' | 'obsolete' {
  if (result.kind === 'success') return 'ok';
  if (result.kind === 'obsolete') return 'obsolete';
  if (result.kind === 'unavailable') return 'transient';
  if (result.status === 400) return 'invalid';
  if (result.status === 401 || result.status === 403) return 'denied';
  if (result.status === 404) return 'missing';
  return result.status >= 500 ? 'transient' : 'invalid';
}

export function reduce(state: HistoryState, event: HistoryEvent): HistoryState {
  if (event.type === 'load') {
    if (event.append) return { ...state, fetching: true, moreFailed: false };
    // Nueva consulta: no se muestran datos de otros filtros mientras carga; la última carga correcta se conserva aparte.
    return { key: event.key, status: 'loading', items: [], nextCursor: null, moreFailed: false, fetching: true, ...(state.good ? { good: state.good } : {}) };
  }
  if (event.key !== state.key) return state; // respuesta de una consulta anterior
  const outcome = classify(event.result);
  if (outcome === 'obsolete') return state;
  if (outcome === 'ok') {
    const page = (event.result as Extract<HttpResult<HistoryPage>, { kind: 'success' }>).data;
    const known = new Set(event.append ? state.items.map(i => i.sessionId) : []);
    const items = event.append ? [...state.items, ...page.items.filter(i => !known.has(i.sessionId))] : page.items;
    return { key: state.key, status: items.length ? 'ready' : 'empty', items, nextCursor: page.nextCursor, moreFailed: false, fetching: false, good: { key: state.key, items, nextCursor: page.nextCursor } };
  }
  if (event.append && outcome === 'transient') return { ...state, fetching: false, moreFailed: true };
  // Pérdida de ámbito: se retira todo contenido protegido, incluida la última carga correcta.
  if (outcome === 'denied' || outcome === 'missing') return { key: state.key, status: 'error', items: [], nextCursor: null, failure: outcome, moreFailed: false, fetching: false };
  const { good: _drop, ...rest } = state;
  return { ...(outcome === 'transient' && state.good ? state : rest), key: state.key, status: 'error', failure: outcome, items: [], nextCursor: null, moreFailed: false, fetching: false,
    ...(outcome === 'transient' && state.good ? { good: state.good } : {}) };
}

// Lo que la vista puede mostrar bajo un error transitorio: la última carga correcta, rotulada, o nada.
export const staleView = (state: HistoryState): Good | undefined => state.status === 'error' && state.failure === 'transient' ? state.good : undefined;
