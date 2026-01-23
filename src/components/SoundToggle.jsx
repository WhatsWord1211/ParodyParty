import React from 'react';

export default function SoundToggle({ soundEnabled, onToggle, disabled }) {
  return (
    <button
      type="button"
      className={`sound-toggle ${soundEnabled ? '' : 'sound-toggle-off'}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? 'Sound on' : 'Sound off'}
    >
      {soundEnabled ? 'Sound on' : 'Sound off'}
    </button>
  );
}
