import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { subscribeToGame, startGame } from '../services/gameService';
import { getRandomPrompt } from '../utils/gameData';

export default function LobbyScreen({ route, navigation }) {
  const { gameId, playerId, isHost } = route.params;
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        
        // Auto-navigate when game starts
        if (data.phase === 'prompt') {
          navigation.replace('Game', { gameId, playerId });
        }
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Prevent accidental back button press
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      Alert.alert(
        'Leave Game?',
        'Are you sure you want to leave the lobby? You will need to rejoin with the game code.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  const handleStartGame = async () => {
    if (!gameData) return;
    
    const playerCount = Object.keys(gameData.players || {}).length;
    if (playerCount < 3) {
      Alert.alert('Not Enough Players', 'Need at least 3 players to start the game.');
      return;
    }

    setLoading(true);
    try {
      // Get first prompt
      const prompt = getRandomPrompt();
      
      await startGame(gameId, prompt);
      
      navigation.replace('Game', { gameId, playerId });
    } catch (error) {
      Alert.alert('Failed to Start', 'Failed to start game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!gameData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const players = Object.entries(gameData.players || {}).map(([id, player]) => ({
    id,
    ...player
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Lobby</Text>
        <Text style={styles.gameCode}>Code: {gameId}</Text>
      </View>

      <View style={styles.playersContainer}>
        <Text style={styles.playersTitle}>Players ({players.length}/10)</Text>
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.playerItem}>
              <Text style={styles.playerName}>
                {item.name} {item.id === playerId && '(You)'}
              </Text>
              {item.id === gameData.hostId && (
                <Text style={styles.hostBadge}>Host</Text>
              )}
            </View>
          )}
        />
      </View>

      {isHost && (
        <>
          <TouchableOpacity
            style={[styles.button, (loading || players.length < 3) && styles.buttonDisabled]}
            onPress={handleStartGame}
            disabled={loading || players.length < 3}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start Game</Text>
            )}
          </TouchableOpacity>
          {players.length < 3 && (
            <Text style={styles.playerRequirement}>
              Need {3 - players.length} more player{3 - players.length === 1 ? '' : 's'} to start
            </Text>
          )}
          {players.length >= 10 && (
            <Text style={styles.playerLimit}>Game is full (10/10 players)</Text>
          )}
        </>
      )}

      {!isHost && (
        <Text style={styles.waitingText}>Waiting for host to start...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  gameCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    letterSpacing: 3,
  },
  playersContainer: {
    flex: 1,
    marginTop: 20,
  },
  playersTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerName: {
    fontSize: 16,
  },
  hostBadge: {
    backgroundColor: '#FFC107',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  playerRequirement: {
    textAlign: 'center',
    color: '#FF9800',
    fontSize: 14,
    marginTop: 10,
    fontWeight: '600',
  },
  playerLimit: {
    textAlign: 'center',
    color: '#F44336',
    fontSize: 14,
    marginTop: 10,
    fontWeight: '600',
  },
});

