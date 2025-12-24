import { useMemo, useState, useEffect } from 'react';

export function DateSelector({ selectedDate, onDateChange, theme }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const availableDates = useMemo(() => {
    const dates = [];
    for (let day = 1; day <= 24; day++) {
      const dateStr = `2025-12-${String(day).padStart(2, '0')}`;
      dates.push({
        value: dateStr,
        label: `December ${day}`
      });
    }
    return dates;
  }, []);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      onDateChange(newDate);
    }
  };

  const goToPrevious = () => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-');
    const currentDay = parseInt(day);
    if (currentDay > 1) {
      const prevDay = currentDay - 1;
      const prevDate = `${year}-${month}-${String(prevDay).padStart(2, '0')}`;
      onDateChange(prevDate);
    }
  };

  const goToNext = () => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-');
    const currentDay = parseInt(day);
    if (currentDay < 24) {
      const nextDay = currentDay + 1;
      const nextDate = `${year}-${month}-${String(nextDay).padStart(2, '0')}`;
      onDateChange(nextDate);
    }
  };

  const currentDay = selectedDate ? parseInt(selectedDate.split('-')[2]) : null;
  const canGoPrevious = currentDay && currentDay > 1;
  const canGoNext = currentDay && currentDay < 24;

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
        >
          <option value="">Select a date...</option>
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

