import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export type AsyncState<T> =
  | { status: 'loading'; data?: T }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: ApiError; data?: T };

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setState((s) => ({ status: 'loading', data: s.data }));
    fn().then(
      (data) => id === requestId.current && setState({ status: 'ready', data }),
      (err: unknown) =>
        id === requestId.current &&
        setState({
          status: 'error',
          error: err instanceof ApiError ? err : new ApiError(0, 'INTERNAL', 'Unexpected error'),
        }),
    );
  }, deps);

  useEffect(run, [run]);

  return { state, reload: run, setData: (data: T) => setState({ status: 'ready', data }) };
}
