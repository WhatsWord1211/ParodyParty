import { describe, expect, it } from 'vitest';
import {
  countVotesCastByVoter,
  getConnectedPlayerCount,
  getConnectedPlayerIds,
  getRequiredVoteCount,
  hasVoterCompletedBallot
} from './voteUtils';

describe('voteUtils', () => {
  it('calculates required vote count', () => {
    expect(getRequiredVoteCount(1)).toBe(0);
    expect(getRequiredVoteCount(2)).toBe(1);
    expect(getRequiredVoteCount(4)).toBe(3);
    expect(getRequiredVoteCount(6)).toBe(3);
  });

  it('counts connected players', () => {
    const players = {
      alpha: { connected: true },
      beta: { connected: false },
      gamma: {}
    };

    expect(getConnectedPlayerIds(players)).toEqual(['alpha', 'gamma']);
    expect(getConnectedPlayerCount(players)).toBe(2);
  });

  it('counts votes cast by a voter', () => {
    const players = {
      alpha: { votes: { voter1: 1, voter2: 2 } },
      beta: { votes: { voter1: 2 } },
      gamma: { votes: { voter2: 1 } }
    };

    expect(countVotesCastByVoter(players, 'voter1')).toBe(2);
    expect(countVotesCastByVoter(players, 'voter2')).toBe(2);
    expect(countVotesCastByVoter(players, 'voter3')).toBe(0);
  });

  it('detects completed ballots', () => {
    const players = {
      alpha: { votes: { voter1: 1 } },
      beta: { votes: { voter1: 2 } }
    };

    expect(hasVoterCompletedBallot(players, 'voter1', 2)).toBe(true);
    expect(hasVoterCompletedBallot(players, 'voter1', 3)).toBe(false);
  });
});
