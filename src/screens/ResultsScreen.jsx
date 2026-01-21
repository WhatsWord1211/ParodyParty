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

export default function ResultsScreen({ gameId, playerId, isDisplayOnly, onNavigate }) {
  const [gameData, setGameData] = useState(null);
  const [rankedVotes, setRankedVotes] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);

        if (!isDisplayOnly) {
          const allPlayers = Object.keys(data.players || {});
          const requiredCount = Math.min(3, Math.max(0, allPlayers.length - 1));
          let voteCount = 0;
          allPlayers.forEach((otherPlayerId) => {
            if (otherPlayerId === playerId) return;
            const otherPlayer = data.players[otherPlayerId];
            if (otherPlayer?.votes && otherPlayer.votes[playerId] !== undefined) {
              voteCount += 1;
            }
          });
          const voted = voteCount === requiredCount;
          setHasVoted(voted);
          if (voted) {
            setLocalSubmitted(true);
            setStatusMessage('Your votes are submitted. Waiting on other players...');
          }
        } else {
          setHasVoted(false);
          setLocalSubmitted(false);
        }

        if (data.phase === 'voting') {
          checkAndProgressToResults(gameId).catch(console.error);
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
    if (gameData?.phase === 'voting') {
      setLocalSubmitted(false);
      setStatusMessage('');
      setRankedVotes([]);
    }
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
      checkAndProgressToResults(gameId).catch(console.error);
    }
  }, [gameData?.phase, timeRemaining, gameId]);

  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const shuffleKeyRef = useRef(null);

  useEffect(() => {
    if (gameData?.phase === 'voting' && gameData.players) {
      const shuffleKey = `${gameId}-${gameData.round}`;
      if (shuffleKeyRef.current === shuffleKey && shuffledAnswers.length > 0) {
        return;
      }
      const players = Object.entries(gameData.players || {})
        .filter(([id]) => id !== playerId)
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
    if (gameData?.phase === 'results') {
      const timer = setTimeout(async () => {
        const usedPromptIds = gameData.usedPrompts || [];
        const nextPrompt = getRandomPrompt(null, usedPromptIds);
        const timerEndsAt = new Date(Date.now() + 90000);
        await updateGamePhase(gameId, 'prompt', {
          round: gameData.round + 1,
          timerEndsAt: timerEndsAt.toISOString(),
          currentPrompt: nextPrompt,
          usedPrompts: [...usedPromptIds, nextPrompt.promptId],
          roundResult: null
        });
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [gameData?.phase, gameData?.round, gameData?.usedPrompts, gameId]);

  const handleRankPick = (answerIndex) => {
    if (hasVoted || localSubmitted) return;
    const votedPlayerId = shuffledAnswers[answerIndex].playerId;
    setRankedVotes((prev) => {
      if (prev.includes(votedPlayerId)) {
        return prev.filter((id) => id !== votedPlayerId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, votedPlayerId];
    });
  };

  const handleSubmitVotes = async () => {
    if (hasVoted || localSubmitted) return;
    const rankedPlayerIds = rankedVotes;
    const playerCount = Object.keys(gameData?.players || {}).length;
    const requiredCount = Math.min(3, Math.max(0, playerCount - 1));
    if (rankedPlayerIds.length !== requiredCount) return;
    try {
      await submitVotes(gameId, playerId, rankedPlayerIds, requiredCount);
      setLocalSubmitted(true);
      setStatusMessage('Your votes are submitted. Waiting on other players...');
      setTimeout(() => {
        checkAndProgressToResults(gameId).catch(console.error);
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
    const playerCount = Object.keys(gameData.players || {}).length;
    const requiredCount = Math.min(3, Math.max(0, playerCount - 1));
    return (
      <div className="page">
        <div className="card">
          <div className="center">
            <h2>Round {gameData.round} - Vote for Answers</h2>
            <p className="subtitle">Pick your top {requiredCount} favorites.</p>
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
                {!hasVoted && !localSubmitted ? (
                  <div className="button-row">
                    <button
                      className={`button button-secondary ${rankLabel ? 'button-selected' : ''}`}
                      onClick={() => handleRankPick(index)}
                    >
                      {rankLabel ? `Picked ${rankLabel}` : 'Pick'}
                    </button>
                  </div>
                ) : (
                  <p className="center">Thanks for voting!</p>
                )}
              </div>
            );
            })
          )}

          {!isDisplayOnly && !hasVoted && !localSubmitted && (
            <>
              <div className="center" style={{ marginTop: 12 }}>
                <p>
                  Your picks:
                  {Array.from({ length: requiredCount }).map((_, index) => (
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
                disabled={rankedVotes.length !== requiredCount}
              >
                Submit Top {requiredCount}
              </button>
            </>
          )}

          {!isDisplayOnly && (hasVoted || localSubmitted) && (
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
          <div className="center">
            <h2>Game Over</h2>
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

          {sortedPlayers.map((player, index) => (
            <div className="score-card" key={player.id}>
              <strong>
                #{index + 1} {player.name} {player.id === playerId ? '(You)' : ''}
              </strong>
              <div>Score: {player.score || 0}</div>
            </div>
          ))}

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

        {sortedPlayers.map((player, index) => (
          <div className="score-card" key={player.id}>
            <strong>
              #{index + 1} {player.name} {player.id === playerId ? '(You)' : ''}
            </strong>
            <div>Score: {player.score || 0}</div>
          </div>
        ))}

        <p className="center">Advancing to Round {gameData.round + 1}...</p>
      </div>
    </div>
  );
}


