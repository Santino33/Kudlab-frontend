import { useEffect, useRef, useState } from 'react';
import type { ActivitiesApi } from './api';
import type { Assignment, CodeMetadata } from './types';
import type { HttpResult } from '../../usuarios/types';
import { newPreparation, preparationKey, readPreparation, savePreparation, type CodePreparation } from './code-preparation';
import { prepareCodes } from './prepare-codes';

export function useCodePreparation(api: ActivitiesApi, assignment: Assignment, actorId: string, confirmed: (items: CodeMetadata[]) => void) {
  const key = preparationKey(actorId, assignment.id);
  const [operation, setOperation] = useState<CodePreparation>();
  const [pending, setPending] = useState(false), [result, setResult] = useState<HttpResult<Assignment>>();
  const [storageError, setStorageError] = useState(false);
  const flight = useRef<AbortController | undefined>(undefined), receive = useRef(confirmed);
  receive.current = confirmed;

  async function start(input?: CodePreparation) {
    if (flight.current) return;
    let op: CodePreparation;
    try {
      op = input ?? readPreparation(sessionStorage, key, assignment)!;
      if (!op) return;
      op = { ...op, automatic: false };
      savePreparation(sessionStorage, key, op);
    } catch { setStorageError(true); return; }
    setStorageError(false); setOperation(op); setResult(undefined); setPending(true);
    const abort = new AbortController(); flight.current = abort;
    const selected = { ...assignment, recipients: op.recipientIds.map(id => assignment.recipients.find(r => r.id === id)!) };
    const next = await prepareCodes(api, selected, batch => op.requestIds[batch]!, abort.signal, {
      nextBatch: op.nextBatch,
      confirmed(items, nextBatch) {
        op = { ...op, nextBatch };
        savePreparation(sessionStorage, key, op);
        setOperation(op); receive.current(items);
      },
    });
    if (flight.current !== abort) return;
    flight.current = undefined; setPending(false);
    if (next.kind === 'success') {
      try { sessionStorage.removeItem(key); setOperation(undefined); }
      catch { setStorageError(true); }
    }
    setResult(next);
  }
  useEffect(() => {
    // Deferring dispatch lets StrictMode clean up its probe without issuing a mutation.
    const timer = setTimeout(() => {
      try {
        const op = readPreparation(sessionStorage, key, assignment); setOperation(op);
        if (op?.automatic) void start(op);
      } catch { setStorageError(true); }
    }, 0);
    return () => { clearTimeout(timer); flight.current?.abort(); flight.current = undefined; };
  }, [key]);
  function prepare(recipientIds: string[]) {
    try { void start(readPreparation(sessionStorage, key, assignment) ?? newPreparation(recipientIds)); }
    catch { setStorageError(true); }
  }
  return { operation, pending, result, storageError, prepare, retry: () => void start(),
    completed: operation ? Math.min(operation.nextBatch * 100, operation.recipientIds.length) : 0 };
}
