import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Instructions } from './Instructions';

const mockTheme = {
  instructions: {
    title: 'How to play:',
    items: [
      'Click or drag from the North Pole to start',
      'Click or drag to houses to visit them',
      'Return to the North Pole to complete the route',
      'Try to minimize your total distance!'
    ]
  },
  icons: {
    instructionBullet: '❄️'
  }
};

describe('Instructions', () => {
  it('should render nothing when closed', () => {
    const { container } = render(<Instructions theme={mockTheme} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render title and items when open', () => {
    render(<Instructions theme={mockTheme} isOpen />);
    expect(screen.getByText('How to play:')).toBeInTheDocument();
    mockTheme.instructions.items.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('should call onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<Instructions theme={mockTheme} isOpen onClose={handleClose} />);
    const close = screen.getByRole('button', { name: /close instructions/i });
    fireEvent.click(close);
    expect(handleClose).toHaveBeenCalledWith(false);
  });

  it('should call onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<Instructions theme={mockTheme} isOpen onClose={handleClose} />);
    const overlay = container.querySelector('.instructions-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledWith(false);
  });

  it('should match snapshot when open', () => {
    const { container } = render(<Instructions theme={mockTheme} isOpen />);
    expect(container).toMatchSnapshot();
  });
});
