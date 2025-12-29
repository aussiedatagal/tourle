import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DifficultySelector } from './DifficultySelector';

const mockTheme = {
  colors: {
    background: '#0a0e27',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.3)'
  }
};

describe('DifficultySelector', () => {
  const mockOnDifficultyChange = vi.fn();

  it('should match snapshot with medium difficulty selected', () => {
    const { container } = render(
      <DifficultySelector
        selectedDifficulty="medium"
        onDifficultyChange={mockOnDifficultyChange}
        theme={mockTheme}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with easy difficulty selected', () => {
    const { container } = render(
      <DifficultySelector
        selectedDifficulty="easy"
        onDifficultyChange={mockOnDifficultyChange}
        theme={mockTheme}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with hard difficulty selected', () => {
    const { container } = render(
      <DifficultySelector
        selectedDifficulty="hard"
        onDifficultyChange={mockOnDifficultyChange}
        theme={mockTheme}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

