import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Controls } from './Controls';

const mockTheme = {
  colors: {
    background: '#0a0e27',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.3)'
  }
};

describe('Controls', () => {
  const mockOnUndo = vi.fn();
  const mockOnReset = vi.fn();
  const mockOnToggleSolution = vi.fn();
  const mockOnShowInstructions = vi.fn();

  it('should match snapshot with empty route', () => {
    const { container } = render(
      <Controls
        route={[]}
        onUndo={mockOnUndo}
        onReset={mockOnReset}
        onToggleSolution={mockOnToggleSolution}
        showingSolution={false}
        theme={mockTheme}
        difficulty="medium"
        onShowInstructions={mockOnShowInstructions}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with route in progress', () => {
    const { container } = render(
      <Controls
        route={[0, 1, 2]}
        onUndo={mockOnUndo}
        onReset={mockOnReset}
        onToggleSolution={mockOnToggleSolution}
        showingSolution={false}
        theme={mockTheme}
        difficulty="medium"
        onShowInstructions={mockOnShowInstructions}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with solution showing', () => {
    const { container } = render(
      <Controls
        route={[0, 1, 2]}
        onUndo={mockOnUndo}
        onReset={mockOnReset}
        onToggleSolution={mockOnToggleSolution}
        showingSolution={true}
        theme={mockTheme}
        difficulty="medium"
        onShowInstructions={mockOnShowInstructions}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with hard difficulty (no give up button)', () => {
    const { container } = render(
      <Controls
        route={[0, 1, 2]}
        onUndo={mockOnUndo}
        onReset={mockOnReset}
        onToggleSolution={mockOnToggleSolution}
        showingSolution={false}
        theme={mockTheme}
        difficulty="hard"
        onShowInstructions={mockOnShowInstructions}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

