import React, { useEffect, useRef, useState } from 'react';
import { subscribeToGame, submitAnswer, checkAndProgressToVoting } from '../services/gameService';

export default function GameScreen({ gameId, playerId, isDisplayOnly, onNavigate }) {
  const [gameData, setGameData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef(null);
  const hasCheckedExpirationRef = useRef(false);
  const inputRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        if (data.players?.[playerId]?.submission) {
          setSubmitted(true);
          setAnswer(data.players[playerId].submission);
        }
        if (data.phase === 'voting') {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          onNavigate('results', { gameId, playerId });
        }
      }
    });

    return () => {
      unsubscribe();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameId, onNavigate, playerId]);

  useEffect(() => {
    if (gameData?.phase === 'prompt' && gameData.timerEndsAt) {
      const currentTimerEndsAt = gameData.timerEndsAt;
      const checkTimer = () => {
        const now = Date.now();
        const endTime = new Date(currentTimerEndsAt).getTime();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0 && !hasCheckedExpirationRef.current) {
          hasCheckedExpirationRef.current = true;
          checkAndProgressToVoting(gameId).catch(console.error);
        }
      };

      checkTimer();
      timerIntervalRef.current = setInterval(checkTimer, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }

    hasCheckedExpirationRef.current = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [gameData?.phase, gameData?.timerEndsAt, gameId]);

  useEffect(() => {
    if (gameData?.phase === 'prompt' && gameData.players) {
      const players = Object.values(gameData.players);
      const allSubmitted = players.every((player) => player.submission !== null);
      if (allSubmitted) {
        setTimeout(() => {
          checkAndProgressToVoting(gameId).catch(console.error);
        }, 100);
      }
    }
  }, [gameData?.phase, gameData?.players, gameId]);

  if (!gameData) {
    return (
      <div className="page">
        <div className="card center">Loading round...</div>
      </div>
    );
  }

  const prompt = gameData.currentPrompt;
  const players = Object.values(gameData.players || {});
  const someDidNotAnswer = players.some((player) => player.submission === null && timeRemaining === 0);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    try {
      await submitAnswer(gameId, playerId, answer.trim());
      setSubmitted(true);
      checkAndProgressToVoting(gameId).catch(console.error);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="center">
          {gameData.phase === 'prompt' && (
            <div className="timer">{timeRemaining > 0 ? formatTime(timeRemaining) : "Time's up!"}</div>
          )}
          <h2>Round {gameData.round}</h2>
          <p className="subtitle">{isDisplayOnly ? 'Display screen' : 'Submit your answer'}</p>
        </div>

        {gameData.phase === 'prompt' && prompt && (
          <div className="prompt-card">
            <h3>Prompt</h3>
            <p className="center">{prompt.prompt || 'Answer the prompt above.'}</p>

            {!isDisplayOnly && !submitted && timeRemaining > 0 ? (
              <div style={{ marginTop: 16 }}>
                <input
                  ref={inputRef}
                  className="input"
                  placeholder="Your answer..."
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  onFocus={() => {
                    setTimeout(() => {
                      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 0);
                  }}
                  maxLength={50}
                />
                <button className="button button-primary" onClick={handleSubmit} disabled={!answer.trim()}>
                  Submit
                </button>
              </div>
            ) : isDisplayOnly ? (
              <div className="center" style={{ marginTop: 16 }}>
                <strong>Waiting for players to submit...</strong>
              </div>
            ) : submitted ? (
              <div className="center" style={{ marginTop: 16 }}>
                <strong>✓ Submitted!</strong>
                <p>Waiting for other players...</p>
              </div>
            ) : (
              <div className="center" style={{ marginTop: 16 }}>
                <strong>You did not answer.</strong>
              </div>
            )}

            {someDidNotAnswer && (
              <p className="center" style={{ marginTop: 12 }}>
                Some players did not answer.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

