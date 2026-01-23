import React, { useCallback, useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createGame, joinGame } from '../services/gameService';
import QRCodeScanner from '../components/QRCodeScanner';

const extractGameCode = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/[?&]code=([A-Za-z0-9]{4})/i);
  if (urlMatch?.[1]) return urlMatch[1].toUpperCase();
  const codeMatch = trimmed.match(/\b([A-Za-z0-9]{4})\b/);
  return codeMatch?.[1]?.toUpperCase() || '';
};

export default function HomeScreen({ onNavigate, initialGameCode }) {
  const [mode, setMode] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState(initialGameCode || '');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isDisplayOnly, setIsDisplayOnly] = useState(false);
  const [error, setError] = useState('');

  const handleScan = useCallback(
    (value) => {
      const extracted = extractGameCode(value);
      if (extracted) {
        setGameCode(extracted);
        setShowScanner(false);
        setError('');
      } else {
        setError('No valid 4-letter code found in the QR.');
      }
    },
    [setGameCode, setShowScanner]
  );

  useEffect(() => {
    if (initialGameCode) {
      setMode('join');
    }
  }, [initialGameCode]);

  const handleCreateGame = async () => {
    if (!isDisplayOnly && !playerName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const userId = auth.currentUser?.uid || (await signInAnonymously(auth)).user.uid;
      const hostName = isDisplayOnly ? 'Host Screen' : playerName.trim();
      const gameId = await createGame(userId, hostName, { hostIsPlayer: !isDisplayOnly });
      onNavigate('lobby', { gameId, playerId: userId, isHost: true, isDisplayOnly });
    } catch (error) {
      setError(`Failed to create game: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!gameCode.trim()) {
      setError('Please enter a 4-letter game code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const userId = auth.currentUser?.uid || (await signInAnonymously(auth)).user.uid;
      const normalizedCode = gameCode.trim().toUpperCase();
      const gameData = await joinGame(normalizedCode, userId, playerName.trim());
      if (gameData.phase === 'prompt') {
        onNavigate('game', { gameId: normalizedCode, playerId: userId, isDisplayOnly: false });
      } else if (gameData.phase === 'voting' || gameData.phase === 'results' || gameData.phase === 'gameOver') {
        onNavigate('results', { gameId: normalizedCode, playerId: userId, isDisplayOnly: false });
      } else {
        onNavigate('lobby', { gameId: normalizedCode, playerId: userId, isHost: false, isDisplayOnly: false });
      }
    } catch (error) {
      setError(error.message || 'Failed to join game.');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="page">
        <div className="card">
          <h1 className="title">Parody Party</h1>
          <p className="subtitle">Everyone plays on their own screen — anywhere.</p>
          <button className="button button-primary" onClick={() => setMode('create')}>
            Create Game
          </button>
          <div className="divider">OR</div>
          <button className="button button-secondary" onClick={() => setMode('join')}>
            Join Game
          </button>
        </div>
      </div>
    );
  }

  const modeLabel = mode === 'create' ? 'Create a new game' : 'Join an existing game';

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Parody Party</h1>
        <p className="subtitle">{modeLabel}</p>

        <div className="input-group">
          <label className="input-label" htmlFor="playerName">
            Your name
          </label>
          <input
            id="playerName"
            className="input"
            placeholder="Your name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            maxLength={20}
            disabled={mode === 'create' && isDisplayOnly}
          />
        </div>

        {mode === 'create' && (
          <div className="divider">OR</div>
        )}

        {mode === 'create' && (
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={isDisplayOnly}
              onChange={(event) => {
                setIsDisplayOnly(event.target.checked);
                setError('');
              }}
            />
            <span>Display-only host screen (no participation)</span>
          </label>
        )}

        {mode === 'join' && (
          <div className="input-group">
            <label className="input-label" htmlFor="gameCode">
              4-letter game code
            </label>
            <input
              id="gameCode"
              className="input"
              placeholder="ABCD"
              value={gameCode}
              onChange={(event) =>
                setGameCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))
              }
              maxLength={4}
            />
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button
          className={`button ${mode === 'create' ? 'button-primary' : 'button-secondary'}`}
          onClick={mode === 'create' ? handleCreateGame : handleJoinGame}
          disabled={
            loading ||
            (!isDisplayOnly && mode === 'create' && !playerName.trim()) ||
            (mode === 'join' && (!playerName.trim() || !gameCode.trim()))
          }
        >
          {loading ? 'Working...' : mode === 'create' ? 'Create Game' : 'Join Game'}
        </button>

        {mode === 'join' && (
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="button button-outline" onClick={() => setShowScanner(!showScanner)}>
              {showScanner ? 'Hide QR Scanner' : 'Scan QR Code'}
            </button>
          </div>
        )}

        {showScanner && <QRCodeScanner onScan={handleScan} />}

        <div
          className="back-link"
          role="button"
          onClick={() => {
            setMode(null);
            setPlayerName('');
            setGameCode(initialGameCode || '');
            setShowScanner(false);
            setIsDisplayOnly(false);
            setError('');
          }}
        >
          ← Back
        </div>
      </div>
    </div>
  );
}

