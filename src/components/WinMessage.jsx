import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export function WinMessage({ efficiency, isVisible, theme }) {
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    if (isVisible && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    } else if (!isVisible) {
      hasTriggeredConfetti.current = false;
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="win-message">
      <h2>{theme.winMessage.title}</h2>
      <p>{theme.winMessage.description}</p>
      <p className="efficiency-result">{theme.winMessage.efficiencyLabel} <span>{efficiency}</span></p>
    </div>
  );
}

