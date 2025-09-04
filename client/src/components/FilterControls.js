import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const FilterContainer = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
`;

const FilterTitle = styled.h4`
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ClearFiltersButton = styled.button`
  background: var(--color-textSecondary);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-text);
  }

  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 150px;
  flex: 1;
`;

const FilterLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-textSecondary);
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight, rgba(52, 152, 219, 0.2));
  }

  &::placeholder {
    color: var(--color-textTertiary);
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight, rgba(52, 152, 219, 0.2));
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const TagChip = styled.div`
  background: ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};
  color: ${props => props.selected ? 'var(--color-textOnPrimary)' : 'var(--color-text)'};
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--transition-fast);
  border: 1px solid ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};

  &:hover {
    background: ${props => props.selected ? 'var(--color-primaryHover)' : 'var(--color-primaryLight, rgba(52, 152, 219, 0.1))'};
    border-color: var(--color-primary);
  }
`;

const ActiveFiltersContainer = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
`;

const ActiveFiltersTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-textSecondary);
  margin-bottom: 0.5rem;
`;

const ActiveFiltersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ActiveFilterChip = styled.div`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RemoveFilterButton = styled.button`
  background: none;
  border: none;
  color: var(--color-textOnPrimary);
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
  line-height: 1;

  &:hover {
    opacity: 0.7;
  }
`;

const ResultsCount = styled.div`
  font-size: 0.9rem;
  color: var(--color-textSecondary);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
