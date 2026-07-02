import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchCountries } from '../services/api';
import { auth, db } from '../services/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [countries, setCountries] = useState([]);
  const [targetCountry, setTargetCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [gameState, setGameState] = useState('playing');
  const [guesses, setGuesses] = useState([]);
  const [initialHint, setInitialHint] = useState('');
  const [error, setError] = useState(null);
  const MAX_GUESSES = 6;

  // Stable ref so callbacks always read fresh country list
  const countriesRef = useRef([]);
  useEffect(() => { countriesRef.current = countries; }, [countries]);

  // Smart population formatter — avoids "0.0 million" for tiny countries
  const formatPop = (n) => {
    if (!n || n === 0) return 'an unknown number of';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} billion`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)} million`;
    if (n >= 1_000)         return `about ${Math.round(n / 1_000)} thousand`;
    return n.toLocaleString(); // exact for very small populations
  };

  // ── Pick a new random target ──────────────────────────────────────────────
  const startNewGame = useCallback((data) => {
    const source = data ?? countriesRef.current;
    if (!source || source.length === 0) return;

    const selected = source[Math.floor(Math.random() * source.length)];
    setTargetCountry(selected);
    setGuesses([]);
    setGameState('playing');

    const hints = [
      `It has a population of roughly ${formatPop(selected.population)} people.`,
      selected.subregion && selected.subregion !== 'Unknown'
        ? `This territory is located in the ${selected.subregion} subregion.`
        : null,
      selected.languages && Object.keys(selected.languages).length > 0
        ? `A major language spoken here is ${Object.values(selected.languages)[0]}.`
        : null,
      selected.currencies && Object.keys(selected.currencies).length > 0
        ? `The local currency is the ${Object.values(selected.currencies)[0].name}.`
        : null,
    ].filter(Boolean);

    if (hints.length === 0) hints.push('It is a fascinating place to explore.');

    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    setInitialHint(`Located in ${selected.region}. ${randomHint}`);
    setError(null);
  }, []); // stable — reads data from argument or ref

  // ── Load countries ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCountries();
      if (!data || data.length === 0) throw new Error('No country data returned.');
      setCountries(data);
      startNewGame(data);
    } catch (err) {
      console.error('Failed to load countries:', err);
      setLoadError(err.message || 'Failed to load country data. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [startNewGame]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save stats to Firestore ───────────────────────────────────────────────
  const saveGameStats = useCallback(async (isWin) => {
    try {
      if (!auth.currentUser) return;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updateData = { gamesPlayed: increment(1) };
      if (isWin) {
        updateData.wins = increment(1);
        updateData.streak = increment(1);
      } else {
        updateData.streak = 0;
      }
      await setDoc(userRef, updateData, { merge: true });
    } catch (err) {
      console.error('Failed to save analytics:', err);
      setError('Database Synchronization Error: ' + err.message);
      setTimeout(() => setError(null), 5000);
    }
  }, []);

  // ── Submit a guess ────────────────────────────────────────────────────────
  const addGuess = useCallback(async (guessItem) => {
    if (gameState !== 'playing') return;

    const newGuesses = [...guesses, guessItem];
    setGuesses(newGuesses);

    let finalState = 'playing';
    if (guessItem.id === targetCountry.id) {
      finalState = 'won';
    } else if (newGuesses.length >= MAX_GUESSES) {
      finalState = 'lost';
    }

    if (finalState !== 'playing') {
      setGameState(finalState);
      await saveGameStats(finalState === 'won');
    }
  }, [gameState, guesses, targetCountry, saveGameStats]);

  const value = {
    countries,
    targetCountry,
    loading,
    loadError,
    retryLoad: loadData,
    gameState,
    guesses,
    initialHint,
    error,
    MAX_GUESSES,
    addGuess,
    startNewGame,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
