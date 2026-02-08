import React, { useEffect, useRef, useState } from 'react';
import { subscribeToGame, submitAnswer, checkAndProgressToVoting } from '../services/gameService';
import { playRoundAudio, stopRoundAudio } from '../services/audioService';
import SoundToggle from '../components/SoundToggle';
import FullscreenToggle from '../components/FullscreenToggle';
import useSoundPreference from '../hooks/useSoundPreference';

export default function GameScreen({ gameId, playerId, isDisplayOnly, onNavigate }) {
  const [gameData, setGameData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const MAX_ANSWER_LENGTH = 50;
  const timerIntervalRef = useRef(null);
  const hasCheckedExpirationRef = useRef(false);
  const promptTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const hasRequestedVotingRef = useRef(false);
  const { soundEnabled, setSoundEnabled, hasInitialized } = useSoundPreference({
    gameId,
    hostIsDisplayOnly: gameData?.hostIsDisplayOnly,
    isDisplayOnly,
    isReady: Boolean(gameData)
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const requestVotingProgress = async (source) => {
    if (hasRequestedVotingRef.current) return;
    hasRequestedVotingRef.current = true;
    try {
      const progressed = await checkAndProgressToVoting(gameId);
      if (!progressed) {
        hasRequestedVotingRef.current = false;
      }
    } catch (error) {
      console.error(`Failed to progress voting from ${source}:`, error);
      hasRequestedVotingRef.current = false;
    }
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
          onNavigate('results', { gameId, playerId, isDisplayOnly });
        }
        if (data.phase === 'gameOver') {
          onNavigate('results', { gameId, playerId, isDisplayOnly });
        }
      }
    });

    return () => {
      unsubscribe();
      stopRoundAudio();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
    };
  }, [gameId, onNavigate, playerId]);

  useEffect(() => {
    if (!hasInitialized) return;
    if (gameData?.phase === 'prompt' && soundEnabled) {
      playRoundAudio('prompt');
    } else {
      stopRoundAudio();
    }
  }, [gameData?.phase, soundEnabled, hasInitialized]);

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
          requestVotingProgress('timer');
        }
      };

      checkTimer();
      timerIntervalRef.current = setInterval(checkTimer, 1000);

      if (!promptTimeoutRef.current) {
        const timeoutMs = Math.max(0, new Date(currentTimerEndsAt).getTime() - Date.now() + 250);
        promptTimeoutRef.current = setTimeout(() => {
          requestVotingProgress('timeout');
        }, timeoutMs);
      }

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (promptTimeoutRef.current) {
          clearTimeout(promptTimeoutRef.current);
          promptTimeoutRef.current = null;
        }
      };
    }

    hasCheckedExpirationRef.current = false;
    hasRequestedVotingRef.current = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current);
      promptTimeoutRef.current = null;
    }
  }, [gameData?.phase, gameData?.timerEndsAt, gameId]);

  useEffect(() => {
    if (gameData?.phase === 'prompt' && gameData.players) {
      const players = Object.entries(gameData.players)
        .filter(
          ([id, player]) =>
            player?.connected !== false &&
            !(gameData.hostIsDisplayOnly && id === gameData.hostId)
        )
        .map(([, player]) => player);
      const allSubmitted = players.length > 0 && players.every((player) => player.submission !== null);
      if (allSubmitted) {
        setTimeout(() => {
          requestVotingProgress('all-submitted');
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
  const players = Object.entries(gameData.players || {})
    .filter(
      ([id, player]) =>
        player?.connected !== false &&
        !(gameData.hostIsDisplayOnly && id === gameData.hostId)
    )
    .map(([, player]) => player);
  const allSubmitted = players.length > 0 && players.every((player) => player.submission !== null);
  const someDidNotAnswer = players.some((player) => player.submission === null && timeRemaining === 0);
  const canEditAnswer =
    !isDisplayOnly && gameData.phase === 'prompt' && timeRemaining > 0 && !allSubmitted;

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    try {
      await submitAnswer(gameId, playerId, answer.trim());
      setSubmitted(true);
      requestVotingProgress('submit');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  return (
    <div className={`page ${isDisplayOnly ? 'display-only' : ''}`}>
      <div className="card">
        <FullscreenToggle isDisplayOnly={isDisplayOnly} />
        <SoundToggle
          soundEnabled={soundEnabled}
          onToggle={() => setSoundEnabled((prev) => !prev)}
          disabled={!hasInitialized}
        />
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

            {!isDisplayOnly && (
              <>
                {canEditAnswer ? (
                  <div style={{ marginTop: 16 }}>
                    <input
                      ref={inputRef}
                      className="input"
                      placeholder="Your answer..."
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                      onFocus={() => {
                        setTimeout(() => {
                          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 0);
                      }}
                      maxLength={MAX_ANSWER_LENGTH}
                    />
                    <button className="button button-primary" onClick={handleSubmit} disabled={!answer.trim()}>
                      {submitted ? 'Update Answer' : 'Submit'}
                    </button>
                    <div
                      className="center"
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: answer.length >= MAX_ANSWER_LENGTH ? '#dc2626' : '#6b7280'
                      }}
                    >
                      {answer.length}/{MAX_ANSWER_LENGTH}
                      {answer.length >= MAX_ANSWER_LENGTH ? ' (Max reached)' : ''}
                    </div>
                    {submitted && (
                      <p className="center" style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                        You can edit until time runs out.
                      </p>
                    )}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

