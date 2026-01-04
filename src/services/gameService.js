import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Game Service - Handles all Firestore operations for game state
 * 
 * Game State Structure:
 * games/{gameId}
 *   - hostId: string
 *   - phase: 'lobby' | 'prompt' | 'submission' | 'voting' | 'results'
 *   - round: number
 *   - maxRounds: number
 *   - currentPrompt: { songId, lyrics, blankPosition }
 *   - timerEndsAt: timestamp
 *   - players: {
 *       [playerId]: {
 *         name: string,
 *         score: number,
 *         connected: boolean,
 *         submission: string | null,
 *         votes: { [playerId]: number } | null
 *       }
 *     }
 *   - createdAt: timestamp
 */

export const createGame = async (hostId, hostName, maxRounds = 5) => {
  const gameId = generateGameCode();
  const gameRef = doc(db, 'games', gameId);
  
  const gameData = {
    hostId,
    phase: 'lobby',
    round: 0,
    maxRounds,
    currentPrompt: null,
    timerEndsAt: null,
    players: {
      [hostId]: {
        name: hostName,
        score: 0,
        connected: true,
        submission: null,
        votes: null
      }
    },
    createdAt: serverTimestamp()
  };
  
  await setDoc(gameRef, gameData);
  return gameId;
};

export const joinGame = async (gameId, playerId, playerName) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }
  
  const gameData = gameSnap.data();
  
  if (gameData.phase !== 'lobby') {
    throw new Error('Game has already started');
  }
  
  // Check maximum player limit (10 players)
  const currentPlayerCount = Object.keys(gameData.players || {}).length;
  if (currentPlayerCount >= 10) {
    throw new Error('Game is full (maximum 10 players)');
  }
  
  await updateDoc(gameRef, {
    [`players.${playerId}`]: {
      name: playerName,
      score: 0,
      connected: true,
      submission: null,
      votes: null
    }
  });
  
  return gameData;
};

export const startGame = async (gameId, prompt = null) => {
  const gameRef = doc(db, 'games', gameId);
  const updateData = {
    phase: 'prompt',
    round: 1
  };
  
  if (prompt) {
    updateData.currentPrompt = prompt;
  }
  
  await updateDoc(gameRef, updateData);
};

export const submitAnswer = async (gameId, playerId, answer) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    [`players.${playerId}.submission`]: answer
  });
};

export const submitVote = async (gameId, voterId, votedPlayerId, points) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    [`players.${votedPlayerId}.votes.${voterId}`]: points
  });
};

export const subscribeToGame = (gameId, callback) => {
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }
  });
};

export const updateGamePhase = async (gameId, phase, additionalData = {}) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    phase,
    ...additionalData
  });
};

export const calculateScores = async (gameId) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  const gameData = gameSnap.data();
  
  const updates = {};
  
  // Calculate scores from votes
  Object.keys(gameData.players).forEach(playerId => {
    const player = gameData.players[playerId];
    if (player.votes) {
      const totalVotes = Object.values(player.votes).reduce((sum, points) => sum + points, 0);
      updates[`players.${playerId}.score`] = increment(totalVotes);
      updates[`players.${playerId}.submission`] = null;
      updates[`players.${playerId}.votes`] = null;
    }
  });
  
  await updateDoc(gameRef, updates);
};

// Generate a 6-character game code
const generateGameCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

