import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateSelector } from './DateSelector';

const mockTheme = {
  colors: {
    background: '#0a0e27',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.3)'
  }
};

describe('DateSelector', () => {
  const mockOnDateChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render date selector with dropdown and navigation buttons', () => {
    render(
      <DateSelector
        selectedDate="2025-12-15"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous puzzle')).toBeInTheDocument();
    expect(screen.getByLabelText('Next puzzle')).toBeInTheDocument();
  });

  it('should display all dates from December 1-24 in dropdown', () => {
    render(
      <DateSelector
        selectedDate="2025-12-15"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options);

    // Should have 25 options (1 placeholder + 24 dates)
    expect(options.length).toBe(25);
    
    // Check that dates are present
    expect(select).toHaveValue('2025-12-15');
    expect(options.some(opt => opt.value === '2025-12-01')).toBe(true);
    expect(options.some(opt => opt.value === '2025-12-24')).toBe(true);
  });

  it('should call onDateChange when date is selected from dropdown', () => {
    render(
      <DateSelector
        selectedDate="2025-12-15"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2025-12-20' } });

    expect(mockOnDateChange).toHaveBeenCalledWith('2025-12-20');
  });

  it('should navigate to previous date when Previous button is clicked', () => {
    render(
      <DateSelector
        selectedDate="2025-12-15"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const prevButton = screen.getByLabelText('Previous puzzle');
    fireEvent.click(prevButton);

    expect(mockOnDateChange).toHaveBeenCalledWith('2025-12-14');
  });

  it('should navigate to next date when Next button is clicked', () => {
    render(
      <DateSelector
        selectedDate="2025-12-15"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const nextButton = screen.getByLabelText('Next puzzle');
    fireEvent.click(nextButton);

    expect(mockOnDateChange).toHaveBeenCalledWith('2025-12-16');
  });

  it('should disable Previous button when on first date (Dec 1)', () => {
    render(
      <DateSelector
        selectedDate="2025-12-01"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const prevButton = screen.getByLabelText('Previous puzzle');
    expect(prevButton).toBeDisabled();
  });

  it('should disable Next button when on last date (Dec 24)', () => {
    render(
      <DateSelector
        selectedDate="2025-12-24"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const nextButton = screen.getByLabelText('Next puzzle');
    expect(nextButton).toBeDisabled();
  });

  it('should not call onDateChange when Previous is clicked on first date', () => {
    render(
      <DateSelector
        selectedDate="2025-12-01"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const prevButton = screen.getByLabelText('Previous puzzle');
    fireEvent.click(prevButton);

    expect(mockOnDateChange).not.toHaveBeenCalled();
  });

  it('should not call onDateChange when Next is clicked on last date', () => {
    render(
      <DateSelector
        selectedDate="2025-12-24"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const nextButton = screen.getByLabelText('Next puzzle');
    fireEvent.click(nextButton);

    expect(mockOnDateChange).not.toHaveBeenCalled();
  });

  it('should handle navigation from Dec 1 to Dec 24', () => {
    let currentDate = '2025-12-01';
    const handleDateChange = (newDate) => {
      mockOnDateChange(newDate);
      currentDate = newDate;
    };

    const { rerender } = render(
      <DateSelector
        selectedDate={currentDate}
        onDateChange={handleDateChange}
        theme={mockTheme}
      />
    );

    // Click Next 23 times to get to Dec 24, updating the date after each click
    for (let i = 0; i < 23; i++) {
      const nextButton = screen.getByLabelText('Next puzzle');
      fireEvent.click(nextButton);
      
      // Simulate parent component updating the selectedDate
      const expectedDate = `2025-12-${String(i + 2).padStart(2, '0')}`;
      rerender(
        <DateSelector
          selectedDate={expectedDate}
          onDateChange={handleDateChange}
          theme={mockTheme}
        />
      );
    }

    // Should have been called 23 times
    expect(mockOnDateChange).toHaveBeenCalledTimes(23);
    expect(mockOnDateChange).toHaveBeenLastCalledWith('2025-12-24');

    // Next button should now be disabled
    const nextButton = screen.getByLabelText('Next puzzle');
    expect(nextButton).toBeDisabled();
  });

  it('should render select element with date-select class', () => {
    render(
      <DateSelector
        selectedDate="2025-12-15"
        onDateChange={mockOnDateChange}
        theme={mockTheme}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('date-select');
  });
});

