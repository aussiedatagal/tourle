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

  const getContentType = (response) => {
    const headers = response?.headers;
    return headers?.get ? headers.get('content-type') : headers?.['content-type'];
  };

  try {
    const response = await fetch(puzzlePath);
    const contentType = getContentType(response);
    const ok = response?.ok === undefined ? true : response.ok;
    if (!ok || (contentType && !contentType.includes('application/json'))) {
      throw new Error('Puzzle not found');
    }
    const puzzleData = await response.json();
    const actualDate = `${date.year}-${date.month}-${date.day}`;
    return { puzzleData, isTest: false, actualDate };
  } catch (error) {
    const legacyPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${date.day}.json`;
    try {
      const legacyResponse = await fetch(legacyPath);
      const legacyContentType = getContentType(legacyResponse);
      const ok = legacyResponse?.ok === undefined ? true : legacyResponse.ok;
      if (ok && (!legacyContentType || legacyContentType.includes('application/json'))) {
        const puzzleData = await legacyResponse.json();
        const actualDate = `${date.year}-${date.month}-${date.day}`;
        return { puzzleData, isTest: false, actualDate };
      }
    } catch (legacyError) {
    }
    
    // Find the most recent available puzzle before the requested date
    const mostRecent = await findMostRecentPuzzle(date.year, date.month, date.day, difficulty);
    if (mostRecent) {
      const recentPath = `${BASE_URL}puzzles/${mostRecent.year}/${mostRecent.month}/${mostRecent.day}_${difficulty}.json`;
      try {
        const recentResponse = await fetch(recentPath);
        const ok = recentResponse?.ok === undefined ? true : recentResponse.ok;
        if (ok) {
          const puzzleData = await recentResponse.json();
          const actualDate = `${mostRecent.year}-${mostRecent.month}-${mostRecent.day}`;
          return { puzzleData, isTest: false, actualDate };
        }
    } catch (recentError) {
    }
      
      // Try legacy format for most recent
      const recentLegacyPath = `${BASE_URL}puzzles/${mostRecent.year}/${mostRecent.month}/${mostRecent.day}.json`;
      try {
        const recentLegacyResponse = await fetch(recentLegacyPath);
        const ok = recentLegacyResponse?.ok === undefined ? true : recentLegacyResponse.ok;
        if (ok) {
          const puzzleData = await recentLegacyResponse.json();
          const actualDate = `${mostRecent.year}-${mostRecent.month}-${mostRecent.day}`;
          return { puzzleData, isTest: false, actualDate };
        }
      } catch (recentLegacyError) {
      }
    }
    
    console.warn(`Puzzle for ${puzzlePath} not found, attempting broader fallback search`);
    
    const availableDays = await discoverAvailableDates(date.year, date.month, difficulty);
    if (availableDays.length > 0) {
      const mostRecentDay = availableDays[availableDays.length - 1];
      const dayStr = String(mostRecentDay).padStart(2, '0');
      const fallbackPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${dayStr}_${difficulty}.json`;
      try {
        const fallbackResponse = await fetch(fallbackPath);
        const ok = fallbackResponse?.ok === undefined ? true : fallbackResponse.ok;
        if (ok) {
          const puzzleData = await fallbackResponse.json();
          const actualDate = `${date.year}-${date.month}-${dayStr}`;
          return { puzzleData, isTest: false, actualDate };
        }
        } catch (fallbackError) {
          const legacyFallbackPath = `${BASE_URL}puzzles/${date.year}/${date.month}/${dayStr}.json`;
        try {
          const legacyFallbackResponse = await fetch(legacyFallbackPath);
          const ok = legacyFallbackResponse?.ok === undefined ? true : legacyFallbackResponse.ok;
          if (ok) {
            const puzzleData = await legacyFallbackResponse.json();
            const actualDate = `${date.year}-${date.month}-${dayStr}`;
            return { puzzleData, isTest: false, actualDate };
          }
          } catch (legacyFallbackError) {
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

  const getContentType = (response) => {
    const headers = response?.headers;
    return headers?.get ? headers.get('content-type') : headers?.['content-type'];
  };

  try {
    const response = await fetch(solutionPath);
    const contentType = getContentType(response);
    const ok = response?.ok === undefined ? true : response.ok;
    if (!ok || (contentType && !contentType.includes('application/json'))) {
      throw new Error('Solution not found');
    }
    const solution = await response.json();
    return solution;
  } catch (error) {
    const legacyPath = `${BASE_URL}puzzles/${year}/${month}/${day}_solution.json`;
    try {
      const legacyResponse = await fetch(legacyPath);
      const legacyContentType = getContentType(legacyResponse);
      const ok = legacyResponse?.ok === undefined ? true : legacyResponse.ok;
      if (ok && (!legacyContentType || legacyContentType.includes('application/json'))) {
        return await legacyResponse.json();
      }
    } catch (legacyError) {
    }
    console.error('Error loading solution:', error);
    throw error;
  }
}

export async function checkPuzzleExists(year, month, day, difficulty = 'medium') {
  const puzzlePath = `${BASE_URL}puzzles/${year}/${month}/${day}_${difficulty}.json`;
  const getContentType = (response) => {
    const headers = response?.headers;
    return headers?.get ? headers.get('content-type') : headers?.['content-type'];
  };
  try {
    const response = await fetch(puzzlePath, { method: 'GET', cache: 'no-cache' });
    const contentType = getContentType(response);
    const ok = response?.ok === undefined ? true : response.ok;
    if (ok && (!contentType || contentType.includes('application/json'))) return true;
  } catch (error) {
    // Ignore
  }
  
    const legacyPath = `${BASE_URL}puzzles/${year}/${month}/${day}.json`;
  try {
    const response = await fetch(legacyPath, { method: 'GET', cache: 'no-cache' });
    const contentType = getContentType(response);
    const ok = response?.ok === undefined ? true : response.ok;
    if (ok && (!contentType || contentType.includes('application/json'))) return true;
  } catch (error) {
    // Ignore
  }
  
  return false;
}

async function findMostRecentPuzzle(year, month, day, difficulty = 'medium') {
  const requestedDay = parseInt(day);
  
  // Check backwards from the requested day
  for (let d = requestedDay - 1; d >= 1; d--) {
    const dayStr = String(d).padStart(2, '0');
    if (await checkPuzzleExists(year, month, dayStr, difficulty)) {
      return { year, month, day: dayStr };
    }
  }
  
  return null;
}

export async function discoverAvailableDates(year, month, difficulty = 'medium') {
  const availableDays = [];
  const maxDays = 31;
  
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

export async function getMostRecentAvailableDate(difficulty = 'medium') {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = today.getDate();
  const todayStr = String(day).padStart(2, '0');
  if (await checkPuzzleExists(year, month, todayStr, difficulty)) {
    return `${year}-${month}-${todayStr}`;
  }
  
  const availableDays = await discoverAvailableDates(year, month, difficulty);
  if (availableDays.length > 0) {
    const pastDays = availableDays.filter(d => d < day);
    if (pastDays.length > 0) {
      const mostRecentDay = pastDays[pastDays.length - 1];
      return `${year}-${month}-${String(mostRecentDay).padStart(2, '0')}`;
    }
  }
  
  return null;
}

