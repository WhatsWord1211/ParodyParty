import React, { useEffect, useMemo, useState } from 'react';
import { subscribeToGame, startGame } from '../services/gameService';
import { getRandomPrompt } from '../utils/gameData';
import { QRCodeCanvas } from 'qrcode.react';

export default function LobbyScreen({ gameId, playerId, isHost, onNavigate }) {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');
  const joinUrl = useMemo(() => `${window.location.origin}?code=${gameId}`, [gameId]);

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        if (data.phase === 'prompt') {
          onNavigate('game', { gameId, playerId });
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, onNavigate, playerId]);

  const handleStartGame = async () => {
    if (!gameData) return;
    const playerCount = Object.keys(gameData.players || {}).length;
    if (playerCount < 4) {
      setStatusMessage('Need at least 4 players to start the game.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatusMessage('');
    try {
      const prompt = getRandomPrompt();
      await startGame(gameId, prompt);
    } catch (error) {
      setStatusMessage(`Failed to start game: ${error.message}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!gameData) {
    return (
      <div className="page">
        <div className="card center">Loading lobby...</div>
      </div>
    );
  }

  const players = Object.entries(gameData.players || {}).map(([id, player]) => ({
    id,
    ...player
  }));

  return (
    <div className="page">
      <div className="card">
        <div className="lobby-header">
          <h2>Game Lobby</h2>
          <div className="game-code">{gameId}</div>
          <p className="subtitle">Share this code or QR so friends can join.</p>
        </div>

        <div className="qr-wrapper">
          <QRCodeCanvas value={joinUrl} size={180} />
          <div className="qr-link">{joinUrl}</div>
          <button
            className="button button-outline"
            onClick={async () => {
              try {
                if (!navigator.clipboard?.writeText) {
                  setStatusMessage('Copy not supported in this browser. Manually copy the link.');
                  setStatusType('error');
                  return;
                }
                await navigator.clipboard.writeText(joinUrl);
                setStatusMessage('Join link copied!');
                setStatusType('info');
              } catch (error) {
                setStatusMessage('Copy failed. Manually copy the link.');
                setStatusType('error');
              }
            }}
          >
            Copy Join Link
          </button>
        </div>

        <h3>Players ({players.length}/10)</h3>
        <ul className="players-list">
          {players.map((player) => (
            <li key={player.id}>
              <span>
                {player.name} {player.id === playerId ? '(You)' : ''}
              </span>
              {player.id === gameData.hostId && <span className="badge">Host</span>}
            </li>
          ))}
        </ul>

        {statusMessage && (
          <p className={`center ${statusType === 'error' ? 'error-text' : 'status-text'}`}>
            {statusMessage}
          </p>
        )}

        {isHost ? (
          <>
            {players.length < 4 && (
              <p className="center">Need {4 - players.length} more player(s) to start.</p>
            )}
            <button
              className="button button-primary"
              onClick={handleStartGame}
              disabled={loading || players.length < 4}
            >
              {loading ? 'Starting...' : 'Start Game'}
            </button>
          </>
        ) : (
          <p className="center">Waiting for host to start...</p>
        )}
      </div>
    </div>
  );
}

