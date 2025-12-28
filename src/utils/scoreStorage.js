const STORAGE_KEY = 'tsp-scores';
const STATS_KEY = 'tsp-statistics';

export function getAllScores() {
  try {
    const scores = localStorage.getItem(STORAGE_KEY);
    return scores ? JSON.parse(scores) : {};
  } catch (error) {
    console.error('Error reading scores from storage:', error);
    return {};
  }
}

export function getPuzzleScores(date, difficulty) {
  const allScores = getAllScores();
  const key = `${date}_${difficulty}`;
  return allScores[key] || [];
}

export function getBestScore(date, difficulty) {
  const scores = getPuzzleScores(date, difficulty);
  if (scores.length === 0) return null;
  
  return scores.reduce((best, current) => {
    const currentEfficiency = parseFloat(current.efficiency.replace('%', ''));
    const bestEfficiency = parseFloat(best.efficiency.replace('%', ''));
    return currentEfficiency > bestEfficiency ? current : best;
  });
}

export function saveScore(date, difficulty, scoreData) {
  try {
    const allScores = getAllScores();
    const key = `${date}_${difficulty}`;
    
    if (!allScores[key]) {
      allScores[key] = [];
    }
    
    const scoreWithTimestamp = {
      ...scoreData,
      timestamp: scoreData.timestamp || Date.now(),
      date: date,
      difficulty: difficulty
    };
    
    allScores[key].push(scoreWithTimestamp);
    
    if (allScores[key].length > 50) {
      allScores[key] = allScores[key].slice(-50);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allScores));
    updateStatistics(scoreWithTimestamp);
    
    return true;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
}

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

function getDateString(dateStr) {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function daysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function updateStatistics(scoreData) {
  try {
    const stats = getStatistics();
    const efficiency = parseFloat(scoreData.efficiency.replace('%', ''));
    
    stats.totalPuzzlesCompleted += 1;
    stats.totalAttempts += (scoreData.attempts || 1);
    
    const currentTotal = stats.averageEfficiency * (stats.totalPuzzlesCompleted - 1);
    stats.averageEfficiency = (currentTotal + efficiency) / stats.totalPuzzlesCompleted;
    
    if (efficiency > stats.bestEfficiency) {
      stats.bestEfficiency = efficiency;
    }
    
    if (scoreData.difficulty && stats.puzzlesByDifficulty[scoreData.difficulty] !== undefined) {
      stats.puzzlesByDifficulty[scoreData.difficulty] += 1;
    }
    
    stats.lastPlayed = new Date().toISOString();
    
    const completedDate = getDateString(scoreData.date);
    
    if (stats.lastCompletedDate) {
      if (completedDate === stats.lastCompletedDate) {
      } else {
        const daysDiff = daysDifference(completedDate, stats.lastCompletedDate);
        const lastDate = new Date(stats.lastCompletedDate);
        const currentDate = new Date(completedDate);
        const isAfter = currentDate > lastDate;
        
        if (isAfter && daysDiff === 1) {
          stats.currentStreak += 1;
          stats.lastCompletedDate = completedDate;
        } else if (isAfter && daysDiff > 1) {
          stats.currentStreak = 1;
          stats.lastCompletedDate = completedDate;
        } else if (!isAfter) {
        }
      }
    } else {
      stats.currentStreak = 1;
      stats.lastCompletedDate = completedDate;
    }
    
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

export function getRecentScores(limit = 10) {
  const allScores = getAllScores();
  const allScoresArray = [];
  
  for (const [key, scores] of Object.entries(allScores)) {
    for (const score of scores) {
      allScoresArray.push({
        ...score,
        puzzleKey: key
      });
    }
  }
  
  return allScoresArray
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
}

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

