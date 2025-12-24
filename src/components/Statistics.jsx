import { useState, useEffect } from 'react';
import { getStatistics, getRecentScores, getBestScore, getCompletionStatus } from '../utils/scoreStorage';

export function Statistics({ puzzleData, selectedDifficulty, theme, isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [recentScores, setRecentScores] = useState([]);
  const [currentBest, setCurrentBest] = useState(null);
  const [showAllScores, setShowAllScores] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatistics();
    }
  }, [isOpen, puzzleData, selectedDifficulty]);

  const loadStatistics = () => {
    const statistics = getStatistics();
    setStats(statistics);
    
    const recent = getRecentScores(10);
    setRecentScores(recent);
    
    if (puzzleData) {
      const cleanDate = puzzleData.date.replace(' (Test)', '');
      const best = getBestScore(cleanDate, selectedDifficulty);
      setCurrentBest(best);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="statistics-overlay" onClick={onClose}>
      <div className="statistics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="statistics-header">
          <h2>📊 Your Statistics</h2>
          <button className="statistics-close" onClick={onClose}>×</button>
        </div>
        
        <div className="statistics-content">
          {stats && (
            <div className="statistics-section">
              <h3>Overall Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Puzzles Completed</span>
                  <span className="stat-value">{stats.totalPuzzlesCompleted}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Attempts</span>
                  <span className="stat-value">{stats.totalAttempts}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average Efficiency</span>
                  <span className="stat-value">{stats.averageEfficiency.toFixed(2)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Best Efficiency</span>
                  <span className="stat-value">{stats.bestEfficiency.toFixed(2)}%</span>
                </div>
              </div>
              
              <div className="difficulty-stats">
                <h4>By Difficulty</h4>
                <div className="difficulty-stats-grid">
                  <div className="difficulty-stat">
                    <span>Easy:</span>
                    <span>{stats.puzzlesByDifficulty.easy}</span>
                  </div>
                  <div className="difficulty-stat">
                    <span>Medium:</span>
                    <span>{stats.puzzlesByDifficulty.medium}</span>
                  </div>
                  <div className="difficulty-stat">
                    <span>Hard:</span>
                    <span>{stats.puzzlesByDifficulty.hard}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentBest && puzzleData && (
            <div className="statistics-section">
              <h3>Current Puzzle Best Score</h3>
              <div className="best-score-card">
                <div className="best-score-item">
                  <span>Distance:</span>
                  <span>{currentBest.distance.toFixed(2)}</span>
                </div>
                <div className="best-score-item">
                  <span>Efficiency:</span>
                  <span className="best-efficiency">{currentBest.efficiency}</span>
                </div>
                <div className="best-score-item">
                  <span>Attempts:</span>
                  <span>{currentBest.attempts || 1}</span>
                </div>
                {currentBest.timestamp && (
                  <div className="best-score-item">
                    <span>Date:</span>
                    <span>{new Date(currentBest.timestamp).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {recentScores.length > 0 && (
            <div className="statistics-section">
              <h3>Recent Scores</h3>
              <div className="recent-scores-list">
                {recentScores.slice(0, showAllScores ? recentScores.length : 5).map((score, index) => (
                  <div key={index} className="recent-score-item">
                    <div className="recent-score-header">
                      <span className="recent-score-date">{score.date}</span>
                      <span className="recent-score-difficulty">{score.difficulty}</span>
                    </div>
                    <div className="recent-score-details">
                      <span>Efficiency: {score.efficiency}</span>
                      <span>Distance: {score.distance.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {recentScores.length > 5 && (
                  <button 
                    className="show-more-btn"
                    onClick={() => setShowAllScores(!showAllScores)}
                  >
                    {showAllScores ? 'Show Less' : `Show All (${recentScores.length})`}
                  </button>
                )}
              </div>
            </div>
          )}

          {stats && stats.totalPuzzlesCompleted === 0 && (
            <div className="statistics-section">
              <p className="no-stats">No statistics yet. Complete your first puzzle to see your stats!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

