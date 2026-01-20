import {
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
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
 *   - currentPrompt: { promptId, title, prompt }
 *   - timerEndsAt: timestamp
 *   - players: {
 *       [playerId]: {
 *         name: string,
 *         score: number,
 *         totalFirstPlaceVotes: number,
 *         connected: boolean,
 *         submission: string | null,
 *         votes: { [playerId]: number } | null // voterId -> rank (1,2,3)
 *       }
 *     }
 *   - createdAt: timestamp
 */

export const createGame = async (hostId, hostName, options = {}) => {
  const { hostIsPlayer = true } = options;
  let gameId = '';
  let gameRef = null;
  let attempts = 0;

  while (attempts < 5) {
    gameId = generateGameCode();
    gameRef = doc(db, 'games', gameId);
    const existing = await getDoc(gameRef);
    if (!existing.exists()) break;
    attempts += 1;
  }

  if (!gameId || attempts >= 5) {
    throw new Error('Unable to generate a unique game code. Try again.');
  }
  
  const gameData = {
    hostId,
    phase: 'lobby',
    round: 0,
    currentPrompt: null,
    timerEndsAt: null,
    usedPrompts: [], // Track which prompts have been used
    players: {},
    createdAt: serverTimestamp()
  };

  if (hostIsPlayer) {
    gameData.players[hostId] = {
      name: hostName,
      score: 0,
      totalFirstPlaceVotes: 0,
      connected: true,
      submission: null,
      votes: null
    };
  }
  
  await setDoc(gameRef, gameData);
  return gameId;
};

export const joinGame = async (gameId, playerId, playerName) => {
  const normalizedGameId = gameId.toUpperCase();
  const gameRef = doc(db, 'games', normalizedGameId);
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
      totalFirstPlaceVotes: 0,
      connected: true,
      submission: null,
      votes: null
    }
  });

  return gameData;
};

export const startGame = async (gameId, prompt = null) => {
  const gameRef = doc(db, 'games', gameId);
  
  // Prompt timer: 1 minute 30 seconds
  const timerEndsAt = new Date(Date.now() + 90000);
  
  const updateData = {
    phase: 'prompt',
    round: 1,
    timerEndsAt: timerEndsAt.toISOString()
  };
  
  if (prompt) {
    updateData.currentPrompt = prompt;
    updateData.usedPrompts = [prompt.promptId]; // Track the first prompt as used
  }
  
  await updateDoc(gameRef, updateData);
};

export const checkAndProgressToVoting = async (gameId) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) return;
  
  const gameData = gameSnap.data();
  
  // Only check if we're in prompt phase
  if (gameData.phase !== 'prompt') return;
  
  const players = gameData.players || {};
  const playerIds = Object.keys(players);
  const allSubmitted = playerIds.every(playerId => players[playerId].submission !== null);
  
  // Check if timer has expired (with 1 second buffer for timing)
  const timerEndsAt = gameData.timerEndsAt ? new Date(gameData.timerEndsAt).getTime() : null;
  const now = Date.now();
  const timerExpired = timerEndsAt && timerEndsAt <= now;
  
  // If all players submitted OR timer expired, move to voting phase
  if (allSubmitted || timerExpired) {
    try {
      // Double-check phase hasn't changed (prevent race conditions)
      const currentSnap = await getDoc(gameRef);
      if (currentSnap.exists() && currentSnap.data().phase === 'prompt') {
        const votingEndsAt = new Date(Date.now() + 120000);
        const updates = { phase: 'voting', timerEndsAt: votingEndsAt.toISOString() };

        // Fill in missing submissions so voting can proceed.
        Object.entries(players).forEach(([playerId, player]) => {
          if (player.submission === null) {
            updates[`players.${playerId}.submission`] = `${player.name} did not answer`;
          }
        });

        await updateDoc(gameRef, updates);
      }
    } catch (error) {
      console.error('Error progressing to voting:', error);
    }
  }
};

export const submitAnswer = async (gameId, playerId, answer) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    [`players.${playerId}.submission`]: answer
  });
};

