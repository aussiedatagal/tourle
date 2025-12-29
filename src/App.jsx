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
import { getMostRecentAvailableDate, checkPuzzleExists, loadSolution } from './utils/puzzleLoader';

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('tsp-theme');
    return savedTheme && themes[savedTheme] ? themes[savedTheme] : themes.christmas;
  });

  useEffect(() => {
    localStorage.setItem('tsp-theme', theme.name);
  }, [theme]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedDifficulty = localStorage.getItem('tsp-selected-difficulty');
    return savedDifficulty && ['easy', 'medium', 'hard'].includes(savedDifficulty)
      ? savedDifficulty
      : 'medium';
  });

  useEffect(() => {
    const initializeDate = async () => {
      const savedDate = localStorage.getItem('tsp-selected-date');
      if (savedDate) {
        const [year, month, day] = savedDate.split('-');
        if (year && month && day && parseInt(day) >= 1 && parseInt(day) <= 31) {
          const exists = await checkPuzzleExists(year, month, day, selectedDifficulty);
          if (exists) {
            setSelectedDate(savedDate);
            setIsInitializing(false);
            return;
          }
          
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          if (savedDate === todayStr) {
            const mostRecent = await getMostRecentAvailableDate(selectedDifficulty);
            if (mostRecent) {
              setSelectedDate(mostRecent);
              setIsInitializing(false);
              return;
            }
          } else {
            setSelectedDate(savedDate);
            setIsInitializing(false);
            return;
          }
        }
      }
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayExists = await checkPuzzleExists(today.getFullYear().toString(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0'), selectedDifficulty);
      
      if (todayExists) {
        setSelectedDate(todayStr);
      } else {
        const mostRecent = await getMostRecentAvailableDate(selectedDifficulty);
        if (mostRecent && mostRecent === todayStr) {
          setSelectedDate(todayStr);
        } else if (mostRecent) {
          setSelectedDate(mostRecent);
        } else {
          setSelectedDate(todayStr);
        }
      }
      setIsInitializing(false);
    };
    
    initializeDate();
  }, [selectedDifficulty]);

  const [showStatistics, setShowStatistics] = useState(false);
  const [showInstructions, setShowInstructions] = useState(() => {
    const hasVisited = localStorage.getItem('tsp-has-visited');
    if (!hasVisited) {
      localStorage.setItem('tsp-has-visited', 'true');
      return true;
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
    toggleSolution,
    revealHardSolution
  } = useGameState(selectedDate, selectedDifficulty, setSelectedDate);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const helper = async (dateOverride = null) => {
      const targetDate = dateOverride || selectedDate || puzzleData?.date?.replace(' (Test)', '');
      if (!targetDate) {
        console.info('[dev] revealHardSolution: no puzzle loaded yet.');
        return null;
      }
      try {
        const solution = await loadSolution(targetDate, 'hard');
        console.info(`[dev] Hard solution for ${targetDate}:`, solution.route);
        return solution;
      } catch (error) {
        console.error('[dev] Failed to load hard solution. Ensure hard solutions exist locally.', error);
        return null;
      }
    };

    window.revealHardSolution = helper;
    console.info(
      '[dev] Hard puzzle helper ready. Run window.revealHardSolution() to log the optimal hard route (or pass a date "YYYY-MM-DD").'
    );

    return () => {
      delete window.revealHardSolution;
    };
  }, [selectedDate, puzzleData]);

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
          revealHardSolution={revealHardSolution}
          difficulty={selectedDifficulty}
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

