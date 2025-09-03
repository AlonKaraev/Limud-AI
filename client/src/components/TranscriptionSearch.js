import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const SearchContainer = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SearchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SearchTitle = styled.h3`
  color: var(--color-text);
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SearchInputContainer = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  color: var(--color-text);
  background: var(--color-surface);
  transition: var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-textSecondary);
  font-size: 1.1rem;
  pointer-events: none;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-textSecondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  font-size: 1.1rem;
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-surfaceHover);
    color: var(--color-text);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;

const SearchOptions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    margin: 0;
    accent-color: var(--color-primary);
  }
`;

const SearchResults = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
`;

const SearchResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ResultsCount = styled.span`
  color: var(--color-textSecondary);
  font-size: 0.9rem;
`;

const NoResults = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--color-textSecondary);
  font-style: italic;
`;

const SearchResultItem = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
  }
`;

const ResultItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ResultItemName = styled.div`
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResultItemMeta = styled.div`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
`;

const ResultItemPreview = styled.div`
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-top: 0.5rem;
  
  .highlight {
    background: var(--color-warning, #ffc107);
    color: var(--color-text);
    padding: 0.1rem 0.2rem;
    border-radius: 2px;
    font-weight: 500;
  }
`;

const TranscriptionSearch = ({ 
  mediaItems = [], 
  onItemClick, 
  mediaType = 'audio',
  onSearchResults 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
        if (onSearchResults) {
          onSearchResults([]);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, caseSensitive, wholeWords, mediaItems]);

  const performSearch = async (query) => {
    if (!query) return;

    setIsSearching(true);
    const results = [];

    try {
      // Search through media items that have transcriptions
      for (const item of mediaItems) {
        if (item.serverRecordingId || item.id) {
          const transcription = await fetchTranscription(item.serverRecordingId || item.id);
          if (transcription && transcription.text) {
            const matches = searchInText(transcription.text, query);
            if (matches.length > 0) {
              results.push({
                ...item,
                transcription,
                matches,
                matchCount: matches.length
              });
            }
          }
        }
      }

      // Sort results by relevance (number of matches)
      results.sort((a, b) => b.matchCount - a.matchCount);
      
      setSearchResults(results);
      if (onSearchResults) {
        onSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchTranscription = async (recordingId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`/api/recordings/${recordingId}/transcription-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.transcription;
      }
    } catch (error) {
      console.error('Error fetching transcription for search:', error);
    }
    return null;
  };

  const searchInText = (text, query) => {
    if (!text || !query) return [];

    let searchText = text;
    let searchQuery = query;

    if (!caseSensitive) {
      searchText = text.toLowerCase();
      searchQuery = query.toLowerCase();
    }

    const matches = [];
    let regex;

    if (wholeWords) {
      regex = new RegExp(`\\b${escapeRegExp(searchQuery)}\\b`, caseSensitive ? 'g' : 'gi');
    } else {
      regex = new RegExp(escapeRegExp(searchQuery), caseSensitive ? 'g' : 'gi');
    }

    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.substring(start, end);
      
      matches.push({
        index: match.index,
        text: match[0],
        context: context,
        start: start,
        end: end
      });
    }

    return matches;
  };

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightText = (text, query) => {
    if (!query) return text;

    let regex;
    if (wholeWords) {
      regex = new RegExp(`\\b(${escapeRegExp(query)})\\b`, caseSensitive ? 'g' : 'gi');
    } else {
      regex = new RegExp(`(${escapeRegExp(query)})`, caseSensitive ? 'g' : 'gi');
    }

    return text.replace(regex, '<span class="highlight">$1</span>');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (onSearchResults) {
      onSearchResults([]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <SearchContainer>
      <SearchHeader>
        <SearchTitle>
          🔍 חיפוש בתמלולים
        </SearchTitle>
      </SearchHeader>

      <SearchInputContainer>
        <SearchIcon>🔍</SearchIcon>
        <SearchInput
          type="text"
          placeholder={`חפש בתמלולי ${mediaType === 'audio' ? 'האודיו' : 'הווידאו'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <ClearButton onClick={clearSearch} title="נקה חיפוש">
            ✕
          </ClearButton>
        )}
      </SearchInputContainer>

      <SearchOptions>
        <SearchOption>
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          רגיש לאותיות גדולות/קטנות
        </SearchOption>
        <SearchOption>
          <input
            type="checkbox"
            checked={wholeWords}
            onChange={(e) => setWholeWords(e.target.checked)}
          />
          מילים שלמות בלבד
        </SearchOption>
      </SearchOptions>

      {searchQuery && (
        <SearchResults>
          <SearchResultsHeader>
            <ResultsCount>
              {isSearching ? 'מחפש...' : `נמצאו ${searchResults.length} תוצאות`}
            </ResultsCount>
          </SearchResultsHeader>

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <NoResults>
              לא נמצאו תוצאות עבור "{searchQuery}"
            </NoResults>
          )}

          {searchResults.map((result) => (
            <SearchResultItem
              key={result.id}
              onClick={() => onItemClick && onItemClick(result)}
            >
              <ResultItemHeader>
                <ResultItemName>
                  {mediaType === 'audio' ? '🎵' : '🎬'} {result.name || result.originalFileName}
                </ResultItemName>
                <ResultItemMeta>
                  {result.matchCount} התאמות • {formatFileSize(result.size)}
                  {result.duration && ` • ${formatDuration(result.duration)}`}
                </ResultItemMeta>
              </ResultItemHeader>
              
              {result.matches && result.matches.length > 0 && (
                <ResultItemPreview>
                  {result.matches.slice(0, 2).map((match, index) => (
                    <div key={index} style={{ marginBottom: '0.5rem' }}>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(match.context, searchQuery)
                        }}
                      />
                      {index < Math.min(result.matches.length, 2) - 1 && <br />}
                    </div>
                  ))}
                  {result.matches.length > 2 && (
                    <div style={{ color: 'var(--color-textSecondary)', fontSize: '0.8rem' }}>
                      ועוד {result.matches.length - 2} התאמות...
                    </div>
                  )}
                </ResultItemPreview>
              )}
            </SearchResultItem>
          ))}
        </SearchResults>
      )}
    </SearchContainer>
  );
};

export default TranscriptionSearch;
