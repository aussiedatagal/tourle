// Get base URL for GitHub Pages deployment
const BASE_URL = import.meta.env.BASE_URL || '/';

export async function loadPuzzle(date = null, difficulty = 'medium') {
  if (!date) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    date = { year, month, day };
  }

  const puzzlePath = `${BASE_URL}puzzles/${date.year}/${date.month}/${date.day}_${difficulty}.json`;

  try {
    const response = await fetch(puzzlePath);
    const contentType = response.headers.get('content-type');
    if (!response.ok || (contentType && !contentType.includes('application/json'))) {
      throw new Error('Puzzle not found');
    }
    const puzzleData = await response.json();
    // Return the requested date as the actual date (puzzle was found for this date)
    const actualDate = `${date.year}-${date.month}-${date.day}`;
    return { puzzleData, isTest: false, actualDate };
  } catch (error) {
    // Try legacy format (without difficulty) for backward compatibility
    const legacyPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${date.day}.json`;
    try {
      const legacyResponse = await fetch(legacyPath);
      const legacyContentType = legacyResponse.headers.get('content-type');
      if (legacyResponse.ok && (!legacyContentType || legacyContentType.includes('application/json'))) {
        const puzzleData = await legacyResponse.json();
        // Return the requested date as the actual date (puzzle was found for this date)
        const actualDate = `${date.year}-${date.month}-${date.day}`;
        return { puzzleData, isTest: false, actualDate };
      }
    } catch (legacyError) {
      // Continue to fallback puzzle
    }
    
    // Find the most recent available puzzle before the requested date
    const mostRecent = await findMostRecentPuzzle(date.year, date.month, date.day, difficulty);
    if (mostRecent) {
      const recentPath = `${BASE_URL}puzzles/${mostRecent.year}/${mostRecent.month}/${mostRecent.day}_${difficulty}.json`;
      try {
        const recentResponse = await fetch(recentPath);
        if (recentResponse.ok) {
          const puzzleData = await recentResponse.json();
          // Return the actual date used (from the fallback puzzle)
          const actualDate = `${mostRecent.year}-${mostRecent.month}-${mostRecent.day}`;
          return { puzzleData, isTest: false, actualDate };
        }
      } catch (recentError) {
        // Continue to legacy format
      }
      
      // Try legacy format for most recent
      const recentLegacyPath = `${BASE_URL}puzzles/${mostRecent.year}/${mostRecent.month}/${mostRecent.day}.json`;
      try {
        const recentLegacyResponse = await fetch(recentLegacyPath);
        if (recentLegacyResponse.ok) {
          const puzzleData = await recentLegacyResponse.json();
          // Return the actual date used (from the fallback puzzle)
          const actualDate = `${mostRecent.year}-${mostRecent.month}-${mostRecent.day}`;
          return { puzzleData, isTest: false, actualDate };
        }
      } catch (recentLegacyError) {
        // Continue to error
      }
    }
    
    // If we get here, findMostRecentPuzzle returned null, which shouldn't happen
    // But let's try one more time with a broader search
    console.warn(`Puzzle for ${puzzlePath} not found, attempting broader fallback search`);
    
    // Try to find any available puzzle in the same month
    const availableDays = await discoverAvailableDates(date.year, date.month, difficulty);
    if (availableDays.length > 0) {
      const mostRecentDay = availableDays[availableDays.length - 1];
      const dayStr = String(mostRecentDay).padStart(2, '0');
      const fallbackPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${dayStr}_${difficulty}.json`;
      try {
        const fallbackResponse = await fetch(fallbackPath);
        if (fallbackResponse.ok) {
          const puzzleData = await fallbackResponse.json();
          const actualDate = `${date.year}-${date.month}-${dayStr}`;
          return { puzzleData, isTest: false, actualDate };
        }
      } catch (fallbackError) {
        // Try legacy format
        const legacyFallbackPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${dayStr}.json`;
        try {
          const legacyFallbackResponse = await fetch(legacyFallbackPath);
          if (legacyFallbackResponse.ok) {
            const puzzleData = await legacyFallbackResponse.json();
            const actualDate = `${date.year}-${date.month}-${dayStr}`;
            return { puzzleData, isTest: false, actualDate };
          }
        } catch (legacyFallbackError) {
          // Continue to error
        }
      }
    }
    
    console.error('Error loading puzzle: No puzzle found and no fallback available');
    throw new Error('Puzzle not found');
  }
}

export async function loadSolution(puzzleDate, difficulty = 'medium') {
  const [year, month, day] = puzzleDate.split('-');
  const solutionPath = `${BASE_URL}puzzles/${year}/${month}/${day}_${difficulty}_solution.json`;

  try {
    const response = await fetch(solutionPath);
    const contentType = response.headers.get('content-type');
    if (!response.ok || (contentType && !contentType.includes('application/json'))) {
      throw new Error('Solution not found');
    }
    const solution = await response.json();
    return solution;
  } catch (error) {
    // Try without difficulty suffix for backward compatibility
    const legacyPath = `${BASE_URL}puzzles/${year}/${month}/${day}_solution.json`;
    try {
      const legacyResponse = await fetch(legacyPath);
      const legacyContentType = legacyResponse.headers.get('content-type');
      if (legacyResponse.ok && (!legacyContentType || legacyContentType.includes('application/json'))) {
        return await legacyResponse.json();
      }
    } catch (legacyError) {
      // Ignore and throw original error
    }
    console.error('Error loading solution:', error);
    throw error;
  }
}

/**
 * Check if a puzzle exists for a given date and difficulty
 */
export async function checkPuzzleExists(year, month, day, difficulty = 'medium') {
  const puzzlePath = `${BASE_URL}puzzles/${year}/${month}/${day}_${difficulty}.json`;
  try {
    const response = await fetch(puzzlePath, { method: 'GET', cache: 'no-cache' });
    const contentType = response.headers.get('content-type');
    if (response.ok && contentType && contentType.includes('application/json')) return true;
  } catch (error) {
    // Ignore
  }
  
  // Try legacy format (without difficulty)
  const legacyPath = `${BASE_URL}puzzles/${year}/${month}/${day}.json`;
  try {
    const response = await fetch(legacyPath, { method: 'GET', cache: 'no-cache' });
    const contentType = response.headers.get('content-type');
    if (response.ok && contentType && contentType.includes('application/json')) return true;
  } catch (error) {
    // Ignore
  }
  
  return false;
}

/**
 * Find the most recent available puzzle before the given date
 * Returns { year, month, day } or null if none found
 */
async function findMostRecentPuzzle(year, month, day, difficulty = 'medium') {
  const requestedDay = parseInt(day);
  
  // Check backwards from the requested day
  for (let d = requestedDay - 1; d >= 1; d--) {
    const dayStr = String(d).padStart(2, '0');
    if (await checkPuzzleExists(year, month, dayStr, difficulty)) {
      return { year, month, day: dayStr };
    }
  }
  
  // If nothing found in current month, try previous month
  // For simplicity, we'll just return null and let the caller use a hardcoded fallback
  // In a more sophisticated implementation, we could check previous months
  return null;
}

/**
 * Discover available puzzle dates for a given year and month
 * Returns an array of day numbers (1-31) that have puzzles available
 */
export async function discoverAvailableDates(year, month, difficulty = 'medium') {
  const availableDays = [];
  const maxDays = 31; // Check up to 31 days
  
  // Check all days in parallel for better performance
  const checks = [];
  for (let day = 1; day <= maxDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    checks.push(
      checkPuzzleExists(year, month, dayStr, difficulty)
        .then(exists => exists ? day : null)
    );
  }
  
  const results = await Promise.all(checks);
  return results.filter(day => day !== null).sort((a, b) => a - b);
}

/**
 * Get the most recent available puzzle date (today or the most recent before today)
 * Returns a date string in YYYY-MM-DD format, or null if no puzzles exist
 */
export async function getMostRecentAvailableDate(difficulty = 'medium') {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = today.getDate();
  
  // Check if today's puzzle exists
  const todayStr = String(day).padStart(2, '0');
  if (await checkPuzzleExists(year, month, todayStr, difficulty)) {
    return `${year}-${month}-${todayStr}`;
  }
  
  // Find the most recent available puzzle before today
  const availableDays = await discoverAvailableDates(year, month, difficulty);
  if (availableDays.length > 0) {
    // Filter to only days before today
    const pastDays = availableDays.filter(d => d < day);
    if (pastDays.length > 0) {
      const mostRecentDay = pastDays[pastDays.length - 1];
      return `${year}-${month}-${String(mostRecentDay).padStart(2, '0')}`;
    }
  }
  
  return null;
}

