import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WinMessage } from './WinMessage';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

// Mock scoreStorage
vi.mock('../utils/scoreStorage', () => ({
  getStatistics: vi.fn(() => ({
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
  }))
}));

const mockTheme = {
  name: 'default',
  winMessage: {
    title: '🎉 Route Complete! 🎉',
    description: 'You visited all houses and returned to the Post Office!',
    efficiencyLabel: 'Your efficiency:'
  }
};

const mockPuzzleData = {
  date: '2025-12-15',
  optimal_distance: 100.5,
  nodes: []
};

describe('WinMessage', () => {
  const mockOnClose = vi.fn();
  const mockOnTryAgain = vi.fn();
  const mockOnDifficultyChange = vi.fn();

  it('should render nothing when not visible', () => {
    const { container } = render(
      <WinMessage
        efficiency="95.5%"
        isVisible={false}
        theme={mockTheme}
        puzzleData={mockPuzzleData}
        currentDistance={105.2}
        attempts={3}
        selectedDifficulty="medium"
        onClose={mockOnClose}
        onTryAgain={mockOnTryAgain}
        onDifficultyChange={mockOnDifficultyChange}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should match snapshot when visible with medium difficulty', () => {
    const { container } = render(
      <WinMessage
        efficiency="95.5%"
        isVisible={true}
        theme={mockTheme}
        puzzleData={mockPuzzleData}
        currentDistance={105.2}
        attempts={3}
        selectedDifficulty="medium"
        onClose={mockOnClose}
        onTryAgain={mockOnTryAgain}
        onDifficultyChange={mockOnDifficultyChange}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with easy difficulty (shows next difficulty prompt)', () => {
    const { container } = render(
      <WinMessage
        efficiency="90.0%"
        isVisible={true}
        theme={mockTheme}
        puzzleData={mockPuzzleData}
        currentDistance={111.5}
        attempts={1}
        selectedDifficulty="easy"
        onClose={mockOnClose}
        onTryAgain={mockOnTryAgain}
        onDifficultyChange={mockOnDifficultyChange}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with hard difficulty (no next difficulty prompt)', () => {
    const { container } = render(
      <WinMessage
        efficiency="98.2%"
        isVisible={true}
        theme={mockTheme}
        puzzleData={mockPuzzleData}
        currentDistance={102.5}
        attempts={5}
        selectedDifficulty="hard"
        onClose={mockOnClose}
        onTryAgain={mockOnTryAgain}
        onDifficultyChange={mockOnDifficultyChange}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with no attempts', () => {
    const { container } = render(
      <WinMessage
        efficiency="100%"
        isVisible={true}
        theme={mockTheme}
        puzzleData={mockPuzzleData}
        currentDistance={100.5}
        attempts={0}
        selectedDifficulty="medium"
        onClose={mockOnClose}
        onTryAgain={mockOnTryAgain}
        onDifficultyChange={mockOnDifficultyChange}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

