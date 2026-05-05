import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useAutoSave — debounced auto-save with status machine.
 *
 * @param {Object} opts
 * @param {*}      opts.data     Form data; reference change triggers save.
 * @param {Function} opts.onSave async (data, signal) => Promise<void>. Optional `signal` may be ignored.
 * @param {number} [opts.delay=2000] Debounce window in ms.
 * @param {boolean} [opts.enabled=true] Disable temporarily (e.g., while loading).
 *
 * @returns {{
 *   status: 'idle' | 'saving' | 'saved' | 'error',
 *   lastSavedAt: Date | null,
 *   error: Error | null,
 *   save: () => Promise<void>,   // force immediate save (also used as retry)
 * }}
 */
export function useAutoSave({ data, onSave, delay = 2000, enabled = true }) {
  const [status, setStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState(null);

  // Refs to avoid stale closures inside debounced timer
  const onSaveRef = useRef(onSave);
  const dataRef = useRef(data);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const reqIdRef = useRef(0);
  const savedToIdleTimerRef = useRef(null);
  const isFirstChangeRef = useRef(true);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { dataRef.current = data; }, [data]);

  const runSave = useCallback(async () => {
    // Cancel any in-flight request from a prior trigger
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    abortRef.current = controller;

    const myReqId = ++reqIdRef.current;
    setStatus('saving');
    setError(null);

    try {
      await onSaveRef.current(dataRef.current, controller?.signal);
      // Ignore if a newer request started after us
      if (myReqId !== reqIdRef.current) return;
      setLastSavedAt(new Date());
      setStatus('saved');
      // After 3s of "saved", drop to idle (only if no other state change happened)
      if (savedToIdleTimerRef.current) clearTimeout(savedToIdleTimerRef.current);
      savedToIdleTimerRef.current = setTimeout(() => {
        setStatus(s => (s === 'saved' ? 'idle' : s));
      }, 3000);
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return; // superseded; do not surface as error
      }
      if (myReqId !== reqIdRef.current) return;
      setError(err);
      setStatus('error');
    }
  }, []);

  // Debounce on data change
  useEffect(() => {
    if (!enabled) return;
    // Skip the first run — that's the initial mount with default/loaded data
    if (isFirstChangeRef.current) {
      isFirstChangeRef.current = false;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runSave();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay, enabled, runSave]);

  // Flush on unmount: if there is a pending debounced save, trigger immediately
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Fire-and-forget — best effort to persist before navigation
        try { onSaveRef.current && onSaveRef.current(dataRef.current); } catch (_) { /* noop */ }
      }
      if (savedToIdleTimerRef.current) clearTimeout(savedToIdleTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Manual trigger (Ctrl+S or retry button)
  const save = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await runSave();
  }, [runSave]);

  return { status, lastSavedAt, error, save };
}

export default useAutoSave;
