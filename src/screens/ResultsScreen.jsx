import React, { useEffect, useRef, useState } from 'react';
import {
  checkAndProgressToResults,
  leaveGame,
  resetGame,
  submitVotes,
  subscribeToGame,
  updateGamePhase
} from '../services/gameService';
import { getRandomPrompt } from '../utils/gameData';
import { playRoundAudio, stopRoundAudio } from '../services/audioService';
import SoundToggle from '../components/SoundToggle';
import useSoundPreference from '../hooks/useSoundPreference';
import { PROMPT_DURATION_MS, RESULTS_DURATION_MS } from '../constants/gameSettings';
import {
  getConnectedPlayerIds,
  getRequiredVoteCount,
  hasVoterCompletedBallot
} from '../utils/voteUtils';

export default function ResultsScreen({ gameId, playerId, isDisplayOnly, onNavigate }) {
  const [gameData, setGameData] = useState(null);
  const [rankedVotes, setRankedVotes] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef(null);
  const hasRequestedResultsRef = useRef(false);
  const connectedPlayerIds = getConnectedPlayerIds(gameData?.players).filter(
    (id) => !(gameData?.hostIsDisplayOnly && id === gameData?.hostId)
  );
  const votingPlayerIds = (Array.isArray(gameData?.votingPlayerIds)
    ? gameData.votingPlayerIds
    : connectedPlayerIds
  ).filter((id) => !(gameData?.hostIsDisplayOnly && id === gameData?.hostId));
  const requiredVoteCount =
    typeof gameData?.votingRequiredCount === 'number'
      ? gameData.votingRequiredCount
      : getRequiredVoteCount(votingPlayerIds.length);
  const { soundEnabled, setSoundEnabled, hasInitialized } = useSoundPreference({
    gameId,
    hostIsDisplayOnly: gameData?.hostIsDisplayOnly,
    isDisplayOnly,
    isReady: Boolean(gameData)
  });
  const isHost = gameData?.hostId === playerId;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const requestResultsProgress = async (source) => {
    if (hasRequestedResultsRef.current) return;
    hasRequestedResultsRef.current = true;
    try {
      const progressed = await checkAndProgressToResults(gameId);
      if (!progressed) {
        hasRequestedResultsRef.current = false;
      }
    } catch (error) {
      console.error(`Failed to progress results from ${source}:`, error);
      hasRequestedResultsRef.current = false;
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);

        if (!isDisplayOnly) {
          const connectedIds = getConnectedPlayerIds(data.players || {}).filter(
            (id) => !(data.hostIsDisplayOnly && id === data.hostId)
          );
          const activeVotingIds = (Array.isArray(data.votingPlayerIds)
            ? data.votingPlayerIds
            : connectedIds
          ).filter((id) => !(data.hostIsDisplayOnly && id === data.hostId));
          const requiredCount =
            typeof data.votingRequiredCount === 'number'
              ? data.votingRequiredCount
              : getRequiredVoteCount(activeVotingIds.length);
          const canVote = activeVotingIds.includes(playerId);
          const voted = canVote && hasVoterCompletedBallot(data.players, playerId, requiredCount);
          setHasVoted(voted);
          setLocalSubmitted(voted);
          setStatusMessage(voted ? 'Your votes are submitted. Waiting on other players...' : '');
        } else {
          setHasVoted(false);
          setLocalSubmitted(false);
          setStatusMessage('');
        }

        if (data.phase === 'prompt' && data.round > 1) {
          onNavigate('game', { gameId, playerId, isDisplayOnly });
        }

        if (data.phase === 'lobby') {
          onNavigate('lobby', { gameId, playerId, isHost: data.hostId === playerId, isDisplayOnly });
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, onNavigate, playerId]);

  useEffect(() => {
    if (!hasInitialized) return;
    if (gameData?.phase === 'voting' && soundEnabled) {
      playRoundAudio('voting');
    } else {
      stopRoundAudio();
    }
  }, [gameData?.phase, soundEnabled, hasInitialized]);

  useEffect(() => {
    if (gameData?.phase === 'voting') {
      setLocalSubmitted(false);
      setStatusMessage('');
      setRankedVotes([]);
    }
  }, [gameData?.phase]);

  useEffect(() => {
    hasRequestedResultsRef.current = false;
  }, [gameData?.phase]);

  useEffect(() => {
    if (gameData?.phase === 'voting' && gameData.timerEndsAt) {
      const endTime = new Date(gameData.timerEndsAt).getTime();
      const tick = () => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
      };
      tick();
      timerIntervalRef.current = setInterval(tick, 1000);
      return () => {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      };
    }
    setTimeRemaining(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [gameData?.phase, gameData?.timerEndsAt]);

  useEffect(() => {
    if (gameData?.phase === 'voting' && timeRemaining === 0) {
      requestResultsProgress('timer');
    }
  }, [gameData?.phase, timeRemaining, gameId]);

  useEffect(() => {
    if (gameData?.phase !== 'voting' || !gameData?.players) return;
    const playerIds = votingPlayerIds;
    const allVoted = playerIds.every((voterId) =>
      hasVoterCompletedBallot(gameData.players, voterId, requiredVoteCount)
    );
    if (allVoted && !hasRequestedResultsRef.current) {
      requestResultsProgress('all-voted');
    }
  }, [gameData?.phase, gameData?.players, gameId, requiredVoteCount, votingPlayerIds]);

  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const shuffleKeyRef = useRef(null);

  useEffect(() => {
    if (gameData?.phase === 'voting' && gameData.players) {
      const shuffleKey = `${gameId}-${gameData.round}`;
      if (shuffleKeyRef.current === shuffleKey && shuffledAnswers.length > 0) {
        return;
      }
      const players = Object.entries(gameData.players || {})
        .filter(([id, player]) => id !== playerId && votingPlayerIds.includes(id))
        .map(([id, player]) => ({
          playerId: id,
          answer: player.submission || 'No answer',
          name: player.name
        }))
        .sort((a, b) => a.playerId.localeCompare(b.playerId));

      const shuffled = [...players];
      const seedString = `${gameId}-${gameData.round || 0}-${playerId}`;
      let seed = 0;
      for (let i = 0; i < seedString.length; i += 1) {
        seed = (seed * 31 + seedString.charCodeAt(i)) % 233280;
      }
      const seededRandom = (() => {
        let value = seed;
        return () => {
          value = (value * 9301 + 49297) % 233280;
          return value / 233280;
        };
      })();

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setShuffledAnswers(shuffled);
      shuffleKeyRef.current = shuffleKey;
    } else {
      setShuffledAnswers([]);
      shuffleKeyRef.current = null;
    }
  }, [gameData?.phase, gameData?.round, gameId, playerId, shuffledAnswers.length, gameData?.players]);

  useEffect(() => {
    if (gameData?.phase === 'results' && isHost) {
      const timer = setTimeout(async () => {
        if (gameData.pendingGameOver) {
          await updateGamePhase(gameId, 'gameOver', { pendingGameOver: false });
          return;
        }
        const usedPromptIds = gameData.usedPrompts || [];
        const nextPrompt = getRandomPrompt(null, usedPromptIds);
        const timerEndsAt = new Date(Date.now() + PROMPT_DURATION_MS);
        await updateGamePhase(gameId, 'prompt', {
          round: gameData.round + 1,
          timerEndsAt: timerEndsAt.toISOString(),
          currentPrompt: nextPrompt,
          usedPrompts: [...usedPromptIds, nextPrompt.promptId],
          roundResult: null,
          votingPlayerIds: null,
          votingRequiredCount: null
        });
      }, RESULTS_DURATION_MS);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gameData?.phase, gameData?.round, gameData?.usedPrompts, gameData?.pendingGameOver, gameId, isHost]);

  const handleRankPick = (answerIndex) => {
    if (hasVoted || localSubmitted) return;
    const votedPlayerId = shuffledAnswers[answerIndex].playerId;
    setRankedVotes((prev) => {
      if (prev.includes(votedPlayerId)) {
        return prev.filter((id) => id !== votedPlayerId);
      }
      if (prev.length >= requiredVoteCount) {
        return prev;
      }
      return [...prev, votedPlayerId];
    });
  };

  const handleSubmitVotes = async () => {
    if (hasVoted || localSubmitted || !votingPlayerIds.includes(playerId)) return;
    const rankedPlayerIds = rankedVotes;
    if (rankedPlayerIds.length !== requiredVoteCount) {
      setStatusMessage(`Pick ${requiredVoteCount} different answers before submitting.`);
      return;
    }
    try {
      await submitVotes(gameId, playerId, rankedPlayerIds, requiredVoteCount);
      setLocalSubmitted(true);
      setStatusMessage('Your votes are submitted. Waiting on other players...');
      setTimeout(() => {
        requestResultsProgress('submit');
      }, 100);
    } catch (error) {
      console.error('Failed to submit votes:', error);
      setStatusMessage(error.message || 'Failed to submit votes.');
    }
  };

  if (!gameData) {
    return (
      <div className="page">
        <div className="card center">Loading...</div>
      </div>
    );
  }

  if (gameData.phase === 'voting') {
    const canVote =
      !isDisplayOnly &&
      !hasVoted &&
      !localSubmitted &&
      votingPlayerIds.includes(playerId);
    return (
      <div className={`page ${isDisplayOnly ? 'display-only' : ''}`}>
        <div className="card">
          <SoundToggle
            soundEnabled={soundEnabled}
            onToggle={() => setSoundEnabled((prev) => !prev)}
            disabled={!hasInitialized}
          />
          <div className="center">
            <h2>Round {gameData.round} - Vote for Answers</h2>
            <p className="subtitle">Pick your top {requiredVoteCount} favorites.</p>
            <div className="timer">
              {timeRemaining > 0 ? formatTime(timeRemaining) : "Time's up!"}
            </div>
          </div>

          {gameData.currentPrompt?.prompt && (
            <div className="prompt-card">
              <h3>Prompt</h3>
              <p className="center">{gameData.currentPrompt.prompt}</p>
            </div>
          )}

          {isDisplayOnly ? (
            <div className="answers-grid">
              {shuffledAnswers.map((item, index) => (
                <div className="prompt-card" key={`${item.playerId}-${index}`}>
                  <p className="center">{item.answer}</p>
                </div>
              ))}
            </div>
          ) : (
            shuffledAnswers.map((item, index) => {
              const rankIndex = rankedVotes.indexOf(item.playerId);
              const rankLabel = rankIndex === -1 ? null : `#${rankIndex + 1}`;
              return (
              <div className="prompt-card" key={`${item.playerId}-${index}`}>
                <div className="center">
                  <p>{item.answer}</p>
                  {rankLabel && <div className="vote-badge">{rankLabel}</div>}
                </div>
                {canVote && (
                  <div className="button-row">
                    <button
                      className={`button button-secondary ${rankLabel ? 'button-selected' : ''}`}
                      onClick={() => handleRankPick(index)}
                    >
                      {rankLabel ? `Picked ${rankLabel}` : 'Pick'}
                    </button>
                  </div>
                )}
              </div>
            );
            })
          )}

          {!isDisplayOnly && canVote && (
            <>
              {statusMessage && <p className="center">{statusMessage}</p>}
              <div className="center" style={{ marginTop: 12 }}>
                <p>
                  Your picks:
                  {Array.from({ length: requiredVoteCount }).map((_, index) => (
                    <span key={index}>
                      {' '}
                      #{rankedVotes[index] ? index + 1 : '_'}
                    </span>
                  ))}
                </p>
              </div>
              <button
                className="button button-primary"
                onClick={handleSubmitVotes}
                disabled={rankedVotes.length !== requiredVoteCount}
              >
                Submit Top {requiredVoteCount}
              </button>
            </>
          )}

          {!isDisplayOnly && !canVote && (
            <p className="center">{statusMessage || 'Waiting for other players to vote...'}</p>
          )}

          {isDisplayOnly && <p className="center">Voting in progress...</p>}
        </div>
      </div>
    );
  }

  if (gameData.phase === 'gameOver') {
    const winners = gameData.winnerIds || [];
    const allPlayers = Object.entries(gameData.players || {}).map(([id, player]) => ({
      id,
      ...player
    }));
    const sortedPlayers = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
    const isHost = gameData.hostId === playerId;
    const topFirstVotes = Math.max(
      0,
      ...allPlayers.map((player) => player.totalFirstPlaceVotes || 0)
    );
    const topFirstVotePlayers = allPlayers.filter(
      (player) => (player.totalFirstPlaceVotes || 0) === topFirstVotes
    );

    return (
      <div className="page">
        <div className="card">
          <SoundToggle
            soundEnabled={soundEnabled}
            onToggle={() => setSoundEnabled((prev) => !prev)}
            disabled={!hasInitialized}
          />
          <div className="center">
            <h2>Game Over</h2>
            {gameData.gameOverReason === 'not_enough_players' && (
              <p className="subtitle">Game ended because there were not enough players.</p>
            )}
            {winners.length > 0 && (
              <p className="subtitle">
                Winner{winners.length > 1 ? 's' : ''}:{' '}
                {winners.map((id) => gameData.players?.[id]?.name || 'Player').join(', ')}
              </p>
            )}
            {topFirstVotePlayers.length > 0 && (
              <p className="subtitle">
                Most #1 votes: {topFirstVotePlayers.map((player) => player.name).join(', ')} (
                {topFirstVotes})
              </p>
            )}
          </div>

          <div className="score-banner">Race to 10,000 points</div>

          <div className="score-list">
            {sortedPlayers.map((player, index) => (
              <div className="score-card" key={player.id}>
                <strong>
                  #{index + 1} {player.name} {player.id === playerId ? '(You)' : ''}
                </strong>
                <div>Score: {player.score || 0}</div>
              </div>
            ))}
          </div>

          <div className="button-row" style={{ marginTop: 16 }}>
            {isHost && (
              <button
                className="button button-primary"
                onClick={() => resetGame(gameId).catch(console.error)}
              >
                Play Again
              </button>
            )}
            <button
              className="button button-outline"
              onClick={() => {
                leaveGame(gameId, playerId).catch(console.error);
                onNavigate('home');
              }}
            >
              Leave Game
            </button>
          </div>
          {!isHost && <p className="center">Waiting for host to start a new game...</p>}
        </div>
      </div>
    );
  }

  const allPlayers = Object.entries(gameData.players || {}).map(([id, player]) => ({
    id,
    ...player
  }));
  const sortedPlayers = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="page">
      <div className="card">
        <SoundToggle
          soundEnabled={soundEnabled}
          onToggle={() => setSoundEnabled((prev) => !prev)}
          disabled={!hasInitialized}
        />
        <div className="center">
          <h2>Round {gameData.round} Results</h2>
        </div>

        {gameData.roundResult?.topAnswers?.length > 0 && (
          <div className="prompt-card">
            <h3>Top Answer</h3>
            {gameData.roundResult.topAnswers.map((answer, index) => (
              <div key={`${answer.playerId}-${index}`} className="center">
                <p>{answer.answer}</p>
                <p className="subtitle">
                  {gameData.players?.[answer.playerId]?.name || 'Player'}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="score-banner">Race to 10,000 points</div>

        <div className="score-list">
          {sortedPlayers.map((player, index) => (
            <div className="score-card" key={player.id}>
              <strong>
                #{index + 1} {player.name} {player.id === playerId ? '(You)' : ''}
              </strong>
              <div>Score: {player.score || 0}</div>
            </div>
          ))}
        </div>

        <p className="center">Advancing to Round {gameData.round + 1}...</p>
      </div>
    </div>
  );
}


