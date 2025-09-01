import React, { useState } from 'react';
import './MemoryCardPreview.css';

const MemoryCardPreview = ({ 
  card, 
  showFlipHint = true, 
  autoFlip = false, 
  onFlip = null,
  className = '',
  size = 'medium' // small, medium, large
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCardClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
    
    if (onFlip) {
      onFlip(!isFlipped);
    }
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  // Auto-flip functionality
  React.useEffect(() => {
    if (autoFlip && !isFlipped) {
      const timer = setTimeout(() => {
        handleCardClick();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoFlip, isFlipped]);

  // Determine text direction based on content
  const getTextDirection = (text) => {
    if (!text) return 'rtl';
    
    // Check if text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF]/;
    const englishRegex = /[a-zA-Z]/;
    
    const hasHebrew = hebrewRegex.test(text);
    const hasEnglish = englishRegex.test(text);
    
    // If mixed content, prefer RTL for Hebrew
    if (hasHebrew) return 'rtl';
    if (hasEnglish && !hasHebrew) return 'ltr';
    
    return 'rtl'; // Default to RTL
  };

  const frontDirection = getTextDirection(card?.frontText);
  const backDirection = getTextDirection(card?.backText);

  if (!card) {
    return (
      <div className={`memory-card-preview ${className} ${size}`}>
        <div className="card-placeholder">
          <div className="placeholder-icon">📝</div>
          <div className="placeholder-text">אין כרטיס לתצוגה</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`memory-card-preview ${className} ${size}`}>
      <div 
        className={`card-container ${isFlipped ? 'flipped' : ''} ${isAnimating ? 'animating' : ''}`}
        onClick={handleCardClick}
        onKeyPress={handleKeyPress}
        tabIndex={0}
        role="button"
        aria-label={`כרטיס זיכרון: ${isFlipped ? 'צד אחורי' : 'צד קדמי'}. לחץ להיפוך`}
        aria-pressed={isFlipped}
      >
        {/* Front Side */}
        <div 
          className={`card-face card-front ${card.difficultyLevel ? `difficulty-${card.difficultyLevel}` : 'difficulty-medium'}`}
          dir={frontDirection}
        >
          <div className="card-content">
            <div className="card-text">
              {card.frontText}
            </div>
            
            {showFlipHint && (
              <div className="flip-hint">
                <span className="flip-icon">🔄</span>
                <span className="flip-text">לחץ להיפוך</span>
              </div>
            )}
            
            <div className="card-metadata">
              <div className="card-type">
                <span className="type-icon">
                  {card.cardType === 'text' && '📝'}
                  {card.cardType === 'image' && '🖼️'}
                  {card.cardType === 'audio' && '🎵'}
                </span>
              </div>
              
              <div className="difficulty-indicator">
                <span className={`difficulty-icon ${card.difficultyLevel || 'medium'}`}></span>
                <span className="difficulty-text">
                  {card.difficultyLevel === 'easy' && 'קל'}
                  {card.difficultyLevel === 'medium' && 'בינוני'}
                  {card.difficultyLevel === 'hard' && 'קשה'}
                  {!card.difficultyLevel && 'בינוני'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div 
          className="card-face card-back"
          dir={backDirection}
        >
          <div className="card-content">
            <div className="card-text">
              {card.backText}
            </div>
            
            {showFlipHint && (
              <div className="flip-hint">
                <span className="flip-icon">🔄</span>
                <span className="flip-text">לחץ להיפוך</span>
              </div>
            )}
            
            <div className="card-metadata">
              <div className="card-tags">
                {card.tags && card.tags.length > 0 && (
                  <div className="tags-container">
                    {card.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                    {card.tags.length > 3 && (
                      <span className="tag more-tags">
                        +{card.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="answer-indicator">
                <span className="answer-icon">✓</span>
                <span className="answer-text">תשובה</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Status */}
      <div className="card-status">
        <div className="status-indicator">
          <span className={`status-dot ${isFlipped ? 'back' : 'front'}`}></span>
          <span className="status-text">
            {isFlipped ? 'צד אחורי' : 'צד קדמי'}
          </span>
        </div>
        
        {card.setName && (
          <div className="set-info">
            <span className="set-name">{card.setName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryCardPreview;
