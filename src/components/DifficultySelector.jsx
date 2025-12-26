export function DifficultySelector({ selectedDifficulty, onDifficultyChange, theme }) {
  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const handleDifficultyChange = (e) => {
    const newDifficulty = e.target.value;
    if (newDifficulty) {
      onDifficultyChange(newDifficulty);
    }
  };

  return (
    <div className="difficulty-selector">
      <label htmlFor="difficulty-select" className="difficulty-label">
        Difficulty:
      </label>
      <select
        id="difficulty-select"
        className="difficulty-select"
        value={selectedDifficulty || 'medium'}
        onChange={handleDifficultyChange}
      >
        {difficulties.map(diff => (
          <option key={diff.value} value={diff.value}>
            {diff.label}
          </option>
        ))}
      </select>
    </div>
  );
}


