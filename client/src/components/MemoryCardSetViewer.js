import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MemoryCardPreview from './MemoryCardPreview';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import TagFilterInput from './TagFilterInput';

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const MemoryCardSetViewer = ({ setId, onClose, onEdit }) => {
  const [setData, setSetData] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'study'
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem(`memoryCardSort_${setId}`) || 'newest';
  });
  const [sortDirection, setSortDirection] = useState('DESC');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSetData();
  }, [setId]);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem(`memoryCardSort_${setId}`, sortBy);
  }, [sortBy, setId]);

  const loadSetData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Load set with cards
      const response = await fetch(`/api/memory-cards/sets/${setId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('שגיאה בטעינת הסט');
      }

      const result = await response.json();
      if (result.success) {
        setSetData(result.data);
        setCards(result.data.cards || []);
      } else {
        throw new Error(result.message || 'שגיאה בטעינת הסט');
      }
    } catch (err) {
      console.error('Error loading set data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (!term.trim()) {
        return;
      }
      
      setIsSearching(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(
          `/api/memory-cards/search/${setData.userId}?q=${encodeURIComponent(term)}&setId=${setId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          // We'll use the search results in the filtered cards computation
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [setData?.userId, setId]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      debouncedSearch(value);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
  };

  // Sort cards function
  const sortCards = useCallback((cardsToSort, sortBy, direction) => {
    return [...cardsToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'newest':
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
          break;
        case 'oldest':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'alphabetical':
          comparison = a.frontText.localeCompare(b.frontText, 'he');
          break;
        default:
          comparison = 0;
      }
      
      return direction === 'DESC' ? -comparison : comparison;
    });
  }, []);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = [...cards];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(card => 
        card.frontText.toLowerCase().includes(searchLower) ||
        card.backText.toLowerCase().includes(searchLower) ||
        (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(card => {
        if (!card.tags || card.tags.length === 0) return false;
        
        // Check if card has ALL selected tags (AND logic)
        return selectedTags.every(selectedTag => 
          card.tags.some(cardTag => 
            cardTag.toLowerCase() === selectedTag.toLowerCase()
          )
        );
      });
    }

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(card => card.difficultyLevel === difficultyFilter);
    }

    // Apply sorting
    return sortCards(filtered, sortBy, sortDirection);
  }, [cards, searchTerm, selectedTags, difficultyFilter, sortBy, sortDirection, sortCards]);

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same sort option
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortDirection(newSortBy === 'alphabetical' ? 'ASC' : 'DESC');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setDifficultyFilter('all');
    setSortBy('newest');
    setSortDirection('DESC');
    setIsSearching(false);
  };

  const handlePreviousCard = () => {
    setCurrentCardIndex(prev => prev > 0 ? prev - 1 : cards.length - 1);
  };

  const handleNextCard = () => {
    setCurrentCardIndex(prev => prev < cards.length - 1 ? prev + 1 : 0);
  };

  const handleCardSelect = (index) => {
    // Find the actual index in the original cards array
    const selectedCard = filteredAndSortedCards[index];
    const originalIndex = cards.findIndex(card => card.id === selectedCard.id);
    setCurrentCardIndex(originalIndex);
    setViewMode('study');
  };

  if (loading) {
    return (
      <div className="memory-card-set-viewer">
        <div className="viewer-header">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
          <h2>טוען סט...</h2>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="memory-card-set-viewer">
        <div className="viewer-header">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
          <h2>שגיאה</h2>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!setData) {
    return (
      <div className="memory-card-set-viewer">
        <div className="viewer-header">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
          <h2>הסט לא נמצא</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-card-set-viewer">
      <div className="viewer-header">
        <div className="header-left">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
        </div>
        
        <div className="header-center">
          <h2>{setData.name}</h2>
          {setData.description && (
            <p className="set-description">{setData.description}</p>
          )}
        </div>
        
        <div className="header-right">
          <button className="btn btn-outline" onClick={() => onEdit && onEdit(setData)}>
            ✏️ עריכה
          </button>
        </div>
      </div>

      <div className="set-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">כרטיסים:</span>
            <span className="info-value">{cards.length}</span>
          </div>
          {setData.subjectArea && (
            <div className="info-item">
              <span className="info-label">תחום:</span>
              <span className="info-value">{setData.subjectArea}</span>
            </div>
          )}
          {setData.gradeLevel && (
            <div className="info-item">
              <span className="info-label">כיתה:</span>
              <span className="info-value">{setData.gradeLevel}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">סטטוס:</span>
            <span className="info-value">{setData.isPublic ? 'ציבורי' : 'פרטי'}</span>
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty-set">
          <div className="empty-icon">🎴</div>
          <h3>אין כרטיסים בסט זה</h3>
          <p>הוסף כרטיסים כדי להתחיל ללמוד</p>
          <button className="btn btn-primary" onClick={() => onEdit && onEdit(setData)}>
            הוסף כרטיסים
          </button>
        </div>
      ) : (
        <>
          <div className="view-mode-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 רשימה
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'study' ? 'active' : ''}`}
              onClick={() => setViewMode('study')}
            >
              🎯 לימוד
            </button>
          </div>

          {viewMode === 'list' ? (
            <div className="cards-list">
              {/* Search and Filter Controls */}
              <div className="search-filter-controls">
                <div className="search-bar">
                  <div className="search-input-container">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="חפש בכרטיסים..."
                      className="search-input"
                      dir="rtl"
                    />
                    {searchTerm && (
                      <button className="clear-search-btn" onClick={clearSearch}>
                        ✕
                      </button>
                    )}
                    <div className="search-icon">🔍</div>
                  </div>
                  {isSearching && <div className="search-loading">מחפש...</div>}
                </div>

                <div className="tag-filter-section">
                  <label className="control-label">סינון לפי תגיות:</label>
                  <TagFilterInput
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    userId={setData?.userId}
                    placeholder="בחר תגיות לסינון..."
                    className="tag-filter-input"
                  />
                </div>

                <div className="filter-controls">
                  <div className="sort-controls">
                    <label className="control-label">מיון:</label>
                    <div className="sort-buttons">
                      <button
                        className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
                        onClick={() => handleSortChange('newest')}
                      >
                        החדשים ביותר {sortBy === 'newest' && (sortDirection === 'DESC' ? '↓' : '↑')}
                      </button>
                      <button
                        className={`sort-btn ${sortBy === 'oldest' ? 'active' : ''}`}
                        onClick={() => handleSortChange('oldest')}
                      >
                        הישנים ביותר {sortBy === 'oldest' && (sortDirection === 'DESC' ? '↓' : '↑')}
                      </button>
                      <button
                        className={`sort-btn ${sortBy === 'alphabetical' ? 'active' : ''}`}
                        onClick={() => handleSortChange('alphabetical')}
                      >
                        אלפביתי {sortBy === 'alphabetical' && (sortDirection === 'ASC' ? '↑' : '↓')}
                      </button>
                    </div>
                  </div>

                  <div className="difficulty-filter">
                    <label className="control-label">רמת קושי:</label>
                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="difficulty-select"
                    >
                      <option value="all">הכל</option>
                      <option value="easy">קל</option>
                      <option value="medium">בינוני</option>
                      <option value="hard">קשה</option>
                    </select>
                  </div>

                  {(searchTerm || selectedTags.length > 0 || difficultyFilter !== 'all' || sortBy !== 'newest') && (
                    <button className="reset-filters-btn" onClick={resetFilters}>
                      איפוס מסננים
                    </button>
                  )}
                </div>
              </div>

              {/* Results Info */}
              <div className="results-info">
                <span className="results-count">
                  {filteredAndSortedCards.length === cards.length 
                    ? `${cards.length} כרטיסים`
                    : `נמצאו ${filteredAndSortedCards.length} מתוך ${cards.length} כרטיסים`
                  }
                </span>
                {searchTerm && (
                  <span className="search-term">
                    חיפוש: "{searchTerm}"
                  </span>
                )}
              </div>

              {/* Cards Grid */}
              {filteredAndSortedCards.length === 0 ? (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3>לא נמצאו כרטיסים</h3>
                  <p>
                    {searchTerm 
                      ? `לא נמצאו כרטיסים המכילים "${searchTerm}"`
                      : 'לא נמצאו כרטיסים התואמים למסננים שנבחרו'
                    }
                  </p>
                  <button className="btn btn-outline" onClick={resetFilters}>
                    איפוס מסננים
                  </button>
                </div>
              ) : (
                <div className="cards-grid">
                  {filteredAndSortedCards.map((card, index) => (
                    <div key={card.id} className="card-item" onClick={() => handleCardSelect(index)}>
                      <div className="card-number">{index + 1}</div>
                      <MemoryCardPreview
                        card={card}
                        size="small"
                        showFlipHint={false}
                        className="list-card"
                        searchTerm={searchTerm} // Pass search term for highlighting
                      />
                      <div className="card-meta">
                        <span className={`difficulty-badge difficulty-${card.difficultyLevel || 'medium'}`}>
                          {card.difficultyLevel === 'easy' ? 'קל' : 
                           card.difficultyLevel === 'medium' ? 'בינוני' : 
                           card.difficultyLevel === 'hard' ? 'קשה' : 'בינוני'}
                        </span>
                        {card.tags && card.tags.length > 0 && (
                          <div className="card-tags">
                            {card.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span key={tagIndex} className="tag">{tag}</span>
                            ))}
                            {card.tags.length > 2 && (
                              <span className="tag-more">+{card.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="study-mode">
              <div className="study-header">
                <div className="card-counter">
                  כרטיס {currentCardIndex + 1} מתוך {cards.length}
                </div>
                <div className="study-progress">
                  <div 
                    className="progress-bar"
                    style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="study-card-container">
                <MemoryCardPreview
                  card={cards[currentCardIndex]}
                  size="large"
                  showFlipHint={true}
                  className="study-card"
                />
              </div>

              <div className="study-navigation">
                <button 
                  className="nav-btn" 
                  onClick={handlePreviousCard}
                  disabled={cards.length <= 1}
                >
                  ← הקודם
                </button>
                
                <div className="card-info">
                  <div className="difficulty-indicator">
                    רמת קושי: {cards[currentCardIndex].difficultyLevel === 'easy' ? 'קל' : 
                              cards[currentCardIndex].difficultyLevel === 'medium' ? 'בינוני' : 'קשה'}
                  </div>
                  {cards[currentCardIndex].tags && cards[currentCardIndex].tags.length > 0 && (
                    <div className="current-card-tags">
                      {cards[currentCardIndex].tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  className="nav-btn" 
                  onClick={handleNextCard}
                  disabled={cards.length <= 1}
                >
                  הבא →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .memory-card-set-viewer {
          max-width: 100vw;
          margin: 0;
          padding: 0.75rem;
          background: var(--color-background, #f8f9fa);
          min-height: 100vh;
          max-height: 100vh;
          overflow-y: auto;
        }

        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem;
          background: var(--color-surface, #ffffff);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border, #e9ecef);
          min-height: 60px;
        }

        .header-center {
          text-align: center;
          flex: 1;
        }

        .header-center h2 {
          margin: 0;
          color: var(--color-primary, #3498db);
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .set-description {
          margin: 0.25rem 0 0 0;
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 0.9rem;
          line-height: 1.3;
        }

        .set-info {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .info-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          align-items: center;
        }

        .info-item {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--color-surfaceHover, #f8f9fa);
          border-radius: 20px;
          border: 1px solid var(--color-border, #e9ecef);
          align-items: center;
          white-space: nowrap;
        }

        .info-label {
          font-size: 0.75rem;
          color: var(--color-textSecondary, #7f8c8d);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 1rem;
          color: var(--color-text, #2c3e50);
          font-weight: 700;
        }

        .view-mode-toggle {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1rem;
          justify-content: center;
          background: var(--color-surface, #ffffff);
          padding: 0.25rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border, #e9ecef);
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        .toggle-btn {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--color-textSecondary, #7f8c8d);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .toggle-btn:hover:not(.active) {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
        }

        .toggle-btn.active {
          background: var(--color-primary, #3498db);
          color: white;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
        }

        .search-filter-controls {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .search-bar {
          margin-bottom: 1rem;
        }

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
          max-width: 400px;
          margin: 0 auto;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 1rem;
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: 25px;
          font-size: 1rem;
          background: var(--color-inputBackground, #ffffff);
          color: var(--color-text, #2c3e50);
          transition: all 0.3s ease;
          text-align: right;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary, #3498db);
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .search-input::placeholder {
          color: var(--color-textSecondary, #7f8c8d);
          text-align: right;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-textSecondary, #7f8c8d);
          pointer-events: none;
        }

        .clear-search-btn {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: var(--color-textSecondary, #7f8c8d);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        }

        .clear-search-btn:hover {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
        }

        .search-loading {
          text-align: center;
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .tag-filter-section {
          margin-bottom: 1rem;
          text-align: center;
        }

        .tag-filter-section .control-label {
          display: block;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .tag-filter-input {
          max-width: 600px;
          margin: 0 auto;
        }

        .filter-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
          justify-content: center;
        }

        .control-label {
          font-weight: 600;
          color: var(--color-text, #2c3e50);
          font-size: 0.9rem;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .sort-buttons {
          display: flex;
          gap: 0.25rem;
          background: var(--color-surfaceHover, #f8f9fa);
          padding: 0.25rem;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .sort-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          background: transparent;
          color: var(--color-textSecondary, #7f8c8d);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .sort-btn:hover:not(.active) {
          background: var(--color-surface, #ffffff);
          color: var(--color-text, #2c3e50);
        }

        .sort-btn.active {
          background: var(--color-primary, #3498db);
          color: white;
          box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
        }

        .difficulty-filter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .difficulty-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: 6px;
          background: var(--color-surface, #ffffff);
          color: var(--color-text, #2c3e50);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .difficulty-select:focus {
          outline: none;
          border-color: var(--color-primary, #3498db);
        }

        .reset-filters-btn {
          padding: 0.5rem 1rem;
          background: var(--color-warning, #f39c12);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .reset-filters-btn:hover {
          background: var(--color-warningHover, #e67e22);
          transform: translateY(-1px);
        }

        .results-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: var(--color-surfaceHover, #f8f9fa);
          border-radius: 8px;
          border: 1px solid var(--color-border, #e9ecef);
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .results-count {
          font-weight: 600;
          color: var(--color-text, #2c3e50);
        }

        .search-term {
          color: var(--color-primary, #3498db);
          font-weight: 500;
          font-style: italic;
        }

        .no-results {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-textSecondary, #7f8c8d);
          background: var(--color-surface, #ffffff);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border, #e9ecef);
        }

        .no-results-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .no-results h3 {
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .no-results p {
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          padding: 0;
          max-height: calc(100vh - 420px);
          overflow-y: auto;
        }

        .card-item {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 12px;
          overflow: hidden;
        }

        .card-item:hover {
          transform: translateY(-2px);
        }

        .card-number {
          position: absolute;
          top: -8px;
          right: -8px;
          background: linear-gradient(135deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          z-index: 10;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
          border: 2px solid var(--color-surface, #ffffff);
        }

        .card-meta {
          margin-top: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--color-surfaceHover, #f8f9fa);
          border-radius: 8px;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .difficulty-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .difficulty-easy {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          border: 1px solid rgba(39, 174, 96, 0.2);
        }

        .difficulty-medium {
          background: rgba(243, 156, 18, 0.1);
          color: #f39c12;
          border: 1px solid rgba(243, 156, 18, 0.2);
        }

        .difficulty-hard {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.2);
        }

        .card-tags {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .tag {
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(52, 152, 219, 0.05) 100%);
          color: var(--color-primary, #3498db);
          padding: 0.2rem 0.4rem;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 600;
          border: 1px solid rgba(52, 152, 219, 0.2);
          transition: all 0.2s ease;
        }

        .tag:hover {
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.15) 0%, rgba(52, 152, 219, 0.1) 100%);
        }

        .tag-more {
          background: linear-gradient(135deg, rgba(108, 117, 125, 0.1) 0%, rgba(108, 117, 125, 0.05) 100%);
          color: var(--color-textSecondary, #6c757d);
          border-color: rgba(108, 117, 125, 0.2);
        }

        .study-mode {
          max-width: 100%;
          margin: 0;
          height: calc(100vh - 200px);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow: hidden;
        }

        .study-header {
          text-align: center;
          background: var(--color-surface, #ffffff);
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border, #e9ecef);
          flex-shrink: 0;
        }

        .card-counter {
          font-size: 1.1rem;
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.75rem;
          font-weight: 700;
        }

        .study-progress {
          width: 100%;
          height: 8px;
          background: var(--color-border, #e9ecef);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          transition: width 0.3s ease;
          border-radius: 4px;
          position: relative;
        }

        .progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .study-card-container {
          display: flex;
          justify-content: center;
          flex: 1;
          align-items: center;
          min-height: 0;
          padding: 0 1rem;
        }

        .study-card-container :global(.memory-card-preview) {
          width: 100% !important;
          max-width: min(90vw, 600px) !important;
          height: auto !important;
        }

        .study-card-container :global(.memory-card-preview .card-container) {
          height: min(60vh, 400px) !important;
          max-height: 400px !important;
          aspect-ratio: 3/2 !important;
        }

        .study-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          background: var(--color-surface, #ffffff);
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border, #e9ecef);
          flex-shrink: 0;
        }

        .nav-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .nav-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(52, 152, 219, 0.4);
        }

        .nav-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .nav-btn:disabled {
          background: var(--color-border, #e9ecef);
          color: var(--color-textSecondary, #7f8c8d);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .card-info {
          text-align: center;
          flex: 1;
          padding: 0 0.5rem;
        }

        .difficulty-indicator {
          font-size: 0.85rem;
          color: var(--color-textSecondary, #7f8c8d);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .current-card-tags {
          display: flex;
          justify-content: center;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .empty-set {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-textSecondary, #7f8c8d);
          background: var(--color-surface, #ffffff);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border, #e9ecef);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-set h3 {
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .empty-set p {
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .memory-card-set-viewer {
            padding: 0.5rem;
          }

          .viewer-header {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
            padding: 0.75rem;
            min-height: auto;
          }

          .header-left,
          .header-right {
            align-self: stretch;
          }

          .header-center h2 {
            font-size: 1.3rem;
          }

          .info-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }

          .info-item {
            padding: 0.4rem;
          }

          .search-filter-controls {
            padding: 1rem;
          }

          .search-input-container {
            max-width: 100%;
          }

          .filter-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .sort-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .sort-buttons {
            flex-direction: column;
          }

          .sort-btn {
            text-align: center;
          }

          .results-info {
            flex-direction: column;
            text-align: center;
          }

          .cards-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            max-height: calc(100vh - 380px);
          }

          .study-mode {
            height: calc(100vh - 120px);
          }

          .study-navigation {
            flex-direction: column;
            gap: 0.75rem;
          }

          .nav-btn {
            width: 100%;
            justify-content: center;
          }

          .card-info {
            padding: 0;
          }
        }

        @media (max-width: 480px) {
          .memory-card-set-viewer {
            padding: 0.25rem;
          }

          .view-mode-toggle {
            width: 100%;
            margin-bottom: 0.75rem;
          }

          .toggle-btn {
            flex: 1;
            justify-content: center;
            padding: 0.4rem 0.75rem;
            font-size: 0.8rem;
          }

          .study-header,
          .set-info,
          .study-navigation {
            padding: 0.75rem;
          }

          .empty-set {
            padding: 2rem 0.75rem;
          }

          .search-filter-controls {
            padding: 0.75rem;
          }

          .cards-grid {
            max-height: calc(100vh - 360px);
          }

          .study-mode {
            height: calc(100vh - 100px);
          }
        }
      `}</style>
    </div>
  );
};

export default MemoryCardSetViewer;
