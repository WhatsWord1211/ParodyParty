import React from 'react';
import HomeScreen from './screens/HomeScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import ResultsScreen from './screens/ResultsScreen.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p className="error-text">{this.state.error?.toString()}</p>
          <p className="error-details">Check the console for more details.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [route, setRoute] = React.useState({ screen: 'home', params: {} });
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const navigate = React.useCallback((screen, params = {}) => {
    setRoute({ screen, params });
  }, []);

  const initialGameCode = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    return code ? code.toUpperCase() : '';
  }, []);

  if (!isReady) {
    return (
      <div className="loading-container">
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  let content = null;
  switch (route.screen) {
    case 'lobby':
      content = <LobbyScreen {...route.params} onNavigate={navigate} />;
      break;
    case 'game':
      content = <GameScreen {...route.params} onNavigate={navigate} />;
      break;
    case 'results':
      content = <ResultsScreen {...route.params} onNavigate={navigate} />;
      break;
    case 'home':
    default:
      content = <HomeScreen onNavigate={navigate} initialGameCode={initialGameCode} />;
      break;
  }

  return <ErrorBoundary>{content}</ErrorBoundary>;
}

