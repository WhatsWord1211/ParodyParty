import React, { useEffect, useMemo, useState } from 'react';
import { subscribeToGame, startGame } from '../services/gameService';
import { getRandomPrompt } from '../utils/gameData';
import { QRCodeCanvas } from 'qrcode.react';
import SoundToggle from '../components/SoundToggle';
import FullscreenToggle from '../components/FullscreenToggle';
import useSoundPreference from '../hooks/useSoundPreference';
import { MAX_PLAYERS, MIN_PLAYERS } from '../constants/gameSettings';

export default function LobbyScreen({ gameId, playerId, isHost, isDisplayOnly, onNavigate }) {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');
  const joinUrl = useMemo(() => `${window.location.origin}?code=${gameId}`, [gameId]);
  const { soundEnabled, setSoundEnabled, hasInitialized } = useSoundPreference({
    gameId,
    hostIsDisplayOnly: gameData?.hostIsDisplayOnly,
    isDisplayOnly,
    isReady: Boolean(gameData)
  });

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        if (data.phase === 'prompt') {
          onNavigate('game', { gameId, playerId, isDisplayOnly });
        }
        if (data.phase === 'gameOver') {
          onNavigate('results', { gameId, playerId, isDisplayOnly });
        }
      }
    });
    return () => unsubscribe();
  }, [gameId, onNavigate, playerId]);

  const handleStartGame = async () => {
    if (!gameData) return;
    const playerCount = Object.values(gameData.players || {}).filter((player) => player?.connected !== false).length;
    if (playerCount < MIN_PLAYERS) {
      setStatusMessage(`Need at least ${MIN_PLAYERS} players to start the game.`);
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
  const connectedPlayers = players.filter((player) => player.connected !== false);

  return (
    <div className={`page ${isDisplayOnly ? 'display-only' : ''}`}>
      <div className="card">
        <FullscreenToggle isDisplayOnly={isDisplayOnly} />
        <SoundToggle
          soundEnabled={soundEnabled}
          onToggle={() => setSoundEnabled((prev) => !prev)}
          disabled={!hasInitialized}
        />
        <div className="lobby-header">
          <h2>Game Lobby</h2>
          <div className="game-code">{gameId}</div>
          <p className="subtitle">Share this code or QR so friends can join.</p>
        </div>

        <div className="lobby-layout">
          <div className="lobby-panel">
            <div className="qr-wrapper">
              <QRCodeCanvas value={joinUrl} size={isDisplayOnly ? 150 : 180} />
              <div className="qr-link">{joinUrl}</div>
              <button
                className="button button-outline"
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: 'Parody Party',
                        text: 'Join my game of Parody Party!',
                        url: joinUrl
                      });
                      setStatusMessage('Share sheet opened.');
                      setStatusType('info');
                      return;
                    }

                    if (!navigator.clipboard?.writeText) {
                      setStatusMessage('Sharing not supported. Manually copy the link.');
                      setStatusType('error');
                      return;
                    }
                    await navigator.clipboard.writeText(joinUrl);
                    setStatusMessage('Game link copied!');
                    setStatusType('info');
                  } catch (error) {
                    setStatusMessage('Share failed. Manually copy the link.');
                    setStatusType('error');
                  }
                }}
              >
                Share Game Link
              </button>
            </div>
          </div>

          <div className="lobby-panel">
            <h3>Players ({connectedPlayers.length}/{MAX_PLAYERS})</h3>
            <ul className="players-list">
              {players.map((player) => (
                <li key={player.id}>
                  <span>
                    {player.name} {player.id === playerId ? '(You)' : ''}
                  </span>
                  {player.id === gameData.hostId && <span className="badge">Host</span>}
                  {player.connected === false && <span className="badge badge-muted">Disconnected</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {statusMessage && (
          <p className={`center ${statusType === 'error' ? 'error-text' : 'status-text'}`}>
            {statusMessage}
          </p>
        )}

        {isHost ? (
          <>
            {connectedPlayers.length < MIN_PLAYERS && (
              <p className="center">
                Need {MIN_PLAYERS - connectedPlayers.length} more player(s) to start.
              </p>
            )}
            <button
              className="button button-primary"
              onClick={handleStartGame}
              disabled={loading || connectedPlayers.length < MIN_PLAYERS}
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

