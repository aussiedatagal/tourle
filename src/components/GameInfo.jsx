import { useState, useEffect } from 'react';
import { DifficultySelector } from './DifficultySelector';
import { getBestScore } from '../utils/scoreStorage';

export function GameInfo({ 
  puzzleData, 
  currentDistance, 
  efficiency, 
  selectedDifficulty, 
  onDifficultyChange,
  gameComplete,
  attempts,
  theme,
  onShowStatistics
}) {
  const [shareCopied, setShareCopied] = useState(false);
  const [bestScore, setBestScore] = useState(null);

  useEffect(() => {
    if (puzzleData) {
      const cleanDate = puzzleData.date.replace(' (Test)', '');
      const best = getBestScore(cleanDate, selectedDifficulty);
      setBestScore(best);
    } else {
      setBestScore(null);
    }
  }, [puzzleData, selectedDifficulty]);

  const handleShare = async () => {
    if (!puzzleData || !gameComplete) return;

    const baseUrl = window.location.origin + window.location.pathname;
    // Clean date string (remove " (Test)" if present)
    const cleanDate = puzzleData.date.replace(' (Test)', '');
    const shareUrl = `${baseUrl}?date=${cleanDate}&difficulty=${selectedDifficulty}`;
    
    const difficultyLabel = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1);
    const efficiencyNum = parseFloat(efficiency.replace('%', ''));
    
    // Choose emoji based on efficiency
    let emoji = '🎯';
    if (efficiencyNum >= 95) emoji = '🌟';
    else if (efficiencyNum >= 90) emoji = '🎉';
    else if (efficiencyNum >= 80) emoji = '✨';
    else if (efficiencyNum >= 70) emoji = '👍';
    else emoji = '🎯';
    
    let shareText = `🎄 Travelling Salesman Puzzle ${cleanDate} (${difficultyLabel}) ${emoji}\n\n`;
    
    shareText += `📏 Distance: ${currentDistance.toFixed(2)}\n`;
    shareText += `⭐ Optimal: ${puzzleData.optimal_distance.toFixed(2)}\n`;
    shareText += `📊 Efficiency: ${efficiency}\n`;
    if (attempts > 0) {
      shareText += `🎯 Attempts: ${attempts}\n`;
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

  if (!puzzleData) {
    return (
      <div className="game-info">
        <div className="info-item">
          <span className="label">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="game-info">
      <div className="info-item">
        <span className="label">Date:</span>
        <span>{puzzleData.date}</span>
      </div>
      <div className="info-item difficulty-item">
        <DifficultySelector
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={onDifficultyChange}
          theme={theme}
        />
      </div>
      <div className="info-item">
        <span className="label">Distance:</span>
        <span>{currentDistance.toFixed(2)}</span>
      </div>
      <div className="info-item">
        <span className="label">Optimal:</span>
        <span>{puzzleData.optimal_distance.toFixed(2)}</span>
      </div>
      <div className="info-item">
        <span className="label">Efficiency:</span>
        <span>{efficiency}</span>
      </div>
      {bestScore && (
        <div className="info-item">
          <span className="label">Best:</span>
          <span className="best-score-display">{bestScore.efficiency}</span>
        </div>
      )}
      <div className="info-item share-item">
        {gameComplete && (
          <button
            className="btn btn-share"
            onClick={handleShare}
            title="Share your score"
          >
            {shareCopied ? '✓ Copied!' : 'Share'}
          </button>
        )}
        <button
          className="btn btn-secondary btn-stats"
          onClick={onShowStatistics}
          title="View statistics"
        >
          📊 Stats
        </button>
      </div>
    </div>
  );
}