`;

const FilterControls = ({ 
  mediaItems = [], 
  onFilterChange, 
  availableTags = [], 
  mediaType = 'audio' 
}) => {
  const [filters, setFilters] = useState({
    search: '',
    tags: [],
    domain: '',
    subject: '',
    gradeLevel: '',
    language: '',
    difficulty: '',
    author: '',
    dateFrom: '',
    dateTo: '',
    sizeMin: '',
    sizeMax: ''
  });

  const [filteredItems, setFilteredItems] = useState(mediaItems);

  // Extract unique values from metadata for filter options
  const getUniqueMetadataValues = (field) => {
    const values = new Set();
    mediaItems.forEach(item => {
      const metadata = item.metadata || {};
      if (metadata[field] && metadata[field].trim()) {
        values.add(metadata[field].trim());
      }
    });
    return Array.from(values).sort();
  };

  const domains = getUniqueMetadataValues('domain');
  const subjects = getUniqueMetadataValues('subject');
  const gradeLevels = getUniqueMetadataValues('gradeLevel');
  const languages = getUniqueMetadataValues('language');
  const difficulties = getUniqueMetadataValues('difficulty');
  const authors = getUniqueMetadataValues('author');

  // Apply filters to media items
  useEffect(() => {
    let filtered = [...mediaItems];

    // Search filter (name, description, keywords, extracted text)
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const name = (item.name || item.filename || '').toLowerCase();
        const description = (item.metadata?.description || '').toLowerCase();
        const keywords = (item.metadata?.keywords || '').toLowerCase();
        const originalFileName = (item.originalFileName || '').toLowerCase();
        
        // Search in extracted text for documents and images
        let extractedTextMatch = false;
        if (item.extraction && item.extraction.text) {
          extractedTextMatch = item.extraction.text.toLowerCase().includes(searchTerm);
        }
        
        // Search in transcription text for audio/video
        let transcriptionMatch = false;
        if (item.transcription && item.transcription.text) {
          transcriptionMatch = item.transcription.text.toLowerCase().includes(searchTerm);
        }
        
        return name.includes(searchTerm) || 
               description.includes(searchTerm) || 
               keywords.includes(searchTerm) ||
               originalFileName.includes(searchTerm) ||
               extractedTextMatch ||
               transcriptionMatch;
      });
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(item => {
        const itemTags = item.tags || [];
        return filters.tags.every(filterTag => 
          itemTags.some(itemTag => 
            itemTag.toLowerCase().includes(filterTag.toLowerCase())
          )
        );
      });
    }

    // Metadata filters
    if (filters.domain) {
      filtered = filtered.filter(item => 
        (item.metadata?.domain || '').toLowerCase().includes(filters.domain.toLowerCase())
      );
    }

    if (filters.subject) {
      filtered = filtered.filter(item => 
        (item.metadata?.subject || '').toLowerCase().includes(filters.subject.toLowerCase())
      );
    }

    if (filters.gradeLevel) {
      filtered = filtered.filter(item => 
        (item.metadata?.gradeLevel || '').toLowerCase().includes(filters.gradeLevel.toLowerCase())
      );
    }

    if (filters.language) {
      filtered = filtered.filter(item => 
        (item.metadata?.language || '').toLowerCase().includes(filters.language.toLowerCase())
      );
    }

    if (filters.difficulty) {
      filtered = filtered.filter(item => 
        (item.metadata?.difficulty || '').toLowerCase().includes(filters.difficulty.toLowerCase())
      );
    }

    if (filters.author) {
      filtered = filtered.filter(item => 
        (item.metadata?.author || '').toLowerCase().includes(filters.author.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt || item.savedAt || item.created_at);
        return itemDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt || item.savedAt || item.created_at);
        return itemDate <= toDate;
      });
    }

    // Size range filter
    if (filters.sizeMin) {
      const minSize = parseFloat(filters.sizeMin) * 1024 * 1024; // Convert MB to bytes
      filtered = filtered.filter(item => (item.size || 0) >= minSize);
    }

    if (filters.sizeMax) {
      const maxSize = parseFloat(filters.sizeMax) * 1024 * 1024; // Convert MB to bytes
      filtered = filtered.filter(item => (item.size || 0) <= maxSize);
    }

    setFilteredItems(filtered);
    onFilterChange(filtered);
  }, [filters, mediaItems, onFilterChange]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      tags: [],
      domain: '',
      subject: '',
      gradeLevel: '',
      language: '',
      difficulty: '',
      author: '',
      dateFrom: '',
      dateTo: '',
      sizeMin: '',
      sizeMax: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.tags.length > 0 || 
           filters.domain || 
           filters.subject || 
           filters.gradeLevel || 
           filters.language || 
           filters.difficulty || 
           filters.author || 
           filters.dateFrom || 
           filters.dateTo || 
           filters.sizeMin || 
           filters.sizeMax;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.tags.length > 0) count += filters.tags.length;
    if (filters.domain) count++;
    if (filters.subject) count++;
    if (filters.gradeLevel) count++;
    if (filters.language) count++;
    if (filters.difficulty) count++;
    if (filters.author) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.sizeMin) count++;
    if (filters.sizeMax) count++;
    return count;
  };

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'audio': return '🎵';
      case 'video': return '🎬';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  const getMediaTypeName = () => {
    switch (mediaType) {
      case 'audio': return 'אודיו';
      case 'video': return 'ווידאו';
      case 'document': return 'מסמכים';
      default: return 'מדיה';
    }
  };

  return (
    <FilterContainer>
      <FilterHeader>
        <FilterTitle>
          {getMediaTypeIcon()} סינון {getMediaTypeName()}
          {hasActiveFilters() && (
            <span style={{ 
              background: 'var(--color-primary)', 
              color: 'var(--color-textOnPrimary)', 
              borderRadius: '50%', 
              width: '20px', 
              height: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {getActiveFiltersCount()}
            </span>
          )}
        </FilterTitle>
        {hasActiveFilters() && (
          <ClearFiltersButton onClick={clearAllFilters}>
            נקה הכל
          </ClearFiltersButton>
        )}
      </FilterHeader>

      {/* Search and basic filters */}
      <FilterRow>
        <FilterGroup style={{ flex: 2 }}>
          <FilterLabel>חיפוש</FilterLabel>
          <FilterInput
            type="text"
            placeholder={
              mediaType === 'document' 
                ? "חפש לפי שם, תיאור, מילות מפתח או טקסט מחולץ..."
                : mediaType === 'audio' || mediaType === 'video'
                ? "חפש לפי שם, תיאור, מילות מפתח או תמלול..."
                : "חפש לפי שם, תיאור או מילות מפתח..."
            }
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>תחום</FilterLabel>
          <FilterSelect
            value={filters.domain}
            onChange={(e) => handleFilterChange('domain', e.target.value)}
          >
            <option value="">כל התחומים</option>
            {domains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>מקצוע</FilterLabel>
          <FilterSelect
            value={filters.subject}
            onChange={(e) => handleFilterChange('subject', e.target.value)}
          >
            <option value="">כל המקצועות</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>כיתה</FilterLabel>
          <FilterSelect
            value={filters.gradeLevel}
            onChange={(e) => handleFilterChange('gradeLevel', e.target.value)}
          >
            <option value="">כל הכיתות</option>
            {gradeLevels.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FilterRow>

      {/* Advanced filters */}
      <FilterRow>
        <FilterGroup>
          <FilterLabel>שפה</FilterLabel>
          <FilterSelect
            value={filters.language}
            onChange={(e) => handleFilterChange('language', e.target.value)}
          >
            <option value="">כל השפות</option>
            {languages.map(language => (
              <option key={language} value={language}>{language}</option>
            ))}
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>רמת קושי</FilterLabel>
          <FilterSelect
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <option value="">כל הרמות</option>
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>{difficulty}</option>
            ))}
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>מחבר</FilterLabel>
          <FilterSelect
            value={filters.author}
            onChange={(e) => handleFilterChange('author', e.target.value)}
          >
            <option value="">כל המחברים</option>
            {authors.map(author => (
              <option key={author} value={author}>{author}</option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FilterRow>

      {/* Date and size filters */}
      <FilterRow>
        <FilterGroup>
          <FilterLabel>מתאריך</FilterLabel>
          <FilterInput
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>עד תאריך</FilterLabel>
          <FilterInput
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>גודל מינימלי (MB)</FilterLabel>
          <FilterInput
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            value={filters.sizeMin}
            onChange={(e) => handleFilterChange('sizeMin', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>גודל מקסימלי (MB)</FilterLabel>
          <FilterInput
            type="number"
            min="0"
            step="0.1"
            placeholder="∞"
            value={filters.sizeMax}
            onChange={(e) => handleFilterChange('sizeMax', e.target.value)}
          />
        </FilterGroup>
      </FilterRow>

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <FilterGroup>
          <FilterLabel>תגיות</FilterLabel>
          <TagsContainer>
            {availableTags.map(tag => (
              <TagChip
                key={tag}
                selected={filters.tags.includes(tag)}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </TagChip>
            ))}
          </TagsContainer>
        </FilterGroup>
      )}

      {/* Active filters display */}
      {hasActiveFilters() && (
        <ActiveFiltersContainer>
          <ActiveFiltersTitle>מסננים פעילים:</ActiveFiltersTitle>
          <ActiveFiltersList>
            {filters.search && (
              <ActiveFilterChip>
                חיפוש: "{filters.search}"
                <RemoveFilterButton onClick={() => handleFilterChange('search', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.tags.map(tag => (
              <ActiveFilterChip key={tag}>
                תגית: {tag}
                <RemoveFilterButton onClick={() => handleTagToggle(tag)}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            ))}
            {filters.domain && (
              <ActiveFilterChip>
                תחום: {filters.domain}
                <RemoveFilterButton onClick={() => handleFilterChange('domain', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.subject && (
              <ActiveFilterChip>
                מקצוע: {filters.subject}
                <RemoveFilterButton onClick={() => handleFilterChange('subject', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.gradeLevel && (
              <ActiveFilterChip>
                כיתה: {filters.gradeLevel}
                <RemoveFilterButton onClick={() => handleFilterChange('gradeLevel', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.language && (
              <ActiveFilterChip>
                שפה: {filters.language}
                <RemoveFilterButton onClick={() => handleFilterChange('language', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.difficulty && (
              <ActiveFilterChip>
                רמת קושי: {filters.difficulty}
                <RemoveFilterButton onClick={() => handleFilterChange('difficulty', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.author && (
              <ActiveFilterChip>
                מחבר: {filters.author}
                <RemoveFilterButton onClick={() => handleFilterChange('author', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.dateFrom && (
              <ActiveFilterChip>
                מתאריך: {new Date(filters.dateFrom).toLocaleDateString('he-IL')}
                <RemoveFilterButton onClick={() => handleFilterChange('dateFrom', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.dateTo && (
              <ActiveFilterChip>
                עד תאריך: {new Date(filters.dateTo).toLocaleDateString('he-IL')}
                <RemoveFilterButton onClick={() => handleFilterChange('dateTo', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.sizeMin && (
              <ActiveFilterChip>
                גודל מינימלי: {filters.sizeMin}MB
                <RemoveFilterButton onClick={() => handleFilterChange('sizeMin', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
            {filters.sizeMax && (
              <ActiveFilterChip>
                גודל מקסימלי: {filters.sizeMax}MB
                <RemoveFilterButton onClick={() => handleFilterChange('sizeMax', '')}>
                  ×
                </RemoveFilterButton>
              </ActiveFilterChip>
            )}
          </ActiveFiltersList>
        </ActiveFiltersContainer>
      )}

      {/* Results count */}
      <ResultsCount>
        מציג {filteredItems.length} מתוך {mediaItems.length} פריטים
      </ResultsCount>
    </FilterContainer>
  );
};

export default FilterControls;
