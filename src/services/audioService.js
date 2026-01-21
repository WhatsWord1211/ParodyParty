const audioSources = {
  prompt: '/audio/prompt-round.mp3',
  voting: '/audio/voting-round.mp3'
};

let currentAudio = null;
let currentKey = null;

export const playRoundAudio = async (key) => {
  if (!audioSources[key]) return;
  if (currentKey === key && currentAudio && !currentAudio.paused) {
    return;
  }

  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioSources[key]);
    audio.preload = 'auto';
    currentAudio = audio;
    currentKey = key;
    await audio.play();
  } catch (error) {
    console.warn('Audio playback blocked or failed:', error);
  }
};

export const stopRoundAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    currentKey = null;
  }
};
