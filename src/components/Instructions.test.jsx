import { describe, it, expect } from 'vitest';
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
  it('should render instructions with title', () => {
    render(<Instructions theme={mockTheme} />);
    expect(screen.getByText('How to play:')).toBeInTheDocument();
  });

  it('should be expanded by default', () => {
    render(<Instructions theme={mockTheme} />);
    mockTheme.instructions.items.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('should collapse when toggle is clicked', () => {
    render(<Instructions theme={mockTheme} />);
    const toggle = screen.getByRole('button');
    
    fireEvent.click(toggle);
    
    mockTheme.instructions.items.forEach(item => {
      expect(screen.queryByText(item)).not.toBeInTheDocument();
    });
  });

  it('should expand when toggle is clicked again', () => {
    render(<Instructions theme={mockTheme} />);
    const toggle = screen.getByRole('button');
    
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    
    mockTheme.instructions.items.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('should display all instruction items', () => {
    render(<Instructions theme={mockTheme} />);
    expect(screen.getByText('Click or drag from the North Pole to start')).toBeInTheDocument();
    expect(screen.getByText('Click or drag to houses to visit them')).toBeInTheDocument();
    expect(screen.getByText('Return to the North Pole to complete the route')).toBeInTheDocument();
    expect(screen.getByText('Try to minimize your total distance!')).toBeInTheDocument();
  });

  it('should have correct aria-expanded attribute', () => {
    render(<Instructions theme={mockTheme} />);
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});


