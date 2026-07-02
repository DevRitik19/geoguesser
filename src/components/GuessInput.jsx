import { useState, useContext, useEffect, useRef } from 'react';
import { GameContext } from '../context/GameContext';
import { calculateDistance, calculateDirection } from '../utils/geometry';
import { Search, Send } from 'lucide-react';

const GuessInput = () => {
  const { countries, targetCountry, addGuess, gameState, guesses } = useContext(GameContext);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); // ← arrow-key cursor
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view when navigating with arrow keys
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setSelectedIndex(0); // reset cursor on every keystroke

    if (val.length > 0) {
      const alreadyGuessedIds = new Set(guesses.map(g => g.id));
      const filtered = countries
        .filter(c =>
          c.name.toLowerCase().includes(val.toLowerCase()) &&
          !alreadyGuessedIds.has(c.id) // exclude already guessed countries
        )
        .slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const submitGuess = (countryObj) => {
    if (gameState !== 'playing') return;

    const distance = calculateDistance(
      countryObj.lat, countryObj.lng,
      targetCountry.lat, targetCountry.lng
    );
    const direction = calculateDirection(
      countryObj.lat, countryObj.lng,
      targetCountry.lat, targetCountry.lng
    );

    addGuess({ ...countryObj, distance, direction });
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault(); // stop the page from scrolling
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && gameState === 'playing') {
      e.preventDefault();
      submitGuess(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={gameState !== 'playing'}
          placeholder={gameState === 'playing' ? 'Search country...' : 'Scan completed'}
          className="w-full pl-12 pr-12 py-4 bg-slate-900/50 border border-white/10 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-slate-900/20 disabled:border-transparent disabled:cursor-not-allowed transition-all text-lg text-white placeholder-slate-500 backdrop-blur-md font-mono"
        />
        <button
          onClick={() => {
            if (suggestions.length > 0) submitGuess(suggestions[selectedIndex]);
          }}
          disabled={gameState !== 'playing' || input.length === 0}
          className="absolute right-2 px-3 py-2 bg-primary/20 text-primary border border-primary/30 font-medium rounded-xl hover:bg-primary hover:text-white disabled:opacity-0 transition-all flex items-center justify-center"
          aria-label="Submit Guess"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-2 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-72 overflow-auto divide-y divide-white/5 custom-scrollbar"
          role="listbox"
        >
          {suggestions.map((country, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li
                key={country.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => submitGuess(country)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-4 py-3 cursor-pointer flex items-center gap-4 transition-colors
                  ${isSelected
                    ? 'bg-primary/20 border-l-2 border-primary'
                    : 'hover:bg-slate-700/50 border-l-2 border-transparent'
                  }`}
              >
                <div className="w-8 h-6 rounded overflow-hidden shadow-sm border border-black/20 shrink-0">
                  <img src={country.flag} alt={`${country.name} flag`} className="w-full h-full object-cover" />
                </div>
                <span className={`font-medium tracking-wide ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {country.name}
                </span>
                {isSelected && (
                  <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-mono border border-primary/30">
                    ↵ Enter
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default GuessInput;
