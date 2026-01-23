import { useEffect, useMemo, useState } from 'react';
import { isSoundEnabled, setSoundEnabled } from '../services/audioService';

const parseStoredValue = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

const getStorageKey = (gameId) => `parodyParty.soundEnabled.${gameId || 'global'}`;

export default function useSoundPreference({
  gameId,
  hostIsDisplayOnly,
  isDisplayOnly,
  isReady = true
}) {
  const storageKey = useMemo(() => getStorageKey(gameId), [gameId]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());

  useEffect(() => {
    if (hasInitialized) return;
    if (typeof window === 'undefined') {
      setHasInitialized(true);
      return;
    }

    const stored = parseStoredValue(window.localStorage.getItem(storageKey));
    if (stored !== null) {
      setSoundEnabledState(stored);
      setHasInitialized(true);
      return;
    }

    if (!isReady) return;

    const defaultEnabled = !(Boolean(hostIsDisplayOnly) && !isDisplayOnly);
    setSoundEnabledState(defaultEnabled);
    setHasInitialized(true);
  }, [hasInitialized, hostIsDisplayOnly, isDisplayOnly, isReady, storageKey]);

  useEffect(() => {
    if (!hasInitialized) return;
    setSoundEnabled(soundEnabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(soundEnabled));
    }
  }, [soundEnabled, hasInitialized, storageKey]);

  return {
    soundEnabled,
    setSoundEnabled: setSoundEnabledState,
    hasInitialized
  };
}
