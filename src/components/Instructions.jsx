export function Instructions({ theme, isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (onClose) {
      onClose(false);
    }
  };

  return (
    <div className="instructions-overlay" onClick={handleClose}>
      <div className="instructions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="instructions-header">
          <h2>{theme.instructions.title}</h2>
          <button
            className="instructions-close"
            onClick={handleClose}
            aria-label="Close instructions"
          >
            ×
          </button>
        </div>
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
      </div>
    </div>
  );
}

