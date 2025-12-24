import { useState, useEffect, useCallback, useRef } from 'react';
import { themes, getAvailableThemes } from '../themes';

export function ThemeSwitcher({ currentTheme, onThemeChange }) {
  const [isVisible, setIsVisible] = useState(false);
  const [konamiCode, setKonamiCode] = useState([]);
  const clickTimeoutRef = useRef(null);
  
  const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  
  // Handle title click easter egg (5 clicks)
  const handleTitleClick = useCallback((e) => {
    if (e.target.classList.contains('theme-switcher-title')) {
      let clickCount = parseInt(e.target.dataset.clickCount || '0', 10);
      clickCount += 1;
      e.target.dataset.clickCount = clickCount.toString();
      
      if (clickCount >= 5) {
        setIsVisible(true);
        e.target.dataset.clickCount = '0';
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
      } else {
        // Reset count after 2 seconds
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
          const title = document.querySelector('.theme-switcher-title');
          if (title) {
            title.dataset.clickCount = '0';
          }
        }, 2000);
      }
    }
  }, []);
  
  // Attach click handler to title
  useEffect(() => {
    const title = document.querySelector('.theme-switcher-title');
    if (title) {
      title.addEventListener('click', handleTitleClick);
      return () => {
        title.removeEventListener('click', handleTitleClick);
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
      };
    }
  }, [handleTitleClick]);
  
  // Handle Konami code
  useEffect(() => {
    const handleKeyDown = (e) => {
      setKonamiCode(prev => {
        const newSequence = [...prev, e.code].slice(-konamiSequence.length);
        
        if (newSequence.length === konamiSequence.length &&
            newSequence.every((key, i) => key === konamiSequence[i])) {
          setIsVisible(true);
          return [];
        }
        
        return newSequence;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiSequence.length]);
  
  if (!isVisible) {
    return null;
  }
  
  const availableThemes = getAvailableThemes();
  
  return (
    <div 
      className="theme-switcher"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '20px',
        borderRadius: '10px',
        zIndex: 10000,
        border: '2px solid #4a90e2',
        minWidth: '300px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>🎨 Theme Switcher</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 10px'
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {availableThemes.map(themeName => {
          const theme = themes[themeName];
          const isActive = currentTheme.name === themeName;
          return (
            <button
              key={themeName}
              onClick={() => {
                onThemeChange(theme);
                setIsVisible(false);
              }}
              style={{
                padding: '12px',
                background: isActive ? '#4a90e2' : '#2e5c8a',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.background = '#3a7bc8';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.background = '#2e5c8a';
              }}
            >
              {isActive ? '✓ ' : ''}{theme.title}
            </button>
          );
        })}
      </div>
      <p style={{ 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#888', 
        textAlign: 'center' 
      }}>
        Click title 5 times or use Konami code to open
      </p>
    </div>
  );
}

