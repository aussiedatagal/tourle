import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { themes } from '../themes';

describe('ThemeSwitcher', () => {
  const mockOnThemeChange = vi.fn();
  const mockCurrentTheme = themes.christmas;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be hidden by default', () => {
    const { container } = render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should open when Konami code is entered', () => {
    render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA'
    ];

    konamiSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    expect(screen.getByText('🎨 Theme Switcher')).toBeInTheDocument();
  });

  it('should not open with partial Konami code sequence', () => {
    const { container } = render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const partialSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown'];

    partialSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    expect(container.firstChild).toBeNull();
  });

  it('should not open with incorrect key sequence', () => {
    const { container } = render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const wrongSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyA',
      'KeyB'
    ];

    wrongSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    expect(container.firstChild).toBeNull();
  });

  it('should track Konami code sequence correctly across multiple attempts', () => {
    render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA'
    ];

    fireEvent.keyDown(window, { code: 'KeyZ' });
    fireEvent.keyDown(window, { code: 'KeyZ' });

    konamiSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    expect(screen.getByText('🎨 Theme Switcher')).toBeInTheDocument();
  });

  it('should open when title is clicked 5 times', () => {
    document.body.innerHTML = '<h1 class="theme-switcher-title">Test Title</h1>';
    
    render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const title = document.querySelector('.theme-switcher-title');

    for (let i = 0; i < 5; i++) {
      fireEvent.click(title);
    }

    expect(screen.getByText('🎨 Theme Switcher')).toBeInTheDocument();
  });

  it('should not open when title is clicked less than 5 times', () => {
    document.body.innerHTML = '<h1 class="theme-switcher-title">Test Title</h1>';
    
    const { container } = render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const title = document.querySelector('.theme-switcher-title');

    for (let i = 0; i < 4; i++) {
      fireEvent.click(title);
    }

    expect(container.firstChild).toBeNull();
  });

  it('should display all available themes when open', () => {
    render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA'
    ];

    konamiSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    expect(screen.getByText(/Santa's Sleigh Route/i)).toBeInTheDocument();
    expect(screen.getByText(/Postal Route Puzzle/i)).toBeInTheDocument();
  });

  it('should call onThemeChange when a theme is selected', () => {
    render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA'
    ];

    konamiSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    const defaultThemeButton = screen.getByText(/Postal Route Puzzle/i);
    fireEvent.click(defaultThemeButton);

    expect(mockOnThemeChange).toHaveBeenCalledWith(themes.default);
  });

  it('should close when close button is clicked', () => {
    const { container } = render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA'
    ];

    konamiSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    expect(screen.getByText('🎨 Theme Switcher')).toBeInTheDocument();

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(container.firstChild).toBeNull();
  });

  it('should match snapshot when visible', async () => {
    // Use a workaround to make it visible for snapshot
    const { container } = render(
      <ThemeSwitcher
        currentTheme={mockCurrentTheme}
        onThemeChange={mockOnThemeChange}
      />
    );

    // Trigger visibility by simulating Konami code
    const konamiSequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA'
    ];

    konamiSequence.forEach(key => {
      fireEvent.keyDown(window, { code: key });
    });

    // Wait for the component to update and become visible
    await screen.findByText('🎨 Theme Switcher');
    
    expect(container).toMatchSnapshot();
  });
});

