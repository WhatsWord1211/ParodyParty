import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { subscribeToGame, submitAnswer, updateGamePhase } from '../services/gameService';
import { playMusicClip, stopMusic } from '../services/audioService';

export default function GameScreen({ route, navigation }) {
  const { gameId, playerId } = route.params;
  const [gameData, setGameData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      if (data) {
        setGameData(data);
        
        // Check if player already submitted
        if (data.players?.[playerId]?.submission) {
          setSubmitted(true);
          setAnswer(data.players[playerId].submission);
        }
        
        // Handle phase transitions
        if (data.phase === 'voting') {
          navigation.replace('Results', { gameId, playerId });
        }
      }
    });

    return () => {
      unsubscribe();
      stopMusic();
    };
  }, [gameId, playerId]);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert('Please enter an answer');
      return;
    }

    try {
      await submitAnswer(gameId, playerId, answer.trim());
      setSubmitted(true);
    } catch (error) {
      alert('Failed to submit answer: ' + error.message);
    }
  };

  // Play music when prompt phase starts
  useEffect(() => {
    if (gameData?.phase === 'prompt' && gameData?.currentPrompt?.audioUri) {
      playMusicClip(gameData.currentPrompt.audioUri).catch(error => {
        console.error('Failed to play audio:', error);
        // Don't block gameplay if audio fails
      });
    }
    
    // Stop music when leaving prompt phase
    return () => {
      if (gameData?.phase !== 'prompt') {
        stopMusic();
      }
    };
  }, [gameData?.phase, gameData?.currentPrompt?.audioUri]);

  // Prevent accidental back button press
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      const message = submitted 
        ? 'Are you sure you want to leave? Your answer has been submitted, but you will miss the voting phase.'
        : 'Are you sure you want to leave? You haven\'t submitted your answer yet and will lose this round.';
      
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
            onPress: () => {
              stopMusic();
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, submitted]);

  if (!gameData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const prompt = gameData.currentPrompt;
  const player = gameData.players?.[playerId];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.roundText}>Round {gameData.round} of {gameData.maxRounds}</Text>
        {prompt && (
          <View style={styles.songInfo}>
            <Text style={styles.songTitle}>{prompt.title}</Text>
            <Text style={styles.songArtist}>{prompt.artist}</Text>
          </View>
        )}
      </View>

      {gameData.phase === 'prompt' && prompt && (
        <View style={styles.promptContainer}>
          <Text style={styles.promptLabel}>Fill in the blank:</Text>
          <View style={styles.lyricsContainer}>
            {prompt.lyrics?.map((line, index) => (
              <Text 
                key={index} 
                style={[
                  styles.lyricLine,
                  index === prompt.blankPosition && styles.blankLine
                ]}
              >
                {index === prompt.blankPosition ? '______' : line}
              </Text>
            ))}
          </View>

          {!submitted ? (
            <View style={styles.inputSection}>
              <TextInput
                style={styles.input}
                placeholder="Your answer..."
                value={answer}
                onChangeText={setAnswer}
                maxLength={50}
                autoCapitalize="words"
                editable={!submitted}
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.submittedContainer}>
              <Text style={styles.submittedText}>✓ Submitted!</Text>
              <Text style={styles.waitingText}>Waiting for other players...</Text>
            </View>
          )}
        </View>
      )}

      {gameData.phase === 'submission' && (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>All players have submitted!</Text>
          <Text style={styles.waitingText}>Moving to voting...</Text>
        </View>
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
    marginBottom: 30,
  },
  roundText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
  },
  songInfo: {
    alignItems: 'center',
  },
  songTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  songArtist: {
    fontSize: 18,
    color: '#666',
  },
  promptContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  promptLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  lyricsContainer: {
    marginBottom: 20,
  },
  lyricLine: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  blankLine: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  inputSection: {
    marginTop: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submittedContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  submittedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  waitingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
});

