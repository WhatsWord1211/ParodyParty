// Audio temporarily disabled - expo-av removed to fix Android boolean casting error
// Will migrate to expo-audio in SDK 54 when audio is needed
let Audio = null;

/**
 * Audio Service - Handles music playback for game prompts
 */

let soundObject = null;

export const playMusicClip = async (audioSource, onPlaybackStatusUpdate = null) => {
  if (!Audio) {
    console.warn('Audio not available - expo-av may need to be configured');
    return null;
  }
  
  try {
    // Stop any currently playing sound
    if (soundObject) {
      await soundObject.unloadAsync();
    }
    
    // Handle both local requires and remote URLs
    // If it's a number (local require), use it directly
    // If it's a string (URL), use { uri: string }
    const source = typeof audioSource === 'number' 
      ? audioSource 
      : { uri: audioSource };
    
    // Create and play new sound
    const { sound } = await Audio.Sound.createAsync(
      source,
      { shouldPlay: true, isLooping: false },
      onPlaybackStatusUpdate
    );
    
    soundObject = sound;
    return sound;
  } catch (error) {
    console.error('Error playing music clip:', error);
    // Don't throw - allow game to continue without audio
    return null;
  }
};

export const stopMusic = async () => {
  if (soundObject) {
    try {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  }
};

export const pauseMusic = async () => {
  if (soundObject && Audio) {
    try {
      await soundObject.pauseAsync();
    } catch (error) {
      console.error('Error pausing music:', error);
    }
  }
};

export const resumeMusic = async () => {
  if (soundObject && Audio) {
    try {
      await soundObject.playAsync();
    } catch (error) {
      console.error('Error resuming music:', error);
    }
  }
};

export const setAudioMode = async () => {
  if (!Audio) return;
  
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch (error) {
    console.error('Error setting audio mode:', error);
  }
};

