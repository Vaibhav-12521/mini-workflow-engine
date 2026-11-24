import { useState } from 'react';
import type { Location } from 'react-router-dom';

/** One-shot success message passed between pages via router state, e.g. navigate('/', { state: { flash: 'Task deleted' } }). */
export function useFlash(location: Location): [string | null, () => void] {
  const initial = (location.state as { flash?: string } | null)?.flash ?? null;
  const [flash, setFlash] = useState(initial);
  if (initial) window.history.replaceState({ ...window.history.state, usr: null }, ''); // don't re-show after refresh
  return [flash, () => setFlash(null)];
}
