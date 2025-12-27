import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { GameCanvas } from './components/GameCanvas';
import { GameInfo } from './components/GameInfo';
import { Controls } from './components/Controls';
import { WinMessage } from './components/WinMessage';
import { ReturnReminder } from './components/ReturnReminder';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { DateSelector } from './components/DateSelector';
import { Instructions } from './components/Instructions';
import { Statistics } from './components/Statistics';
import { themes } from './themes';
import { getMostRecentAvailableDate, checkPuzzleExists } from './utils/puzzleLoader';

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('tsp-theme');
    return savedTheme && themes[savedTheme] ? themes[savedTheme] : themes.christmas;
  });

  useEffect(() => {
    localStorage.setItem('tsp-theme', theme.name);
  }, [theme]);

  const [selectedDate, setSelectedDate] = useState(null); // Will be set in useEffect
  const [isInitializing, setIsInitializing] = useState(true);

  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedDifficulty = localStorage.getItem('tsp-selected-difficulty');
    return savedDifficulty && ['easy', 'medium', 'hard'].includes(savedDifficulty)
      ? savedDifficulty
      : 'medium';
  });

  // Initialize selectedDate: check saved date, then today, then most recent available
  // Only switch to latest if user's date is also the latest
  useEffect(() => {
    const initializeDate = async () => {
      const savedDate = localStorage.getItem('tsp-selected-date');
      if (savedDate) {
        const [year, month, day] = savedDate.split('-');
        // Validate that it's a reasonable date
        if (year && month && day && parseInt(day) >= 1 && parseInt(day) <= 31) {
          // Check if saved date's puzzle exists
          const exists = await checkPuzzleExists(year, month, day, selectedDifficulty);
          if (exists) {
            // Puzzle exists for saved date, use it
            setSelectedDate(savedDate);
            setIsInitializing(false);
            return;
          }
          
          // Saved date's puzzle doesn't exist, check if it's today
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          if (savedDate === todayStr) {
            // It's today but puzzle doesn't exist yet, use most recent available
            const mostRecent = await getMostRecentAvailableDate(selectedDifficulty);
            if (mostRecent) {
              setSelectedDate(mostRecent);
              setIsInitializing(false);
              return;
            }
          } else {
            // Saved date is not today and puzzle doesn't exist, but don't auto-switch
            // Just use the saved date and let the fallback handle it
            setSelectedDate(savedDate);
            setIsInitializing(false);
            return;
          }
        }
      }
      
      // No valid saved date, use today if it exists, otherwise most recent available
      // But only use most recent if today is also the latest available
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayExists = await checkPuzzleExists(today.getFullYear().toString(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0'), selectedDifficulty);
      
      if (todayExists) {
        // Today's puzzle exists, use it
        setSelectedDate(todayStr);
      } else {
        // Today's puzzle doesn't exist, check if today is the latest available
        const mostRecent = await getMostRecentAvailableDate(selectedDifficulty);
        if (mostRecent && mostRecent === todayStr) {
          // Today is the latest available (shouldn't happen, but handle it)
          setSelectedDate(todayStr);
        } else if (mostRecent) {
          // Use most recent available
          setSelectedDate(mostRecent);
        } else {
          // No puzzles available, use today anyway (fallback will handle it)
          setSelectedDate(todayStr);
        }
      }
      setIsInitializing(false);
    };
    
    initializeDate();
  }, [selectedDifficulty]);

  const [showStatistics, setShowStatistics] = useState(false);
  const [showInstructions, setShowInstructions] = useState(() => {
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('tsp-has-visited');
    if (!hasVisited) {
      localStorage.setItem('tsp-has-visited', 'true');
      return true; // Show instructions on first visit
    }
    return false;
  });
  const [showWinMessage, setShowWinMessage] = useState(false);
  const winMessageDismissedRef = useRef(false);

  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('tsp-selected-date', selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDifficulty) {
      localStorage.setItem('tsp-selected-difficulty', selectedDifficulty);
    }
  }, [selectedDifficulty]);

  const {
    puzzleData,
    route,
    visitedHouses,
    gameComplete,
    showingSolution,
    solutionRoute,
    solutionAnimationIndex,
    showReminder,
    currentDistance,
    efficiency,
    routeAnimationProgress,
    attempts,
    handleNodeClick,
    undoLastMove,
    resetRoute,
    toggleSolution
  } = useGameState(selectedDate, selectedDifficulty, setSelectedDate);

  // Show win message popup when game is completed (only once per completion)
  useEffect(() => {
    if (gameComplete && !showWinMessage && !winMessageDismissedRef.current) {
      setShowWinMessage(true);
      winMessageDismissedRef.current = false; // Reset when showing
    } else if (!gameComplete) {
      setShowWinMessage(false);
      winMessageDismissedRef.current = false; // Reset when game is reset
    }
  }, [gameComplete, showWinMessage]);

  const finalEfficiency = gameComplete ? efficiency : '-';

  return (
    <div className="container">
      <ThemeSwitcher currentTheme={theme} onThemeChange={setTheme} />
      <header>
        <h1 className="theme-switcher-title">{theme.title}</h1>
        <p className="subtitle">{theme.subtitle}</p>
      </header>

      <Instructions 
        theme={theme} 
        isOpen={showInstructions}
        onClose={setShowInstructions}
      />

      <div className="canvas-container">
        <GameCanvas
          puzzleData={puzzleData}
          route={route}
          visitedHouses={visitedHouses}
          gameComplete={gameComplete}
          showingSolution={showingSolution}
          solutionRoute={solutionRoute}
          solutionAnimationIndex={solutionAnimationIndex}
          routeAnimationProgress={routeAnimationProgress}
          onNodeClick={handleNodeClick}
          theme={theme}
        />
      </div>

      <Controls
        route={route}
        onUndo={undoLastMove}
        onReset={resetRoute}
        onToggleSolution={toggleSolution}
        showingSolution={showingSolution}
        theme={theme}
        difficulty={selectedDifficulty}
        onShowInstructions={() => setShowInstructions(true)}
      />

      <GameInfo
        puzzleData={puzzleData}
        currentDistance={currentDistance}
        efficiency={efficiency}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={setSelectedDifficulty}
        gameComplete={gameComplete}
        attempts={attempts}
        theme={theme}
        onShowStatistics={() => setShowStatistics(true)}
      />

      <DateSelector
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        theme={theme}
        difficulty={selectedDifficulty}
      />

      <WinMessage
        efficiency={finalEfficiency}
        isVisible={showWinMessage}
        theme={theme}
        puzzleData={puzzleData}
        currentDistance={currentDistance}
        attempts={attempts}
        selectedDifficulty={selectedDifficulty}
        onClose={(close) => {
          setShowWinMessage(close);
          if (!close) {
            winMessageDismissedRef.current = true;
          }
        }}
        onTryAgain={() => {
          resetRoute();
          setShowWinMessage(false);
          winMessageDismissedRef.current = false;
        }}
        onDifficultyChange={(newDifficulty) => {
          setSelectedDifficulty(newDifficulty);
          setShowWinMessage(false);
          winMessageDismissedRef.current = false;
        }}
      />

      <ReturnReminder isVisible={showReminder} theme={theme} />

      <Statistics
        puzzleData={puzzleData}
        selectedDifficulty={selectedDifficulty}
        theme={theme}
        isOpen={showStatistics}
        onClose={() => setShowStatistics(false)}
      />
    </div>
  );
}

export default App;

