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
import {
  MAX_PLAYERS,
  MAX_VOTES,
  MIN_PLAYERS,
  PROMPT_DURATION_MS,
  VOTING_DURATION_MS
} from '../constants/gameSettings';
import {
  getConnectedPlayerCount,
  getConnectedPlayerIds,
  getRequiredVoteCount,
  hasVoterCompletedBallot
} from '../utils/voteUtils';

/**
 * Game Service - Handles all Firestore operations for game state
 * 
 * Game State Structure:
 * games/{gameId}
 *   - hostId: string
 *   - hostIsDisplayOnly: boolean
 *   - phase: 'lobby' | 'prompt' | 'submission' | 'voting' | 'results'
 *   - votingPlayerIds: string[] | null
 *   - votingRequiredCount: number | null
 *   - gameOverReason: 'not_enough_players' | null
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
    hostIsDisplayOnly: !hostIsPlayer,
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

  // Allow rejoin if player already exists.
  if (gameData.players?.[playerId]) {
    await updateDoc(gameRef, {
      [`players.${playerId}.connected`]: true
    });
    const refreshedSnap = await getDoc(gameRef);
    return {
      gameData: refreshedSnap.exists() ? refreshedSnap.data() : gameData,
      resolvedPlayerId: playerId
    };
  }
  
  const normalizedName = playerName.trim().toLowerCase();
  const disconnectedMatch = Object.entries(gameData.players || {}).find(([, player]) => {
    if (player?.connected !== false) return false;
    return player?.name?.trim().toLowerCase() === normalizedName;
  });

  if (disconnectedMatch) {
    const [rejoinPlayerId] = disconnectedMatch;
    await updateDoc(gameRef, {
      [`players.${rejoinPlayerId}.connected`]: true
    });
    const refreshedSnap = await getDoc(gameRef);
    return {
      gameData: refreshedSnap.exists() ? refreshedSnap.data() : gameData,
      resolvedPlayerId: rejoinPlayerId
    };
  }

  if (gameData.phase !== 'lobby') {
    throw new Error('Game has already started. Rejoin with your original name.');
  }
  
  // Check maximum player limit
  const currentPlayerCount = Object.keys(gameData.players || {}).length;
  if (currentPlayerCount >= MAX_PLAYERS) {
    throw new Error(`Game is full (maximum ${MAX_PLAYERS} players)`);
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

  const refreshedSnap = await getDoc(gameRef);
  return {
    gameData: refreshedSnap.exists() ? refreshedSnap.data() : gameData,
    resolvedPlayerId: playerId
  };
};

export const startGame = async (gameId, prompt = null) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data();
  const connectedCount = getConnectedPlayerCount(gameData.players || {});
  if (connectedCount < MIN_PLAYERS) {
    throw new Error(`Need at least ${MIN_PLAYERS} players to start the game.`);
  }

  // Prompt timer: 1 minute 30 seconds
  const timerEndsAt = new Date(Date.now() + PROMPT_DURATION_MS);
  
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
  try {
    await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);
      if (!gameSnap.exists()) return;

      const gameData = gameSnap.data();
      if (gameData.phase !== 'prompt') return;

      const players = gameData.players || {};
      const playerIds = getConnectedPlayerIds(players);
      if (playerIds.length < MIN_PLAYERS) {
        transaction.update(gameRef, {
          phase: 'gameOver',
          gameOverReason: 'not_enough_players',
          timerEndsAt: null,
          winnerIds: []
        });
        return;
      }

      const allSubmitted = playerIds.every((playerId) => players[playerId].submission !== null);

      const timerEndsAt = gameData.timerEndsAt ? new Date(gameData.timerEndsAt).getTime() : null;
      const now = Date.now();
      const timerExpired = timerEndsAt && timerEndsAt <= now;

      if (!allSubmitted && !timerExpired) return;

      const votingEndsAt = new Date(Date.now() + VOTING_DURATION_MS);
      const votingRequiredCount = getRequiredVoteCount(playerIds.length);
      const updates = {
        phase: 'voting',
        timerEndsAt: votingEndsAt.toISOString(),
        votingPlayerIds: playerIds,
        votingRequiredCount
      };

      playerIds.forEach((playerId) => {
        const player = players[playerId];
        if (player?.submission === null) {
          updates[`players.${playerId}.submission`] = `${player.name} did not answer`;
        }
      });

      transaction.update(gameRef, updates);
    });
  } catch (error) {
    console.error('Error progressing to voting:', error);
  }
};

export const submitAnswer = async (gameId, playerId, answer) => {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, {
    [`players.${playerId}.submission`]: answer
  });
};

export const submitVotes = async (gameId, voterId, rankedPlayerIds, requiredCount = MAX_VOTES) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const votingPlayerIds = Array.isArray(gameData.votingPlayerIds)
    ? gameData.votingPlayerIds
    : getConnectedPlayerIds(gameData.players || {});
  const computedRequiredCount =
    typeof gameData.votingRequiredCount === 'number'
      ? gameData.votingRequiredCount
      : getRequiredVoteCount(votingPlayerIds.length);
  const uniqueIds = new Set(rankedPlayerIds.filter(Boolean));
  if (uniqueIds.size !== computedRequiredCount) {
    throw new Error(`You must pick ${computedRequiredCount} different answers.`);
  }
  const invalidVote = Array.from(uniqueIds).some((playerId) => !votingPlayerIds.includes(playerId));
  if (invalidVote) {
    throw new Error('You can only vote for current answers.');
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
    const totalFirstVoteTotals = {};

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
        const currentFirstVotes = gameData.players[player.playerId]?.totalFirstPlaceVotes || 0;
        totalScores[player.playerId] = currentScore + scoreForRank;
        totalFirstVoteTotals[player.playerId] = currentFirstVotes + player.firstPlaceVotes;
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
      const maxFirstVotes = Math.max(...topScoreIds.map((id) => totalFirstVoteTotals[id] || 0));
      winnerIds = topScoreIds.filter((id) => (totalFirstVoteTotals[id] || 0) === maxFirstVotes);
      updates.phase = 'gameOver';
      updates.winnerIds = winnerIds;
    }

    const playerCount = Object.keys(gameData.players || {}).length;
    if (playerCount < MIN_PLAYERS && winnerIds.length === 0) {
      const topScore = Math.max(...Object.values(totalScores));
      const topScoreIds = Object.keys(totalScores).filter((id) => totalScores[id] === topScore);
      const maxFirstVotes = Math.max(...topScoreIds.map((id) => totalFirstVoteTotals[id] || 0));
      winnerIds = topScoreIds.filter((id) => (totalFirstVoteTotals[id] || 0) === maxFirstVotes);
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
  const connectedPlayerIds = getConnectedPlayerIds(players);
  if (connectedPlayerIds.length < MIN_PLAYERS) {
    try {
      await updateDoc(gameRef, {
        phase: 'gameOver',
        gameOverReason: 'not_enough_players',
        timerEndsAt: null,
        winnerIds: []
      });
    } catch (error) {
      console.error('Error ending game due to player count:', error);
    }
    return;
  }
  const votingPlayerIds = Array.isArray(gameData.votingPlayerIds)
    ? gameData.votingPlayerIds
    : connectedPlayerIds;
  const requiredCount =
    typeof gameData.votingRequiredCount === 'number'
      ? gameData.votingRequiredCount
      : getRequiredVoteCount(votingPlayerIds.length);
  const allVoted = votingPlayerIds.every((voterId) =>
    hasVoterCompletedBallot(players, voterId, requiredCount)
  );
  
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
    winnerIds: deleteField(),
    gameOverReason: deleteField(),
    votingPlayerIds: deleteField(),
    votingRequiredCount: deleteField()
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
  await runTransaction(db, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    if (!gameSnap.exists()) return;

    const gameData = gameSnap.data();
    if (!gameData.players?.[playerId]) return;

    const updates = {
      [`players.${playerId}.connected`]: false
    };

    const connectedPlayers = Object.entries(gameData.players || {})
      .filter(([id, player]) => id !== playerId && player?.connected !== false)
      .length;

    if (
      gameData.phase !== 'lobby' &&
      gameData.phase !== 'gameOver' &&
      connectedPlayers < MIN_PLAYERS
    ) {
      updates.phase = 'gameOver';
      updates.gameOverReason = 'not_enough_players';
      updates.timerEndsAt = null;
      updates.winnerIds = [];
    }

    transaction.update(gameRef, updates);
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

