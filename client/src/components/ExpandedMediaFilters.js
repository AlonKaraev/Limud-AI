import React, { useState, useEffect } from 'react';
import './ExpandedMediaFilters.css';

const ExpandedMediaFilters = ({ 
  isVisible = false,
  mediaType = 'all',
  onFiltersChange,
  availableTags = [],
  onCreateTag,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState({
    dateRange: {
      from: '',
      to: '',
      preset: ''
    },
    mediaTypes: {
      audio: true,
      video: true,
      documents: true,
      images: true
    },
    fileFormats: [],
    tags: [],
    processingStatus: 'all',
    sizeRange: {
      min: 0,
      max: 1000 // MB
    },
    durationRange: {
      min: 0,
      max: 180 // minutes
    },
    ...initialFilters
  });

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  // Date presets
  const datePresets = [
    { value: 'today', label: 'היום' },
    { value: 'week', label: 'השבוע' },
    { value: 'month', label: 'החודש' },
    { value: 'year', label: 'השנה' }
  ];

  // File format options based on media type
  const getFileFormats = () => {
    const formats = {
      audio: ['MP3', 'WAV', 'M4A', 'AAC', 'OGG'],
      video: ['MP4', 'AVI', 'MOV', 'WMV', 'FLV', 'WEBM'],
      documents: ['PDF', 'DOC', 'DOCX', 'TXT', 'RTF'],
      images: ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'WEBP']
    };

    if (mediaType === 'all') {
      return Object.values(formats).flat();
    }
    return formats[mediaType] || [];
  };

  // Processing status options
  const processingStatuses = [
    { value: 'all', label: 'הכל', icon: '📋' },
    { value: 'processing', label: 'מעבד', icon: '⏳' },
    { value: 'completed', label: 'הושלם', icon: '✅' },
    { value: 'failed', label: 'נכשל', icon: '❌' },
    { value: 'pending', label: 'ממתין', icon: '⏸️' }
  ];

  // Size presets
  const sizePresets = [
    { value: 'small', label: 'קטן (<10MB)', min: 0, max: 10 },
    { value: 'medium', label: 'בינוני (10-100MB)', min: 10, max: 100 },
    { value: 'large', label: 'גדול (>100MB)', min: 100, max: 1000 }
  ];

  // Duration presets (for audio/video)
  const durationPresets = [
    { value: 'short', label: 'קצר (<5 דק\')', min: 0, max: 5 },
    { value: 'medium', label: 'בינוני (5-30 דק\')', min: 5, max: 30 },
    { value: 'long', label: 'ארוך (>30 דק\')', min: 30, max: 180 }
  ];

  // Handle date preset selection
  const handleDatePreset = (preset) => {
    const now = new Date();
    let from, to;

    switch (preset) {
      case 'today':
        from = to = now.toISOString().split('T')[0];
        break;
      case 'week':
        from = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        to = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        from = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        to = new Date().toISOString().split('T')[0];
        break;
      case 'year':
        from = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
        to = new Date().toISOString().split('T')[0];
        break;
      default:
        from = to = '';
    }

    updateFilters({
      dateRange: { from, to, preset }
    });
  };

  // Handle media type toggle
  const handleMediaTypeToggle = (type) => {
    updateFilters({
      mediaTypes: {
        ...filters.mediaTypes,
        [type]: !filters.mediaTypes[type]
      }
    });
  };

  // Handle select all/none for media types
  const handleMediaTypeSelectAll = (selectAll) => {
    const newMediaTypes = {};
    Object.keys(filters.mediaTypes).forEach(type => {
      newMediaTypes[type] = selectAll;
    });
    updateFilters({ mediaTypes: newMediaTypes });
  };

  // Handle file format toggle
  const handleFileFormatToggle = (format) => {
    const newFormats = filters.fileFormats.includes(format)
      ? filters.fileFormats.filter(f => f !== format)
      : [...filters.fileFormats, format];
    
    updateFilters({ fileFormats: newFormats });
  };

  // Handle tag selection
  const handleTagToggle = (tagId) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter(id => id !== tagId)
      : [...filters.tags, tagId];
    
    updateFilters({ tags: newTags });
  };

  // Handle new tag creation
  const handleCreateNewTag = async () => {
    if (newTagName.trim() && onCreateTag) {
      try {
        const newTag = await onCreateTag(newTagName.trim());
        if (newTag) {
          updateFilters({ tags: [...filters.tags, newTag.id] });
        }
        setNewTagName('');
        setShowNewTagInput(false);
      } catch (error) {
        console.error('Failed to create tag:', error);
      }
    }
  };

  // Handle size preset selection
  const handleSizePreset = (preset) => {
    const presetData = sizePresets.find(p => p.value === preset);
    if (presetData) {
      updateFilters({
        sizeRange: { min: presetData.min, max: presetData.max }
      });
    }
  };

  // Handle duration preset selection
  const handleDurationPreset = (preset) => {
    const presetData = durationPresets.find(p => p.value === preset);
    if (presetData) {
      updateFilters({
        durationRange: { min: presetData.min, max: presetData.max }
      });
    }
  };

  // Update filters and notify parent
  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    if (onFiltersChange) {
      onFiltersChange(updatedFilters);
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    const clearedFilters = {
      dateRange: { from: '', to: '', preset: '' },
      mediaTypes: { audio: true, video: true, documents: true, images: true },
      fileFormats: [],
      tags: [],
      processingStatus: 'all',
      sizeRange: { min: 0, max: 1000 },
      durationRange: { min: 0, max: 180 }
    };
    setFilters(clearedFilters);
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  // Get selected tag objects
  const getSelectedTags = () => {
    return availableTags.filter(tag => filters.tags.includes(tag.id));
  };

  if (!isVisible) return null;

  return (
    <div className="expanded-media-filters">
      <div className="filters-container">
        
        {/* Date Filter Line */}
        <div className="filter-line date-filter-line">
          <div className="filter-line-header">
            <span className="filter-line-icon">📅</span>
            <label className="filter-line-label">טווח תאריכים</label>
          </div>
          <div className="filter-line-content">
            <div className="date-inputs">
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => updateFilters({
                  dateRange: { ...filters.dateRange, from: e.target.value, preset: '' }
                })}
                className="date-input"
                placeholder="מתאריך"
              />
              <span className="date-separator">עד</span>
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => updateFilters({
                  dateRange: { ...filters.dateRange, to: e.target.value, preset: '' }
                })}
                className="date-input"
                placeholder="עד תאריך"
              />
            </div>
            <div className="date-presets">
              {datePresets.map(preset => (
                <button
                  key={preset.value}
                  className={`preset-btn ${filters.dateRange.preset === preset.value ? 'active' : ''}`}
                  onClick={() => handleDatePreset(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {(filters.dateRange.from || filters.dateRange.to) && (
              <button
                className="clear-filter-btn"
                onClick={() => updateFilters({
                  dateRange: { from: '', to: '', preset: '' }
                })}
                title="נקה טווח תאריכים"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Size Filter Line */}
        <div className="filter-line size-filter-line">
          <div className="filter-line-header">
            <span className="filter-line-icon">📏</span>
            <label className="filter-line-label">גודל קובץ (MB)</label>
          </div>
          <div className="filter-line-content">
            <div className="size-presets">
              {sizePresets.map(preset => (
                <button
                  key={preset.value}
                  className={`preset-btn ${
                    filters.sizeRange.min === preset.min && 
                    filters.sizeRange.max === preset.max ? 'active' : ''
                  }`}
                  onClick={() => handleSizePreset(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="range-inputs">
              <input
                type="number"
                min="0"
                max="1000"
                value={filters.sizeRange.min}
                onChange={(e) => updateFilters({
                  sizeRange: { ...filters.sizeRange, min: parseInt(e.target.value) || 0 }
                })}
                className="range-input"
                placeholder="מינימום"
              />
              <span className="range-separator">-</span>
              <input
                type="number"
                min="0"
                max="1000"
                value={filters.sizeRange.max}
                onChange={(e) => updateFilters({
                  sizeRange: { ...filters.sizeRange, max: parseInt(e.target.value) || 1000 }
                })}
                className="range-input"
                placeholder="מקסימום"
              />
            </div>
            {(filters.sizeRange.min > 0 || filters.sizeRange.max < 1000) && (
              <button
                className="clear-filter-btn"
                onClick={() => updateFilters({
                  sizeRange: { min: 0, max: 1000 }
                })}
                title="נקה מסנן גודל"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Time/Duration Filter Line (Audio/Video only) */}
        {(mediaType === 'audio' || mediaType === 'video' || mediaType === 'all') && (
          <div className="filter-line time-filter-line">
            <div className="filter-line-header">
              <span className="filter-line-icon">⏱️</span>
              <label className="filter-line-label">משך זמן (דקות)</label>
            </div>
            <div className="filter-line-content">
              <div className="duration-presets">
                {durationPresets.map(preset => (
                  <button
                    key={preset.value}
                    className={`preset-btn ${
                      filters.durationRange.min === preset.min && 
                      filters.durationRange.max === preset.max ? 'active' : ''
                    }`}
                    onClick={() => handleDurationPreset(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="range-inputs">
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={filters.durationRange.min}
                  onChange={(e) => updateFilters({
                    durationRange: { ...filters.durationRange, min: parseInt(e.target.value) || 0 }
                  })}
                  className="range-input"
                  placeholder="מינימום"
                />
                <span className="range-separator">-</span>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={filters.durationRange.max}
                  onChange={(e) => updateFilters({
                    durationRange: { ...filters.durationRange, max: parseInt(e.target.value) || 180 }
                  })}
                  className="range-input"
                  placeholder="מקסימום"
                />
              </div>
              {(filters.durationRange.min > 0 || filters.durationRange.max < 180) && (
                <button
                  className="clear-filter-btn"
                  onClick={() => updateFilters({
                    durationRange: { min: 0, max: 180 }
                  })}
                  title="נקה מסנן זמן"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media Type Filter Line (only for "All Media" tab) */}
        {mediaType === 'all' && (
          <div className="filter-line media-type-filter-line">
            <div className="filter-line-header">
              <span className="filter-line-icon">🎭</span>
              <label className="filter-line-label">סוג מדיה</label>
            </div>
            <div className="filter-line-content">
              <div className="media-type-actions">
                <button
                  className="select-action-btn"
                  onClick={() => handleMediaTypeSelectAll(true)}
                >
                  בחר הכל
                </button>
                <button
                  className="select-action-btn"
                  onClick={() => handleMediaTypeSelectAll(false)}
                >
                  בטל הכל
                </button>
              </div>
              <div className="media-type-checkboxes">
                {Object.entries(filters.mediaTypes).map(([type, checked]) => (
                  <label key={type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleMediaTypeToggle(type)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">
                      {type === 'audio' && '🎵 אודיו'}
                      {type === 'video' && '🎬 וידאו'}
                      {type === 'documents' && '📄 מסמכים'}
                      {type === 'images' && '🖼️ תמונות'}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* File Format Sub-filters */}
              <div className="file-formats">
                <span className="sub-filter-label">פורמטים:</span>
                <div className="format-tags">
                  {getFileFormats().map(format => (
                    <button
                      key={format}
                      className={`format-tag ${filters.fileFormats.includes(format) ? 'active' : ''}`}
                      onClick={() => handleFileFormatToggle(format)}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags Filter Line */}
        <div className="filter-line tags-filter-line">
          <div className="filter-line-header">
            <span className="filter-line-icon">🏷️</span>
            <label className="filter-line-label">תגיות</label>
          </div>
          <div className="filter-line-content">
            <div className="tag-dropdown-container">
              <button
                className="tag-dropdown-trigger"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
              >
                <span>
                  {filters.tags.length > 0 
                    ? `נבחרו ${filters.tags.length} תגיות`
                    : 'בחר תגיות'
                  }
                </span>
                <span className={`dropdown-arrow ${showTagDropdown ? 'open' : ''}`}>⌄</span>
              </button>
              
              {showTagDropdown && (
                <div className="tag-dropdown-menu">
                  <div className="tag-dropdown-header">
                    <button
                      className="create-tag-btn"
                      onClick={() => setShowNewTagInput(true)}
                    >
                      + צור תגית חדשה
                    </button>
                  </div>
                  
                  {showNewTagInput && (
                    <div className="new-tag-input-container">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="שם התגית החדשה"
                        className="new-tag-input"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateNewTag()}
                        autoFocus
                      />
                      <div className="new-tag-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleCreateNewTag}
                          disabled={!newTagName.trim()}
                        >
                          צור
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setShowNewTagInput(false);
                            setNewTagName('');
                          }}
                        >
                          בטל
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="tag-options">
                    {availableTags.map(tag => (
                      <label key={tag.id} className="tag-option">
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag.id)}
                          onChange={() => handleTagToggle(tag.id)}
                          className="tag-checkbox"
                        />
                        <span 
                          className="tag-color-indicator"
                          style={{ backgroundColor: tag.color || '#3498db' }}
                        ></span>
                        <span className="tag-name">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Selected Tags Display */}
            {filters.tags.length > 0 && (
              <div className="selected-tags">
                {getSelectedTags().map(tag => (
                  <span key={tag.id} className="selected-tag">
                    <span 
                      className="tag-color-dot"
                      style={{ backgroundColor: tag.color || '#3498db' }}
                    ></span>
                    {tag.name}
                    <button
                      className="remove-tag-btn"
                      onClick={() => handleTagToggle(tag.id)}
                      title="הסר תגית"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter Actions */}
        <div className="filter-actions">
          <button
            className="btn btn-outline clear-filters-btn"
            onClick={handleClearAllFilters}
          >
            נקה כל המסננים
          </button>
          <div className="active-filters-count">
            {(() => {
              let count = 0;
              if (filters.dateRange.from || filters.dateRange.to) count++;
              if (filters.fileFormats.length > 0) count++;
              if (filters.tags.length > 0) count++;
              if (filters.processingStatus !== 'all') count++;
              if (filters.sizeRange.min > 0 || filters.sizeRange.max < 1000) count++;
              if (filters.durationRange.min > 0 || filters.durationRange.max < 180) count++;
              return count > 0 ? `${count} מסננים פעילים` : 'אין מסננים פעילים';
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedMediaFilters;
