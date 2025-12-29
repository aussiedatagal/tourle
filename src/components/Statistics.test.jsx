import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Statistics } from './Statistics';

// Mock scoreStorage
const mockGetStatistics = vi.fn();
const mockGetRecentScores = vi.fn();
const mockGetBestScore = vi.fn();
const mockGetCompletionStatus = vi.fn();

vi.mock('../utils/scoreStorage', () => ({
  getStatistics: () => mockGetStatistics(),
  getRecentScores: () => mockGetRecentScores(),
  getBestScore: () => mockGetBestScore(),
  getCompletionStatus: () => mockGetCompletionStatus()
}));

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

describe('Statistics', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when closed', () => {
    const { container } = render(
      <Statistics
        puzzleData={mockPuzzleData}
        selectedDifficulty="medium"
        theme={mockTheme}
        isOpen={false}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should match snapshot with statistics data', async () => {
    mockGetStatistics.mockReturnValue({
      totalPuzzlesCompleted: 10,
      currentStreak: 5,
      bestStreak: 7,
      totalAttempts: 25,
      averageEfficiency: 85.5,
      bestEfficiency: 98.2,
      puzzlesByDifficulty: {
        easy: 3,
        medium: 5,
        hard: 2
      }
    });

    mockGetRecentScores.mockReturnValue([
      { date: '2025-12-15', difficulty: 'medium', efficiency: '95.5%', distance: 105.2 },
      { date: '2025-12-14', difficulty: 'easy', efficiency: '98.0%', distance: 102.8 }
    ]);

    mockGetBestScore.mockReturnValue({
      distance: 102.0,
      efficiency: '98.5%',
      attempts: 1,
      timestamp: Date.now()
    });

    const { container } = render(
      <Statistics
        puzzleData={mockPuzzleData}
        selectedDifficulty="medium"
        theme={mockTheme}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByText('Overall Stats')).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with no statistics', async () => {
    mockGetStatistics.mockReturnValue({
      totalPuzzlesCompleted: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalAttempts: 0,
      averageEfficiency: 0,
      bestEfficiency: 0,
      puzzlesByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0
      }
    });

    mockGetRecentScores.mockReturnValue([]);
    mockGetBestScore.mockReturnValue(null);

    const { container } = render(
      <Statistics
        puzzleData={mockPuzzleData}
        selectedDifficulty="medium"
        theme={mockTheme}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    // Wait for component to render (even if showing "no statistics" message)
    await waitFor(() => {
      expect(screen.getByText(/Your Statistics/i)).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with many recent scores', async () => {
    mockGetStatistics.mockReturnValue({
      totalPuzzlesCompleted: 20,
      currentStreak: 10,
      bestStreak: 15,
      totalAttempts: 50,
      averageEfficiency: 88.5,
      bestEfficiency: 99.5,
      puzzlesByDifficulty: {
        easy: 5,
        medium: 10,
        hard: 5
      }
    });

    mockGetRecentScores.mockReturnValue(
      Array.from({ length: 12 }, (_, i) => ({
        date: `2025-12-${15 - i}`,
        difficulty: ['easy', 'medium', 'hard'][i % 3],
        efficiency: `${90 + i}%`,
        distance: 100 + i
      }))
    );

    mockGetBestScore.mockReturnValue({
      distance: 100.0,
      efficiency: '100%',
      attempts: 1,
      timestamp: Date.now()
    });

    const { container } = render(
      <Statistics
        puzzleData={mockPuzzleData}
        selectedDifficulty="hard"
        theme={mockTheme}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByText('Overall Stats')).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });
});

