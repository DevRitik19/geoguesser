import { useContext, useState } from 'react';
import { GameContext } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import GuessInput from '../components/GuessInput';
import HintCard from '../components/HintCard';
import CountryCard from '../components/CountryCard';
import GlobeMap from '../components/GlobeMap';
import { Globe2, RefreshCw, Lightbulb, Target, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Game = () => {
  const { 
    countries,
    loading, 
    gameState, 
    guesses, 
    initialHint,
    error,
    MAX_GUESSES, 
    targetCountry, 
    startNewGame 
  } = useContext(GameContext);

  const [showLabels, setShowLabels] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto w-full relative flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 lg:h-[calc(100vh-140px)]"
    >
      {/* Error notification */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-4 left-1/2 z-50 bg-red-900/90 text-red-100 px-4 py-3 rounded-lg shadow-xl border border-red-500/30 backdrop-blur whitespace-nowrap"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 max-w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Sidebar: Guessing & History — shown FIRST on mobile */}
      <div className="lg:w-1/3 flex flex-col gap-4 lg:h-full order-1 lg:order-2">
         {gameState === 'playing' ? (
           <motion.div 
             initial={{ x: 20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="glassmorphism rounded-3xl p-4 sm:p-6 flex flex-col lg:h-full border border-white/10"
           >
             <div className="mb-4 sm:mb-6">
                <GuessInput />
             </div>
             
             {/* On mobile: show guesses in a horizontal scroll; on desktop: vertical scroll */}
             <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto lg:flex-1 gap-3 pb-2 lg:pb-0 lg:pr-2 custom-scrollbar">
                <AnimatePresence>
                  {guesses.map((guess, idx) => (
                    <div key={idx} className="min-w-[260px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
                      <HintCard guess={guess} index={idx} />
                    </div>
                  ))}
                  
                  {/* Empty Placeholders — only show on desktop */}
                  {Array.from({ length: MAX_GUESSES - guesses.length }).map((_, i) => (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={`empty-${i}`} 
                      className="hidden lg:flex min-w-0 bg-slate-800/30 border border-slate-700/50 rounded-xl h-[74px] items-center justify-center text-slate-500/50 backdrop-blur-sm"
                    >
                      <span className="font-medium text-sm tracking-wider uppercase">Signal {guesses.length + i + 1}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
             </div>
           </motion.div>
         ) : (
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="glassmorphism rounded-3xl p-4 sm:p-6 flex flex-col items-center text-center justify-start border-white/20 overflow-y-auto custom-scrollbar lg:h-full"
           >
              {gameState === 'won' ? (
                <div className="mb-6 p-5 bg-success/10 border border-success/30 rounded-2xl w-full">
                  <h2 className="text-2xl sm:text-3xl font-bold text-success mb-2 drop-shadow-md">Verified!</h2>
                  <p className="text-slate-300">Target localized successfully.</p>
                </div>
              ) : (
                <div className="mb-6 p-5 bg-accent/10 border border-accent/30 rounded-2xl w-full">
                  <h2 className="text-2xl sm:text-3xl font-bold text-accent mb-2 drop-shadow-md">Signal Lost</h2>
                  <p className="text-slate-300">Out of tracking attempts.</p>
                  <p className="mt-2 text-sm text-slate-400">Target was: <strong className="text-white">{targetCountry.name}</strong></p>
                </div>
              )}

              {/* Show the country card data */}
              {gameState === 'won' && <CountryCard country={targetCountry} onNextGame={() => startNewGame()} />}

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startNewGame()}
                className="mt-6 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 neon-shadow-blue"
              >
                <RefreshCw className="w-5 h-5" /> RE-SCAN SECTOR
              </motion.button>
           </motion.div>
         )}
      </div>

      {/* Main Content Area: 3D GLOBE — shown SECOND on mobile */}
      <div className="lg:w-2/3 lg:h-full flex flex-col relative order-2 lg:order-1">
        
        {/* Game Title Bar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glassmorphism rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 flex items-center justify-between"
        >
          <div>
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 neon-text-blue">
              <Globe2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              GeoGuesser Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 ml-7 sm:ml-8 font-light">Locate the hidden territory</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/50 px-3 sm:px-4 py-2 rounded-xl border border-white/5 shadow-inner">
            <button 
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? "Hide Country Names" : "Show Country Names"}
              className="hidden sm:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-2"
            >
              {showLabels ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <div className="w-px h-6 bg-slate-700/50 hidden sm:block mr-2"></div>
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <span className="text-lg sm:text-xl font-bold">
              <span className="text-white">{guesses.length}</span>
              <span className="text-slate-500"> / {MAX_GUESSES}</span>
            </span>
          </div>
        </motion.div>

        {/* Initial Hint Banner */}
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          {gameState === 'playing' && initialHint && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glassmorphism border border-primary/30 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg flex-1 neon-shadow-blue"
            >
              <Lightbulb className="w-5 h-5 text-primary shrink-0" />
              <span className="font-medium text-slate-200 tracking-wide text-sm sm:text-base">{initialHint}</span>
            </motion.div>
          )}

          {/* Mobile Label Toggle */}
          <button 
            onClick={() => setShowLabels(!showLabels)}
            className="sm:hidden glassmorphism border border-white/10 p-2.5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            {showLabels ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* The 3D Globe */}
        <div className="flex-1 relative w-full lg:h-full min-h-[300px] sm:min-h-[380px]">
           <GlobeMap countries={countries} guesses={guesses} targetCountry={targetCountry} gameState={gameState} showLabels={showLabels} />
        </div>

      </div>

    </motion.div>
  );
};

export default Game;
