import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { getStatistics } from '../utils/scoreStorage';

export function WinMessage({ 
  efficiency, 
  isVisible, 
  theme, 
  puzzleData, 
  currentDistance, 
  attempts, 
  selectedDifficulty,
  onClose,
  onTryAgain
}) {
  const hasTriggeredConfetti = useRef(false);
  const [shareCopied, setShareCopied] = useState(false);

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

  const handleShare = async () => {
    if (!puzzleData) return;

    const baseUrl = window.location.origin + window.location.pathname;
    // Clean date string (remove " (Test)" if present)
    const cleanDate = puzzleData.date.replace(' (Test)', '');
    const shareUrl = `${baseUrl}?date=${cleanDate}&difficulty=${selectedDifficulty}`;
    
    const difficultyLabel = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1);
    const efficiencyNum = parseFloat(efficiency.replace('%', ''));
    
    // Get overview statistics
    const stats = getStatistics();
    
    // Choose emoji based on efficiency
    let emoji = '🎯';
    if (efficiencyNum >= 95) emoji = '🌟';
    else if (efficiencyNum >= 90) emoji = '🎉';
    else if (efficiencyNum >= 80) emoji = '✨';
    else if (efficiencyNum >= 70) emoji = '👍';
    else emoji = '🎯';
    
    let shareText = `🎄 Travelling Salesman Puzzle ${cleanDate} (${difficultyLabel}) ${emoji}\n\n`;
    
    // Current puzzle stats
    shareText += `📏 Distance: ${currentDistance.toFixed(2)}\n`;
    shareText += `⭐ Optimal: ${puzzleData.optimal_distance.toFixed(2)}\n`;
    shareText += `📊 Efficiency: ${efficiency}\n`;
    if (attempts > 0) {
      shareText += `🎯 Attempts: ${attempts}\n`;
    }
    
    // Overview stats
    if (stats && stats.totalPuzzlesCompleted > 0) {
      shareText += `\n📈 Overall Stats:\n`;
      shareText += `   • Puzzles Completed: ${stats.totalPuzzlesCompleted}\n`;
      if (stats.currentStreak > 0) {
        shareText += `   • Current Streak: 🔥 ${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}\n`;
      }
      if (stats.bestStreak > 0) {
        shareText += `   • Best Streak: ⭐ ${stats.bestStreak} day${stats.bestStreak !== 1 ? 's' : ''}\n`;
      }
      shareText += `   • Total Attempts: ${stats.totalAttempts}\n`;
      shareText += `   • Average Efficiency: ${stats.averageEfficiency.toFixed(2)}%\n`;
      shareText += `   • Best Efficiency: ${stats.bestEfficiency.toFixed(2)}%\n`;
      if (stats.puzzlesByDifficulty) {
        shareText += `   • By Difficulty: Easy ${stats.puzzlesByDifficulty.easy}, Medium ${stats.puzzlesByDifficulty.medium}, Hard ${stats.puzzlesByDifficulty.hard}\n`;
      }
    }
    
    shareText += `\n🔗 ${shareUrl}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="win-message-overlay" onClick={handleClose}>
      <div className="win-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="win-message-header">
          <h2>{theme.winMessage.title}</h2>
          <button
            className="win-message-close"
            onClick={handleClose}
            aria-label="Close win message"
          >
            ×
          </button>
        </div>
        <div className="win-message-content">
          <p>{theme.winMessage.description}</p>
          <p className="efficiency-result">{theme.winMessage.efficiencyLabel} <span>{efficiency}</span></p>
          {puzzleData && (
            <div className="win-message-stats">
              <div className="win-stat-item">
                <span className="win-stat-label">Distance:</span>
                <span>{currentDistance.toFixed(2)}</span>
              </div>
              <div className="win-stat-item">
                <span className="win-stat-label">Optimal:</span>
                <span>{puzzleData.optimal_distance.toFixed(2)}</span>
              </div>
              {attempts > 0 && (
                <div className="win-stat-item">
                  <span className="win-stat-label">Attempts:</span>
                  <span>{attempts}</span>
                </div>
              )}
            </div>
          )}
          <div className="win-message-actions">
            <button
              className="btn btn-secondary"
              onClick={onTryAgain}
              title="Try again"
            >
              Try Again
            </button>
            <button
              className="btn btn-share"
              onClick={handleShare}
              title="Share your score"
            >
              {shareCopied ? '✓ Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

