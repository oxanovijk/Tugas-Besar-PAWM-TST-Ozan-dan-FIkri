import { useCallback, useEffect, useState } from 'react';

type Load<T> = (signal: AbortSignal) => Promise<T>;
type State<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: unknown };

export function useResource<T>(load: Load<T> | null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ load: Load<T>; version: number; state: State<T> }>();
  const retry = useCallback(() => setVersion((previous) => previous + 1), []);

  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    const { signal } = controller;
    const publish = (state: State<T>) => setResult({ load, version, state });
    const timer = setTimeout(() => {
      controller.abort();
      publish({ status: 'error', error: new Error('timeout') });
    }, 12000);

    void load(signal)
      .then((data) => {
        if (!signal.aborted) publish({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!signal.aborted) publish({ status: 'error', error });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, version]);

  const state: State<T> = result && result.load === load && result.version === version
    ? result.state
    : { status: 'loading' };

  return { state, retry };
}
