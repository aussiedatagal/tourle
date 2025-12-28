import { useState, useEffect } from 'react';

export function Controls({ route, onUndo, onReset, onToggleSolution, showingSolution, theme, difficulty, onShowInstructions }) {
  const isHard = difficulty === 'hard';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleGiveUpClick = () => {
    if (!isHard) {
      onToggleSolution();
    }
  };
  
  return (
    <div className="controls">
      <div className="button-group">
        <button
          className="btn btn-secondary"
          onClick={onUndo}
          disabled={route.length === 0}
        >
          ← Back
        </button>
        <button className="btn" onClick={onReset}>
          Reset Route
        </button>
        {!isHard && (
          <div className="give-up-button-wrapper">
            <button
              className="btn btn-warning"
              onClick={handleGiveUpClick}
            >
              {showingSolution ? 'Hide Solution' : 'Give Up'}
            </button>
          </div>
        )}
        {onShowInstructions && (
          <button
            className="btn btn-secondary"
            onClick={onShowInstructions}
            title="Show instructions"
          >
            {isMobile ? '📖' : '📖 Instructions'}
          </button>
        )}
      </div>
    </div>
  );
}

