import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

/**
 * useApiCall — single in-flight axios call with auto-cancellation.
 *
 * - Calling `call(config)` while a previous request is still pending
 *   aborts it via AbortController, so navigating fast between pages
 *   does not race and overwrite state with a stale response.
 * - On unmount, any in-flight request is aborted.
 * - Cancelled requests resolve to `null` (not an error) so callers can
 *   short-circuit cleanly: `const data = await call(...); if (!data) return;`.
 * - `isMounted()` lets callers guard `setState` after async work.
 */
export function useApiCall() {
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const call = useCallback(async (config) => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    try {
      const response = await axios({
        ...config,
        signal: controllerRef.current.signal,
      });
      return response.data;
    } catch (err) {
      if (axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return null;
      }
      throw err;
    }
  }, []);

  return { call, isMounted: () => mountedRef.current };
}

export default useApiCall;
