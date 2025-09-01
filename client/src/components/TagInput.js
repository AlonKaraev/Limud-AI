import React, { useState, useRef, useEffect } from 'react';
import './TagInput.css';

const TagInput = ({ 
  tags = [], 
  onChange, 
  placeholder = "הוסף תגית...", 
  maxTags = 10,
  disabled = false,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef(null);

  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Handle key press events
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags.length - 1);
    }
  };

  // Add a new tag
  const addTag = () => {
    const trimmedValue = inputValue.trim();
    
    if (!trimmedValue) return;
    
    // Check if tag already exists (case insensitive)
    const tagExists = tags.some(tag => 
      tag.toLowerCase() === trimmedValue.toLowerCase()
    );
    
    if (tagExists) {
      setInputValue('');
      return;
    }
    
    // Check max tags limit
    if (tags.length >= maxTags) {
      setInputValue('');
      return;
    }
    
    // Add the new tag
    const newTags = [...tags, trimmedValue];
    onChange(newTags);
    setInputValue('');
  };

  // Remove a tag by index
  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
  };

  // Handle container click to focus input
  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    setIsInputFocused(false);
    // Add tag on blur if there's content
    if (inputValue.trim()) {
      addTag();
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  return (
    <div className={`tag-input-container ${className} ${disabled ? 'disabled' : ''} ${isInputFocused ? 'focused' : ''}`}>
      <div 
        className="tag-input-wrapper"
        onClick={handleContainerClick}
      >
        {/* Render existing tags */}
        {tags.map((tag, index) => (
          <div key={index} className="tag-item">
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
            placeholder={tags.length === 0 ? placeholder : ''}
            className="tag-input-field"
            dir="rtl"
            disabled={tags.length >= maxTags}
          />
        )}
      </div>
      
      {/* Helper text */}
      <div className="tag-input-help">
        {!disabled && (
          <>
            <span className="help-text">
              הקש Enter או פסיק להוספת תגית
            </span>
            {maxTags && (
              <span className="tag-count">
                {tags.length}/{maxTags}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TagInput;
