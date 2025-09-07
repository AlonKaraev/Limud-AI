import React, { useState } from 'react';
import MediaFilteringHeader from './MediaFilteringHeader';

const ExpandedMediaFiltersTest = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMediaType, setCurrentMediaType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  // Mock data for testing
  const mockTags = [
    { id: 1, name: 'חשוב', color: '#e74c3c' },
    { id: 2, name: 'לימודים', color: '#3498db' },
    { id: 3, name: 'פרויקט', color: '#2ecc71' },
    { id: 4, name: 'ישיבה', color: '#f39c12' },
    { id: 5, name: 'הרצאה', color: '#9b59b6' },
    { id: 6, name: 'מחקר', color: '#1abc9c' },
    { id: 7, name: 'בדיקה', color: '#34495e' },
    { id: 8, name: 'דחוף', color: '#e67e22' }
  ];

  const [availableTags, setAvailableTags] = useState(mockTags);

  // Handler functions
  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleUpload = async (files) => {
    console.log('Upload files:', files);
    // Simulate upload process
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Upload completed');
        resolve();
      }, 2000);
    });
  };

  const handleRecord = () => {
    console.log('Start recording for media type:', currentMediaType);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    console.log('Search query:', query);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    console.log('Filters changed:', newFilters);
  };

  const handleCreateTag = async (tagName) => {
    console.log('Creating new tag:', tagName);
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTag = {
          id: availableTags.length + 1,
          name: tagName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
        };
        
        setAvailableTags(prev => [...prev, newTag]);
        console.log('Tag created:', newTag);
        resolve(newTag);
      }, 500);
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.fileFormats?.length > 0) count++;
    if (filters.tags?.length > 0) count++;
    if (filters.processingStatus !== 'all') count++;
    if (filters.sizeRange?.min > 0 || filters.sizeRange?.max < 1000) count++;
    if (filters.durationRange?.min > 0 || filters.durationRange?.max < 180) count++;
    return count;
  };

  const formatFiltersForDisplay = () => {
    if (!filters || Object.keys(filters).length === 0) return 'אין מסננים פעילים';
    
    const parts = [];
    
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const from = filters.dateRange.from || 'התחלה';
      const to = filters.dateRange.to || 'סוף';
      parts.push(`תאריכים: ${from} - ${to}`);
    }
    
    if (filters.fileFormats?.length > 0) {
      parts.push(`פורמטים: ${filters.fileFormats.join(', ')}`);
    }
    
    if (filters.tags?.length > 0) {
      const tagNames = filters.tags.map(tagId => {
        const tag = availableTags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });
      parts.push(`תגיות: ${tagNames.join(', ')}`);
    }
    
    if (filters.processingStatus && filters.processingStatus !== 'all') {
      parts.push(`סטטוס: ${filters.processingStatus}`);
    }
    
    if (filters.sizeRange?.min > 0 || filters.sizeRange?.max < 1000) {
      parts.push(`גודל: ${filters.sizeRange?.min || 0}-${filters.sizeRange?.max || 1000}MB`);
    }
    
    if (filters.durationRange?.min > 0 || filters.durationRange?.max < 180) {
      parts.push(`משך: ${filters.durationRange?.min || 0}-${filters.durationRange?.max || 180} דק'`);
    }
    
    return parts.join(' | ');
  };

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        color: '#2c3e50'
      }}>
        בדיקת רכיב מסנני מדיה מורחבים
      </h1>

      {/* Media Type Selector */}
      <div style={{ 
        marginBottom: '2rem', 
        textAlign: 'center',
        background: '#f8f9fa',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>בחר סוג מדיה לבדיקה:</h3>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['all', 'audio', 'video', 'documents', 'images'].map(type => (
            <button
              key={type}
              onClick={() => setCurrentMediaType(type)}
              style={{
                padding: '0.75rem 1.5rem',
                border: currentMediaType === type ? '2px solid #3498db' : '1px solid #ddd',
                borderRadius: '6px',
                background: currentMediaType === type ? '#3498db' : 'white',
                color: currentMediaType === type ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              {type === 'all' && '🎯 כל המדיה'}
              {type === 'audio' && '🎵 אודיו'}
              {type === 'video' && '🎬 וידאו'}
              {type === 'documents' && '📄 מסמכים'}
              {type === 'images' && '🖼️ תמונות'}
            </button>
          ))}
        </div>
      </div>

      {/* Media Filtering Header Component */}
      <div style={{ marginBottom: '2rem' }}>
        <MediaFilteringHeader
          mediaType={currentMediaType}
          onUpload={handleUpload}
          onRecord={handleRecord}
          onSearch={handleSearch}
          isExpanded={isExpanded}
          onToggleExpanded={handleToggleExpanded}
          onFiltersChange={handleFiltersChange}
          availableTags={availableTags}
          onCreateTag={handleCreateTag}
          initialFilters={{}}
        />
      </div>

      {/* Status Display */}
      <div style={{ 
        background: '#ffffff',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>מצב נוכחי:</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <strong>סוג מדיה:</strong> {currentMediaType}
          </div>
          <div>
            <strong>מסננים מורחבים:</strong> {isExpanded ? '🔽 פתוח' : '▶️ סגור'}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>שאילתת חיפוש:</strong> {searchQuery || 'ללא חיפוש'}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>מספר מסננים פעילים:</strong> {getActiveFiltersCount()}
        </div>

        <div>
          <strong>מסננים פעילים:</strong>
          <div style={{ 
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#495057'
          }}>
            {formatFiltersForDisplay()}
          </div>
        </div>
      </div>

      {/* Available Tags Display */}
      <div style={{ 
        background: '#ffffff',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>תגיות זמינות:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {availableTags.map(tag => (
            <span
              key={tag.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                background: tag.color + '20',
                border: `1px solid ${tag.color}`,
                borderRadius: '20px',
                fontSize: '0.8rem',
                color: tag.color
              }}
            >
              <span 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: tag.color
                }}
              ></span>
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        background: '#e8f4fd',
        border: '1px solid #bee5eb',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#0c5460' }}>הוראות בדיקה:</h3>
        <ul style={{ color: '#0c5460', lineHeight: '1.6' }}>
          <li>בחר סוג מדיה שונה כדי לראות איך המסננים משתנים</li>
          <li>לחץ על כפתור ההרחבה (⌄) כדי לפתוח/לסגור את המסננים המורחבים</li>
          <li>נסה להקליד בשדה החיפוש כדי לראות את השאילתה</li>
          <li>בחר תאריכים, תגיות, וסטטוס עיבוד במסננים המורחבים</li>
          <li>צור תגית חדשה באמצעות הכפתור במסנן התגיות</li>
          <li>שים לב לספירת המסננים הפעילים ולתצוגת המצב</li>
          <li>בדוק את הרספונסיביות על ידי שינוי גודל החלון</li>
        </ul>
      </div>

      {/* Debug Information */}
      <details style={{ marginTop: '2rem' }}>
        <summary style={{ 
          cursor: 'pointer', 
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          fontWeight: '600'
        }}>
          מידע דיבוג (לחץ להרחבה)
        </summary>
        <pre style={{ 
          background: '#2c3e50',
          color: '#ecf0f1',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '0.8rem',
          marginTop: '1rem'
        }}>
          {JSON.stringify({
            currentMediaType,
            isExpanded,
            searchQuery,
            filters,
            availableTagsCount: availableTags.length,
            activeFiltersCount: getActiveFiltersCount()
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default ExpandedMediaFiltersTest;
