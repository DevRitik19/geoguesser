import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchCountries } from '../services/api';
import { auth, db } from '../services/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [countries, setCountries] = useState([]);
  const [targetCountry, setTargetCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // API load failure

  // Game state
  const [gameState, setGameState] = useState('playing');
  const [guesses, setGuesses] = useState([]);
  const [initialHint, setInitialHint] = useState('');
  const [error, setError] = useState(null);
  const MAX_GUESSES = 6;

  // Keep a stable ref to countries so callbacks can always read the latest value
  // without needing to be in their dependency arrays.
  const countriesRef = useRef([]);
  useEffect(() => { countriesRef.current = countries; }, [countries]);

  // ── Pick a new random target from a given list ────────────────────────────
  // We accept an explicit `data` argument so callers can pass fresh data
  // right after loading — before React has flushed the setCountries update.
  const startNewGame = useCallback((data) => {
    // Prefer the argument; fall back to the ref so we always have fresh data.
    const source = data ?? countriesRef.current;
    if (!source || source.length === 0) return;

    const selected = source[Math.floor(Math.random() * source.length)];
    setTargetCountry(selected);
    setGuesses([]);
    setGameState('playing');

    const hints = [
      `It has a population of roughly ${(selected.population / 1000000).toFixed(1)} million people.`,
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

  // ── Load countries (with retry built into fetchCountries) ─────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCountries();
      if (!data || data.length === 0) throw new Error('No country data returned.');
      setCountries(data);
      startNewGame(data); // pass data directly to avoid stale-closure crash
    } catch (err) {
      console.error('Failed to load countries:', err);
      setLoadError(err.message || 'Failed to load country data. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [startNewGame]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save win/loss stats to Firestore ──────────────────────────────────────
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
    retryLoad: loadData,  // expose so Game page can show a retry button
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
