import { useState, useEffect } from 'react';
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

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('tsp-theme');
    return savedTheme && themes[savedTheme] ? themes[savedTheme] : themes.christmas;
  });

  useEffect(() => {
    localStorage.setItem('tsp-theme', theme.name);
  }, [theme]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const savedDate = localStorage.getItem('tsp-selected-date');
    if (savedDate) {
      const [year, month, day] = savedDate.split('-');
      if (year === '2025' && month === '12' && parseInt(day) >= 1 && parseInt(day) <= 24) {
        return savedDate;
      }
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    if (year === 2025 && month === 12 && day <= 24) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '2025-12-24';
  });

  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedDifficulty = localStorage.getItem('tsp-selected-difficulty');
    return savedDifficulty && ['easy', 'medium', 'hard'].includes(savedDifficulty)
      ? savedDifficulty
      : 'medium';
  });

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
  } = useGameState(selectedDate, selectedDifficulty);

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
      />

      <WinMessage
        efficiency={finalEfficiency}
        isVisible={gameComplete}
        theme={theme}
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

