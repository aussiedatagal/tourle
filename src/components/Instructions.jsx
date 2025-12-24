import { useState } from 'react';

export function Instructions({ theme }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="instructions-container">
      <button
        className="instructions-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span>{theme.instructions.title}</span>
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="instructions-content">
          <ul>
            {theme.instructions.items.map((item, index) => (
              <li key={index}>
                <span className="bullet-icon">{theme.icons.instructionBullet}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

