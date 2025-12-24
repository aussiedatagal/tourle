/**
 * Score Storage Utility
 * Manages local storage for tracking puzzle scores, best scores, and statistics
 */

const STORAGE_KEY = 'tsp-scores';
const STATS_KEY = 'tsp-statistics';

/**
 * Get all stored scores
 */
export function getAllScores() {
  try {
    const scores = localStorage.getItem(STORAGE_KEY);
    return scores ? JSON.parse(scores) : {};
  } catch (error) {
    console.error('Error reading scores from storage:', error);
    return {};
  }
}

/**
 * Get scores for a specific puzzle (date + difficulty)
 */
export function getPuzzleScores(date, difficulty) {
  const allScores = getAllScores();
  const key = `${date}_${difficulty}`;
  return allScores[key] || [];
}

/**
 * Get best score for a specific puzzle
 */
export function getBestScore(date, difficulty) {
  const scores = getPuzzleScores(date, difficulty);
  if (scores.length === 0) return null;
  
  // Best score is the one with highest efficiency
  return scores.reduce((best, current) => {
    const currentEfficiency = parseFloat(current.efficiency.replace('%', ''));
    const bestEfficiency = parseFloat(best.efficiency.replace('%', ''));
    return currentEfficiency > bestEfficiency ? current : best;
  });
}

/**
 * Save a score for a puzzle
 */
export function saveScore(date, difficulty, scoreData) {
  try {
    const allScores = getAllScores();
    const key = `${date}_${difficulty}`;
    
    if (!allScores[key]) {
      allScores[key] = [];
    }
    
    // Add timestamp if not present
    const scoreWithTimestamp = {
      ...scoreData,
      timestamp: scoreData.timestamp || Date.now(),
      date: date,
      difficulty: difficulty
    };
    
    allScores[key].push(scoreWithTimestamp);
    
    // Keep only last 50 scores per puzzle to prevent storage bloat
    if (allScores[key].length > 50) {
      allScores[key] = allScores[key].slice(-50);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allScores));
    
    // Update statistics
    updateStatistics(scoreWithTimestamp);
    
    return true;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
}

/**
 * Get overall statistics
 */
export function getStatistics() {
  try {
    const stats = localStorage.getItem(STATS_KEY);
    return stats ? JSON.parse(stats) : {
      totalPuzzlesCompleted: 0,
      totalAttempts: 0,
      averageEfficiency: 0,
      bestEfficiency: 0,
      puzzlesByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0
      },
      lastPlayed: null
    };
  } catch (error) {
    console.error('Error reading statistics:', error);
    return {
      totalPuzzlesCompleted: 0,
      totalAttempts: 0,
      averageEfficiency: 0,
      bestEfficiency: 0,
      puzzlesByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0
      },
      lastPlayed: null
    };
  }
}

/**
 * Update statistics when a new score is saved
 */
function updateStatistics(scoreData) {
  try {
    const stats = getStatistics();
    const efficiency = parseFloat(scoreData.efficiency.replace('%', ''));
    
    stats.totalPuzzlesCompleted += 1;
    stats.totalAttempts += (scoreData.attempts || 1);
    
    // Update average efficiency
    const currentTotal = stats.averageEfficiency * (stats.totalPuzzlesCompleted - 1);
    stats.averageEfficiency = (currentTotal + efficiency) / stats.totalPuzzlesCompleted;
    
    // Update best efficiency
    if (efficiency > stats.bestEfficiency) {
      stats.bestEfficiency = efficiency;
    }
    
    // Update difficulty counts
    if (scoreData.difficulty && stats.puzzlesByDifficulty[scoreData.difficulty] !== undefined) {
      stats.puzzlesByDifficulty[scoreData.difficulty] += 1;
    }
    
    stats.lastPlayed = new Date().toISOString();
    
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

/**
 * Get recent scores (last N scores across all puzzles)
 */
export function getRecentScores(limit = 10) {
  const allScores = getAllScores();
  const allScoresArray = [];
  
  // Flatten all scores into a single array
  for (const [key, scores] of Object.entries(allScores)) {
    for (const score of scores) {
      allScoresArray.push({
        ...score,
        puzzleKey: key
      });
    }
  }
  
  // Sort by timestamp (newest first) and return limit
  return allScoresArray
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
}

/**
 * Clear all scores (for testing/reset)
 */
export function clearAllScores() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing scores:', error);
    return false;
  }
}

/**
 * Get completion status for all puzzles
 */
export function getCompletionStatus() {
  const allScores = getAllScores();
  const completion = {};
  
  for (const [key, scores] of Object.entries(allScores)) {
    if (scores.length > 0) {
      const [date, difficulty] = key.split('_');
      if (!completion[date]) {
        completion[date] = {};
      }
      completion[date][difficulty] = {
        completed: true,
        bestScore: getBestScore(date, difficulty),
        totalAttempts: scores.length
      };
    }
  }
  
  return completion;
}

