import { useMemo, useState, useEffect } from 'react';
import { discoverAvailableDates } from '../utils/puzzleLoader';

export function DateSelector({ selectedDate, onDateChange, theme, difficulty = 'medium' }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [availableDays, setAvailableDays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Discover available puzzle dates
  useEffect(() => {
    setIsLoading(true);
    // Use the selected date's year/month, or default to today
    let year, month;
    if (selectedDate) {
      [year, month] = selectedDate.split('-');
    } else {
      const today = new Date();
      year = String(today.getFullYear());
      month = String(today.getMonth() + 1).padStart(2, '0');
    }
    
    discoverAvailableDates(year, month, difficulty)
      .then(days => {
        setAvailableDays(days);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error discovering available dates:', error);
        // Fallback to days 1-31 if discovery fails
        setAvailableDays(Array.from({ length: 31 }, (_, i) => i + 1));
        setIsLoading(false);
      });
  }, [difficulty, selectedDate]);

  const availableDates = useMemo(() => {
    const dates = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Use the selected date's year/month, or default to today
    let year, month;
    if (selectedDate) {
      [year, month] = selectedDate.split('-');
    } else {
      const today = new Date();
      year = String(today.getFullYear());
      month = String(today.getMonth() + 1).padStart(2, '0');
    }
    const monthName = monthNames[parseInt(month) - 1];
    
    availableDays.forEach(day => {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      dates.push({
        value: dateStr,
        label: `${monthName} ${day}`
      });
    });
    
    return dates;
  }, [availableDays, selectedDate]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      onDateChange(newDate);
    }
  };

  const goToPrevious = () => {
    if (!selectedDate || availableDays.length === 0) return;
    const [year, month, day] = selectedDate.split('-');
    const currentDay = parseInt(day);
    const currentIndex = availableDays.indexOf(currentDay);
    if (currentIndex > 0) {
      const prevDay = availableDays[currentIndex - 1];
      const prevDate = `${year}-${month}-${String(prevDay).padStart(2, '0')}`;
      onDateChange(prevDate);
    }
  };

  const goToNext = () => {
    if (!selectedDate || availableDays.length === 0) return;
    const [year, month, day] = selectedDate.split('-');
    const currentDay = parseInt(day);
    const currentIndex = availableDays.indexOf(currentDay);
    if (currentIndex >= 0 && currentIndex < availableDays.length - 1) {
      const nextDay = availableDays[currentIndex + 1];
      const nextDate = `${year}-${month}-${String(nextDay).padStart(2, '0')}`;
      onDateChange(nextDate);
    }
  };

  const currentDay = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;
  const currentIndex = currentDay ? availableDays.indexOf(currentDay) : -1;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < availableDays.length - 1;

  return (
    <div className="date-selector">
      <div className="date-selector-controls">
        <button
          className="btn btn-secondary date-nav-btn"
          onClick={goToPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous puzzle"
        >
          {isMobile ? '←' : '← Previous'}
        </button>
        <select
          className="date-select"
          value={selectedDate || ''}
          onChange={handleDateChange}
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Loading dates...' : 'Select a date...'}</option>
          {availableDates.map(date => (
            <option key={date.value} value={date.value}>
              {date.label}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary date-nav-btn"
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Next puzzle"
        >
          {isMobile ? '→' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

