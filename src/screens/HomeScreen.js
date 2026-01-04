import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createGame, joinGame } from '../services/gameService';

export default function HomeScreen({ navigation }) {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug: Log when component mounts
  React.useEffect(() => {
    console.log('HomeScreen mounted');
    try {
      console.log('Firebase auth:', auth ? 'initialized' : 'not initialized');
    } catch (error) {
      console.error('Error checking Firebase:', error);
    }
  }, []);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Sign in anonymously
      const userCredential = await signInAnonymously(auth);
      const userId = userCredential.user.uid;

      // Create game
      const gameId = await createGame(userId, playerName.trim());
      
      navigation.navigate('Lobby', { 
        gameId, 
        playerId: userId,
        isHost: true 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!gameCode.trim()) {
      Alert.alert('Error', 'Please enter a game code');
      return;
    }

    setLoading(true);
    try {
      // Sign in anonymously
      const userCredential = await signInAnonymously(auth);
      const userId = userCredential.user.uid;

      // Join game
      const gameData = await joinGame(gameCode.trim().toUpperCase(), userId, playerName.trim());
      
      navigation.navigate('Lobby', { 
        gameId: gameCode.trim().toUpperCase(), 
        playerId: userId,
        isHost: false 
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Parody Party</Text>
        <Text style={styles.subtitle}>Fill in the blank, music style!</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateGame}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Create Game</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter game code"
            value={gameCode}
            onChangeText={setGameCode}
            maxLength={6}
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={handleJoinGame}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Join Game</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
});

