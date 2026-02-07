import React, { useEffect, useState } from 'react';

const FULLSCREEN_OPT_OUT_KEY = 'pp_fullscreen_opt_out';

const loadFullscreenOptOut = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(FULLSCREEN_OPT_OUT_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

const storeFullscreenOptOut = (value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(FULLSCREEN_OPT_OUT_KEY, value ? 'true' : 'false');
  } catch (error) {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
};

export default function FullscreenToggle({ isDisplayOnly }) {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [hasOptedOut, setHasOptedOut] = useState(loadFullscreenOptOut());

  useEffect(() => {
    if (!isDisplayOnly) return undefined;
    const handleChange = () => {
      const nowFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(nowFullscreen);
      if (!nowFullscreen) {
        setHasOptedOut(true);
        storeFullscreenOptOut(true);
      }
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [isDisplayOnly]);

  useEffect(() => {
    if (!isDisplayOnly || document.fullscreenElement || hasOptedOut) return undefined;
    let hasRequested = false;
    const requestFromGesture = async () => {
      if (hasRequested || document.fullscreenElement || hasOptedOut) return;
      hasRequested = true;
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    };
    document.addEventListener('click', requestFromGesture, { once: true });
    document.addEventListener('touchstart', requestFromGesture, { once: true });
    return () => {
      document.removeEventListener('click', requestFromGesture);
      document.removeEventListener('touchstart', requestFromGesture);
    };
  }, [isDisplayOnly, hasOptedOut]);

  if (!isDisplayOnly) return null;

  const handleToggle = async () => {
    try {
      if (!document.fullscreenElement) {
        setHasOptedOut(false);
        storeFullscreenOptOut(false);
        await document.documentElement.requestFullscreen();
      } else {
        setHasOptedOut(true);
        storeFullscreenOptOut(true);
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  };

  return (
    <button
      type="button"
      className="fullscreen-toggle"
      onClick={handleToggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    </button>
  );
}