export const submitVotes = async (gameId, voterId, rankedPlayerIds) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const uniqueIds = new Set(rankedPlayerIds.filter(Boolean));
  if (uniqueIds.size !== 3) {
    throw new Error('You must pick three different answers.');
  }
  if (uniqueIds.has(voterId)) {
    throw new Error('You cannot vote for your own answer.');
  }

  const gameData = gameSnap.data();
  const updates = {};

  // Clear previous votes by this voter.
  Object.keys(gameData.players || {}).forEach((playerId) => {
    const existingRank = gameData.players[playerId]?.votes?.[voterId];
    if (existingRank !== undefined) {
      updates[`players.${playerId}.votes.${voterId}`] = deleteField();
    }
  });

  rankedPlayerIds.forEach((playerId, index) => {
    if (!playerId) return;
    updates[`players.${playerId}.votes.${voterId}`] = index + 1; // rank 1/2/3
  });

  await updateDoc(gameRef, updates);
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
  let result = { gameOver: false, winnerIds: [] };

  await runTransaction(db, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    if (!gameSnap.exists()) return;
    const gameData = gameSnap.data();

    if (gameData.scoredRound === gameData.round) {
      result = { gameOver: gameData.phase === 'gameOver', winnerIds: gameData.winnerIds || [] };
      return;
    }

    const updates = {};
    let winnerIds = [];

    const votePoints = { 1: 5, 2: 3, 3: 1 };
    const playerStats = Object.entries(gameData.players || {}).map(([playerId, player]) => {
      const votes = player.votes || {};
      const points = Object.values(votes).reduce((sum, rank) => sum + (votePoints[rank] || 0), 0);
      const firstPlaceVotes = Object.values(votes).filter((rank) => rank === 1).length;
      return { playerId, points, firstPlaceVotes, answer: player.submission || 'No answer' };
    });

    playerStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.firstPlaceVotes - a.firstPlaceVotes;
    });

    const rankScores = (rank) => Math.max(100, 1100 - rank * 100);
    let rank = 1;
    let index = 0;
    const totalScores = {};

    while (index < playerStats.length) {
      const current = playerStats[index];
      const tieGroup = [current];
      let nextIndex = index + 1;

      while (
        nextIndex < playerStats.length &&
        playerStats[nextIndex].points === current.points &&
        playerStats[nextIndex].firstPlaceVotes === current.firstPlaceVotes
      ) {
        tieGroup.push(playerStats[nextIndex]);
        nextIndex += 1;
      }

      const scoreForRank = rankScores(rank);
      tieGroup.forEach((player) => {
        const currentScore = gameData.players[player.playerId]?.score || 0;
        totalScores[player.playerId] = currentScore + scoreForRank;
        updates[`players.${player.playerId}.score`] = increment(scoreForRank);
        updates[`players.${player.playerId}.totalFirstPlaceVotes`] = increment(player.firstPlaceVotes);
        updates[`players.${player.playerId}.submission`] = null;
        updates[`players.${player.playerId}.votes`] = null;
      });

      rank += tieGroup.length;
      index = nextIndex;
    }

    if (playerStats.length > 0) {
      const topAnswerPoints = playerStats[0].points;
      const topAnswers = playerStats.filter((stat) => stat.points === topAnswerPoints);
      updates.roundResult = {
        round: gameData.round,
        topAnswerPoints,
        topAnswers: topAnswers.map((stat) => ({
          playerId: stat.playerId,
          answer: stat.answer
        }))
      };
    }

    const thresholdWinners = Object.keys(totalScores).filter((playerId) => totalScores[playerId] >= 10000);
    if (thresholdWinners.length > 0) {
      const topScore = Math.max(...thresholdWinners.map((id) => totalScores[id]));
      const topScoreIds = thresholdWinners.filter((id) => totalScores[id] === topScore);
      const totalFirstVotes = {};
      topScoreIds.forEach((id) => {
        const existingTotal = gameData.players[id]?.totalFirstPlaceVotes || 0;
        const roundFirsts = playerStats.find((stat) => stat.playerId === id)?.firstPlaceVotes || 0;
        totalFirstVotes[id] = existingTotal + roundFirsts;
      });
      const maxFirstVotes = Math.max(...topScoreIds.map((id) => totalFirstVotes[id]));
      winnerIds = topScoreIds.filter((id) => totalFirstVotes[id] === maxFirstVotes);
      updates.phase = 'gameOver';
      updates.winnerIds = winnerIds;
    }

    updates.scoredRound = gameData.round;
    transaction.update(gameRef, updates);
    result = { gameOver: winnerIds.length > 0, winnerIds };
  });

  return result;
};

export const checkAndProgressToResults = async (gameId) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) return;
  
  const gameData = gameSnap.data();
  
  // Only check if we're in voting phase
  if (gameData.phase !== 'voting') return;
  if (gameData.scoredRound === gameData.round) return;
  
  const players = gameData.players || {};
  const playerIds = Object.keys(players);
  
  // Each voter must submit exactly 3 ranked votes.
  const allVoted = playerIds.every((voterId) => {
    let voteCount = 0;
    playerIds.forEach((playerId) => {
      if (playerId === voterId) return;
      const target = players[playerId];
      if (target?.votes && target.votes[voterId] !== undefined) {
        voteCount += 1;
      }
    });
    return voteCount === 3;
  });
  
  // If all players voted, calculate scores and move to results phase
  const timerEndsAt = gameData.timerEndsAt ? new Date(gameData.timerEndsAt).getTime() : null;
  const now = Date.now();
  const timerExpired = timerEndsAt && timerEndsAt <= now;

  if (allVoted || timerExpired) {
    try {
      // Double-check phase hasn't changed
      const currentSnap = await getDoc(gameRef);
      if (currentSnap.exists() && currentSnap.data().phase === 'voting') {
        // Calculate scores first
        const { gameOver } = await calculateScores(gameId);
        if (!gameOver) {
          await updateDoc(gameRef, { phase: 'results' });
        }
      }
    } catch (error) {
      console.error('Error progressing to results:', error);
    }
  }
};

export const resetGame = async (gameId) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }
  const gameData = gameSnap.data();
  const updates = {
    phase: 'lobby',
    round: 0,
    timerEndsAt: null,
    currentPrompt: null,
    usedPrompts: [],
    winnerIds: deleteField()
  };

  Object.keys(gameData.players || {}).forEach((playerId) => {
    updates[`players.${playerId}.score`] = 0;
    updates[`players.${playerId}.totalFirstPlaceVotes`] = 0;
    updates[`players.${playerId}.submission`] = null;
    updates[`players.${playerId}.votes`] = null;
  });

  await updateDoc(gameRef, updates);
};

export const leaveGame = async (gameId, playerId) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    [`players.${playerId}`]: deleteField()
  });
};

// Generate a 4-character game code (letters only for quick entry)
const generateGameCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

