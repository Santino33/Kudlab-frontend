import { useEffect, useRef, useState } from 'react';
import type { HttpResult, UserField } from './types.ts';

export function useQuery<T, Field extends string = UserField>(load: (signal: AbortSignal) => Promise<HttpResult<T, Field>>, selection: string, keepOnRefresh = false) {
  const [snapshot, setSnapshot] = useState<{ selection: string; result?: HttpResult<T, Field> }>({ selection });
  const [fetching, setFetching] = useState(true);
  const [revision, setRevision] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15000);
    setFetching(true);
    setSnapshot((previous) => keepOnRefresh && previous.selection === selection ? previous : { selection });
    void loader.current(abort.signal).then((result) => {
      if (active && result.kind !== 'obsolete') { setSnapshot({ selection, result }); setFetching(false); }
    }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); abort.abort(); };
  }, [selection, revision, keepOnRefresh]);
  return { result: snapshot.selection === selection ? snapshot.result : undefined, fetching,
    reload: () => { setFetching(true); setRevision((value) => value + 1); } };
}

export function useMutation<T, Field extends string = UserField>() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<HttpResult<T, Field>>();
  const active = useRef(false);
  const flight = useRef<{ abort: AbortController; timer: ReturnType<typeof setTimeout> } | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (flight.current) { clearTimeout(flight.current.timer); flight.current.abort.abort(); } };
  }, []);
  async function run(request: (signal: AbortSignal) => Promise<HttpResult<T, Field>>) {
    if (flight.current) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      abort.abort();
      if (active.current) setResult({ kind: 'unavailable', uncertain: true });
    }, 15000);
    flight.current = { abort, timer };
    setPending(true); setResult(undefined);
    let next: HttpResult<T, Field>;
    try { next = await request(abort.signal); } catch { next = { kind: 'unavailable', uncertain: true }; }
    clearTimeout(timer); flight.current = undefined;
    if (!active.current) return;
    if (abort.signal.aborted) next = { kind: 'unavailable', uncertain: true };
    setPending(false);
    if (next.kind !== 'obsolete') setResult(next);
    return next;
  }
  return { pending, result, run, clear: () => { if (!flight.current) setResult(undefined); } };
}
