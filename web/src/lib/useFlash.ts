import { useState } from 'react';
import type { Location } from 'react-router-dom';

export function useFlash(location: Location): [string | null, () => void] {
  const initial = (location.state as { flash?: string } | null)?.flash ?? null;
  const [flash, setFlash] = useState(initial);
  if (initial) window.history.replaceState({ ...window.history.state, usr: null }, '');
  return [flash, () => setFlash(null)];
}
