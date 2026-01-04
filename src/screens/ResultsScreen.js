import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert
} from 'react-native';
import { subscribeToGame, submitVote, calculateScores, updateGamePhase } from '../services/gameService';

export default function ResultsScreen({ route, navigation }) {
  const { gameId, playerId } = route.params;
  const [gameData, setGameData] = useState(null);
  const [votes, setVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        
        // Check if player already voted
        const player = data.players?.[playerId];
        if (player?.votes && Object.keys(player.votes).length > 0) {
          setHasVoted(true);
        }
        
        // Auto-advance when all votes are in
        if (data.phase === 'results') {
          // Show final results
        }
      }
    });

    return unsubscribe;
  }, [gameId, playerId]);

  // Prevent accidental back button press
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      const message = hasVoted
        ? 'Are you sure you want to leave? You\'ve already voted, but you\'ll miss seeing the results.'
        : 'Are you sure you want to leave? You haven\'t voted yet and will miss this round.';
      
      Alert.alert(
        'Leave Game?',
        message,
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
  }, [navigation, hasVoted]);

  const handleVote = async (votedPlayerId, points) => {
    if (hasVoted) return;
    
    try {
      await submitVote(gameId, playerId, votedPlayerId, points);
      setVotes(prev => ({ ...prev, [votedPlayerId]: points }));
      setHasVoted(true);
    } catch (error) {
      alert('Failed to submit vote: ' + error.message);
    }
  };

  const handleNextRound = async () => {
    if (gameData.round >= gameData.maxRounds) {
      // Game over - show final results
      navigation.replace('Results', { gameId, playerId, isFinal: true });
    } else {
      // Start next round
      await updateGamePhase(gameId, 'prompt', { round: gameData.round + 1 });
      navigation.replace('Game', { gameId, playerId });
    }
  };

  if (!gameData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const players = Object.entries(gameData.players || {})
    .filter(([id]) => id !== playerId) // Exclude self
    .map(([id, player]) => ({
      id,
      ...player
    }));

  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Round {gameData.round} Results</Text>
      </View>

      <View style={styles.answersContainer}>
        <Text style={styles.sectionTitle}>Answers</Text>
        {players.map((player) => (
          <View key={player.id} style={styles.answerCard}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.answerText}>{player.submission || 'No answer'}</Text>
            
            {!hasVoted && (
              <View style={styles.voteButtons}>
                <TouchableOpacity
                  style={[styles.voteButton, styles.voteButtonLow]}
                  onPress={() => handleVote(player.id, 1)}
                >
                  <Text style={styles.voteButtonText}>1 pt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteButton, styles.voteButtonMid]}
                  onPress={() => handleVote(player.id, 2)}
                >
                  <Text style={styles.voteButtonText}>2 pts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteButton, styles.voteButtonHigh]}
                  onPress={() => handleVote(player.id, 3)}
                >
                  <Text style={styles.voteButtonText}>3 pts</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {hasVoted && (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for other players to vote...</Text>
        </View>
      )}

      {gameData.phase === 'results' && gameData.hostId === playerId && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNextRound}
        >
          <Text style={styles.nextButtonText}>
            {gameData.round >= gameData.maxRounds ? 'View Final Results' : 'Next Round'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  answersContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  answerText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  voteButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  voteButtonLow: {
    backgroundColor: '#FF9800',
  },
  voteButtonMid: {
    backgroundColor: '#2196F3',
  },
  voteButtonHigh: {
    backgroundColor: '#4CAF50',
  },
  voteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  waitingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  waitingText: {
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


