import React, { useState, useRef, useEffect, useCallback } from 'react';
import './TagFilterInput.css';

const TagFilterInput = ({ 
  selectedTags = [], 
  onTagsChange, 
  placeholder = "סנן לפי תגיות...", 
  userId,
  disabled = false,
  className = "",
  showClearAll = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load all available tags for the user
  useEffect(() => {
    if (userId) {
      loadUserTags();
    }
  }, [userId]);

  const loadUserTags = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`/api/memory-cards/tags/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAllTags(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading user tags:', error);
    }
  };

  // Filter suggestions based on input
  const filterSuggestions = useCallback((input) => {
    if (!input.trim()) {
      return [];
    }

    const inputLower = input.toLowerCase();
    return allTags
      .filter(tag => 
        tag.toLowerCase().includes(inputLower) && 
        !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.toLowerCase())
      )
      .slice(0, 8); // Limit to 8 suggestions
  }, [allTags, selectedTags]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    const filteredSuggestions = filterSuggestions(value);
    setSuggestions(filteredSuggestions);
    setShowSuggestions(filteredSuggestions.length > 0);
  };

  // Handle key press events
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        // Select first suggestion
        selectTag(suggestions[0]);
      } else if (inputValue.trim()) {
        // Add custom tag
        addTag(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Focus first suggestion
      if (suggestionsRef.current) {
        const firstSuggestion = suggestionsRef.current.querySelector('.suggestion-item');
        firstSuggestion?.focus();
      }
    } else if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(selectedTags.length - 1);
    }
  };

  // Add a new tag
  const addTag = (tagName) => {
    if (!tagName) return;
    
    // Check if tag already exists (case insensitive)
    const tagExists = selectedTags.some(tag => 
      tag.toLowerCase() === tagName.toLowerCase()
    );
    
    if (tagExists) {
      setInputValue('');
      setShowSuggestions(false);
      return;
    }
    
    // Add the new tag
    const newTags = [...selectedTags, tagName];
    onTagsChange(newTags);
    setInputValue('');
    setShowSuggestions(false);
  };

  // Select tag from suggestions
  const selectTag = (tagName) => {
    addTag(tagName);
    inputRef.current?.focus();
  };

  // Remove a tag by index
  const removeTag = (indexToRemove) => {
    const newTags = selectedTags.filter((_, index) => index !== indexToRemove);
    onTagsChange(newTags);
  };

  // Clear all tags
  const clearAllTags = () => {
    onTagsChange([]);
  };

  // Handle container click to focus input
  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsInputFocused(true);
    if (inputValue.trim()) {
      const filteredSuggestions = filterSuggestions(inputValue);
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    }
  };

  // Handle input blur
  const handleInputBlur = (e) => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setIsInputFocused(false);
        setShowSuggestions(false);
      }
    }, 150);
  };

  // Handle suggestion keyboard navigation
  const handleSuggestionKeyDown = (e, tagName) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectTag(tagName);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevSibling = e.target.previousElementSibling;
      if (prevSibling) {
        prevSibling.focus();
      } else {
        inputRef.current?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextSibling = e.target.nextElementSibling;
      if (nextSibling) {
        nextSibling.focus();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`tag-filter-input-container ${className} ${disabled ? 'disabled' : ''} ${isInputFocused ? 'focused' : ''}`}>
      <div 
        className="tag-filter-input-wrapper"
        onClick={handleContainerClick}
      >
        {/* Render selected tags */}
        {selectedTags.map((tag, index) => (
          <div key={index} className="selected-tag-item">
            <span className="tag-text">{tag}</span>
            {!disabled && (
              <button
                type="button"
                className="tag-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                aria-label={`הסר תגית ${tag}`}
                title={`הסר תגית ${tag}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {/* Input field */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            className="tag-filter-input-field"
            dir="rtl"
            autoComplete="off"
          />
        )}

        {/* Clear all button */}
        {showClearAll && selectedTags.length > 0 && !disabled && (
          <button
            type="button"
            className="clear-all-btn"
            onClick={(e) => {
              e.stopPropagation();
              clearAllTags();
            }}
            title="נקה את כל התגיות"
          >
            נקה הכל
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="suggestions-dropdown"
          role="listbox"
          aria-label="הצעות תגיות"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              role="option"
              tabIndex={0}
              onClick={() => selectTag(suggestion)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, suggestion)}
              aria-selected={false}
            >
              <span className="suggestion-text">{suggestion}</span>
              <span className="suggestion-action">הוסף</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Helper text */}
      <div className="tag-filter-help">
        {!disabled && (
          <span className="help-text">
            הקש Enter להוספת תגית או בחר מהרשימה
          </span>
        )}
        {selectedTags.length > 0 && (
          <span className="selected-count">
            {selectedTags.length} תגיות נבחרו
          </span>
        )}
      </div>
    </div>
  );
};

export default TagFilterInput;
