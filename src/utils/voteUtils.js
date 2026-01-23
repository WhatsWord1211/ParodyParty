import { MAX_VOTES } from '../constants/gameSettings';

export const getConnectedPlayerIds = (players) =>
  Object.entries(players || {})
    .filter(([, player]) => player?.connected !== false)
    .map(([playerId]) => playerId);

export const getConnectedPlayerCount = (players) => getConnectedPlayerIds(players).length;

export const getRequiredVoteCount = (playerCount) =>
  Math.min(MAX_VOTES, Math.max(0, playerCount - 1));

export const countVotesCastByVoter = (players, voterId) => {
  if (!players || !voterId) return 0;
  return Object.values(players).reduce((count, player) => {
    if (player?.votes && player.votes[voterId] !== undefined) {
      return count + 1;
    }
    return count;
  }, 0);
};

export const hasVoterCompletedBallot = (players, voterId, requiredCount) =>
  countVotesCastByVoter(players, voterId) === requiredCount;
