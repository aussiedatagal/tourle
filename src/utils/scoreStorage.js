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
    const defaultStats = {
      totalPuzzlesCompleted: 0,
      totalAttempts: 0,
      averageEfficiency: 0,
      bestEfficiency: 0,
      puzzlesByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0
      },
      lastPlayed: null,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null
    };
    
    if (stats) {
      const parsed = JSON.parse(stats);
      // Ensure streak fields exist for backward compatibility
      return {
        ...defaultStats,
        ...parsed,
        currentStreak: parsed.currentStreak || 0,
        bestStreak: parsed.bestStreak || 0,
        lastCompletedDate: parsed.lastCompletedDate || null
      };
    }
    
    return defaultStats;
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
      lastPlayed: null,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null
    };
  }
}

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateString(dateStr) {
  // If dateStr is already in YYYY-MM-DD format, return it
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // Otherwise, use today's date
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Calculate days difference between two dates
 */
function daysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
    
    // Update streak
    const completedDate = getDateString(scoreData.date);
    
    if (stats.lastCompletedDate) {
      if (completedDate === stats.lastCompletedDate) {
        // Same day - don't change streak
        // (user might have completed multiple difficulties on the same day)
      } else {
        // Different day - check if consecutive
        const daysDiff = daysDifference(completedDate, stats.lastCompletedDate);
        
        // Check if completedDate is after lastCompletedDate
        const lastDate = new Date(stats.lastCompletedDate);
        const currentDate = new Date(completedDate);
        const isAfter = currentDate > lastDate;
        
        if (isAfter && daysDiff === 1) {
          // Consecutive day - increment streak
          stats.currentStreak += 1;
          stats.lastCompletedDate = completedDate;
        } else if (isAfter && daysDiff > 1) {
          // Streak broken - reset to 1 (this completion starts a new streak)
          stats.currentStreak = 1;
          stats.lastCompletedDate = completedDate;
        } else if (!isAfter) {
          // Completed an older date - don't update streak or lastCompletedDate
          // (user is playing a past puzzle, shouldn't affect current streak)
        }
      }
    } else {
      // First completion - start streak at 1
      stats.currentStreak = 1;
      stats.lastCompletedDate = completedDate;
    }
    
    // Update best streak
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    
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

