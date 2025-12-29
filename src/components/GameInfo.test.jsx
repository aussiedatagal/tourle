import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { GameInfo } from './GameInfo';

const mockTheme = {
  name: 'default',
  colors: {
    background: '#0a0e27',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.3)'
  }
};

const mockPuzzleData = {
  date: '2025-12-15',
  optimal_distance: 100.5,
  nodes: []
};

describe('GameInfo', () => {
  const mockOnDifficultyChange = vi.fn();
  const mockOnShowStatistics = vi.fn();

  beforeEach(() => {
    // Setup localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should match snapshot when loading', () => {
    const { container } = render(
      <GameInfo
        puzzleData={null}
        currentDistance={0}
        efficiency="0%"
        selectedDifficulty="medium"
        onDifficultyChange={mockOnDifficultyChange}
        gameComplete={false}
        attempts={0}
        theme={mockTheme}
        onShowStatistics={mockOnShowStatistics}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with puzzle data', async () => {
    const { container } = render(
      <GameInfo
        puzzleData={mockPuzzleData}
        currentDistance={120.5}
        efficiency="83.2%"
        selectedDifficulty="medium"
        onDifficultyChange={mockOnDifficultyChange}
        gameComplete={false}
        attempts={0}
        theme={mockTheme}
        onShowStatistics={mockOnShowStatistics}
      />
    );
    
    // Wait for useEffect to complete (best score check)
    await waitFor(() => {
      expect(container.querySelector('.game-info')).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with game complete', async () => {
    const { container } = render(
      <GameInfo
        puzzleData={mockPuzzleData}
        currentDistance={105.2}
        efficiency="95.5%"
        selectedDifficulty="medium"
        onDifficultyChange={mockOnDifficultyChange}
        gameComplete={true}
        attempts={3}
        theme={mockTheme}
        onShowStatistics={mockOnShowStatistics}
      />
    );
    
    // Wait for useEffect to complete (best score check)
    await waitFor(() => {
      expect(container.querySelector('.game-info')).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with best score', async () => {
    // Mock localStorage to return a best score
    global.localStorage.getItem = vi.fn((key) => {
      if (key === 'tsp-scores') {
        return JSON.stringify({
          '2025-12-15_medium': [
            {
              distance: 102.0,
              efficiency: '98.5%',
              attempts: 1,
              timestamp: Date.now(),
              date: '2025-12-15',
              difficulty: 'medium'
            }
          ]
        });
      }
      return null;
    });

    const { container } = render(
      <GameInfo
        puzzleData={mockPuzzleData}
        currentDistance={105.2}
        efficiency="95.5%"
        selectedDifficulty="medium"
        onDifficultyChange={mockOnDifficultyChange}
        gameComplete={false}
        attempts={0}
        theme={mockTheme}
        onShowStatistics={mockOnShowStatistics}
      />
    );
    
    // Wait for useEffect to complete and best score to be displayed
    await waitFor(() => {
      expect(container.querySelector('.best-score-display')).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });
});

