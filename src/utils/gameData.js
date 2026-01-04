/**
 * Game Data - Song prompts and lyrics
 * 
 * Structure:
 * {
 *   songId: string,
 *   title: string,
 *   artist: string,
 *   lyrics: string[], // Array of lines
 *   blankPosition: number, // Which line has the blank
 *   audioUri: string | number, // URL string OR local require() (number)
 *   difficulty: 'easy' | 'medium' | 'hard'
 * }
 * 
 * Audio Options:
 * - Local assets: Use require('../../assets/sounds/song.mp3')
 * - Remote URL: Use 'https://...' or Firebase Storage URL
 */

// Example: Using local assets (recommended for prototype)
// Uncomment and add your audio files to assets/sounds/
// import song1Audio from '../../assets/sounds/song1.mp3';
// import song2Audio from '../../assets/sounds/song2.mp3';

export const songPrompts = [
  {
    songId: '1',
    title: 'Example Song',
    artist: 'Example Artist',
    lyrics: [
      'I want to hold your hand',
      'I want to hold your hand',
      'I want to hold your _____', // blank line
      'Oh please, say to me'
    ],
    blankPosition: 2,
    // Option 1: Local asset (uncomment when you add files)
    // audioUri: song1Audio,
    // Option 2: Remote URL (Firebase Storage, CDN, etc.)
    audioUri: 'https://example.com/audio/clip1.mp3', // Replace with actual audio
    difficulty: 'easy'
  },
  // Add more songs here
];

export const getRandomPrompt = (difficulty = null) => {
  let availableSongs = songPrompts;
  
  if (difficulty) {
    availableSongs = songPrompts.filter(song => song.difficulty === difficulty);
  }
  
  if (availableSongs.length === 0) {
    availableSongs = songPrompts; // Fallback to all songs
  }
  
  const randomIndex = Math.floor(Math.random() * availableSongs.length);
  return availableSongs[randomIndex];
};

export const formatPrompt = (prompt) => {
  const { lyrics, blankPosition } = prompt;
  return lyrics.map((line, index) => ({
    text: line,
    isBlank: index === blankPosition
  }));
};

