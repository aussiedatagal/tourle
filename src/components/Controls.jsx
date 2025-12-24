import { useState } from 'react';

export function Controls({ route, onUndo, onReset, onToggleSolution, showingSolution, theme, difficulty }) {
  const isHard = difficulty === 'hard';
  const [showMessage, setShowMessage] = useState(false);
  
  const handleGiveUpClick = (e) => {
    if (isHard) {
      e.preventDefault();
      setShowMessage(true);
      // Hide message after 3 seconds
      setTimeout(() => setShowMessage(false), 3000);
    } else {
      onToggleSolution();
    }
  };
  
  const handleMouseEnter = () => {
    if (isHard) {
      setShowMessage(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (isHard) {
      setShowMessage(false);
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
        <div className="give-up-button-wrapper">
          <button
            className={`btn btn-warning ${isHard ? 'btn-disabled-look' : ''}`}
            onClick={handleGiveUpClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            title={isHard ? "💪 Hard puzzles don't have solutions available. You must solve it yourself!" : undefined}
          >
            {showingSolution ? 'Hide Solution' : 'Give Up'}
          </button>
          {isHard && showMessage && (
            <div className="hard-puzzle-tooltip">
              💪 Hard puzzles don't have solutions available. You must solve it yourself!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

