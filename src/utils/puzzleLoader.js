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
    if (!response.ok) {
      throw new Error('Puzzle not found');
    }
    const puzzleData = await response.json();
    return { puzzleData, isTest: false };
  } catch (error) {
    console.warn(`Puzzle for ${puzzlePath} not found, using fallback`);
    // Try legacy format (without difficulty) for backward compatibility
    const legacyPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${date.day}.json`;
    try {
      const legacyResponse = await fetch(legacyPath);
      if (legacyResponse.ok) {
        const puzzleData = await legacyResponse.json();
        return { puzzleData, isTest: false };
      }
    } catch (legacyError) {
      // Continue to fallback puzzle
    }
    
    // Try fallback puzzle with difficulty
    const fallbackPath = `${BASE_URL}puzzles/2025/12/24_${difficulty}.json`;
    try {
      const fallbackResponse = await fetch(fallbackPath);
      if (fallbackResponse.ok) {
        const puzzleData = await fallbackResponse.json();
        return { puzzleData: { ...puzzleData, date: puzzleData.date + ' (Test)' }, isTest: true };
      }
    } catch (fallbackError) {
      // Continue to legacy fallback
    }
    
    // Try legacy fallback format (without difficulty) for backward compatibility
    const legacyFallbackPath = `${BASE_URL}puzzles/2025/12/24.json`;
    try {
      const legacyFallbackResponse = await fetch(legacyFallbackPath);
      if (legacyFallbackResponse.ok) {
        const puzzleData = await legacyFallbackResponse.json();
        return { puzzleData: { ...puzzleData, date: puzzleData.date + ' (Test)' }, isTest: true };
      }
    } catch (legacyFallbackError) {
      // All fallbacks failed
    }
    
    console.error('Error loading fallback puzzle: All fallbacks failed');
    throw new Error('Fallback puzzle also not found');
  }
}

export async function loadSolution(puzzleDate, difficulty = 'medium') {
  const [year, month, day] = puzzleDate.split('-');
  const solutionPath = `${BASE_URL}puzzles/${year}/${month}/${day}_${difficulty}_solution.json`;

  try {
    const response = await fetch(solutionPath);
    if (!response.ok) {
      throw new Error('Solution not found');
    }
    const solution = await response.json();
    return solution;
  } catch (error) {
    // Try without difficulty suffix for backward compatibility
    const legacyPath = `${BASE_URL}puzzles/${year}/${month}/${day}_solution.json`;
    try {
      const legacyResponse = await fetch(legacyPath);
      if (legacyResponse.ok) {
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
async function checkPuzzleExists(year, month, day, difficulty = 'medium') {
  const puzzlePath = `${BASE_URL}puzzles/${year}/${month}/${day}_${difficulty}.json`;
  try {
    const response = await fetch(puzzlePath, { method: 'GET', cache: 'no-cache' });
    if (response.ok) return true;
  } catch (error) {
    // Ignore
  }
  
  // Try legacy format (without difficulty)
  const legacyPath = `${BASE_URL}puzzles/${year}/${month}/${day}.json`;
  try {
    const response = await fetch(legacyPath, { method: 'GET', cache: 'no-cache' });
    if (response.ok) return true;
  } catch (error) {
    // Ignore
  }
  
  return false;
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

