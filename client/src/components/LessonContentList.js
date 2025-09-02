import React, { useState, useEffect } from 'react';

const LessonContentList = ({ lessonId, lessonTitle, onClose }) => {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (lessonId) {
      loadLessonContent();
    }
  }, [lessonId]);

  const loadLessonContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Load all content types for this lesson
      const [summariesRes, memoryCardsRes, testsRes, transcriptionsRes] = await Promise.all([
        // Summaries
        fetch(`/api/summaries?source_id=${lessonId}&source_type=recording`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // Memory Card Sets
        fetch(`/api/memory-cards/sets?source_id=${lessonId}&source_type=recording`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // Tests
        fetch(`/api/tests?source_id=${lessonId}&source_type=recording`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // Transcriptions
        fetch(`/api/recordings/${lessonId}/transcription`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const content = [];

      // Process summaries
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        const summaries = summariesData.summaries || [];
        summaries.forEach(summary => {
          content.push({
            id: `summary-${summary.id}`,
            type: 'summary',
            title: summary.title,
            description: summary.content?.substring(0, 150) + '...',
            subjectArea: summary.subject_area,
            gradeLevel: summary.grade_level,
            tags: summary.tags || [],
            isPublic: summary.is_public,
            createdAt: summary.created_at,
            icon: '📝',
            color: '#3498db'
          });
        });
      }

      // Process memory card sets
      if (memoryCardsRes.ok) {
        const memoryCardsData = await memoryCardsRes.json();
        const cardSets = memoryCardsData.data || [];
        cardSets.forEach(set => {
          content.push({
            id: `cards-${set.id}`,
            type: 'memory_cards',
            title: set.name,
            description: set.description || `${set.total_cards || 0} כרטיסים`,
            subjectArea: set.subject_area,
            gradeLevel: set.grade_level,
            tags: set.tags || [],
            isPublic: set.is_public,
            createdAt: set.created_at,
            icon: '🎴',
            color: '#e74c3c'
          });
        });
      }

      // Process tests
      if (testsRes.ok) {
        const testsData = await testsRes.json();
        const tests = testsData.tests || [];
        tests.forEach(test => {
          content.push({
            id: `test-${test.id}`,
            type: 'test',
            title: test.title,
            description: test.description || `${test.question_count || 0} שאלות`,
            subjectArea: test.subject_area,
            gradeLevel: test.grade_level,
            tags: test.tags || [],
            isPublic: test.is_public,
            createdAt: test.created_at,
            icon: '📋',
            color: '#f39c12'
          });
        });
      }

      // Process transcription
      if (transcriptionsRes.ok) {
        const transcriptionData = await transcriptionsRes.json();
        if (transcriptionData.transcription) {
          content.push({
            id: `transcription-${transcriptionData.transcription.id}`,
            type: 'transcription',
            title: 'תמלול השיעור',
            description: transcriptionData.transcription.transcription_text?.substring(0, 150) + '...',
            subjectArea: null,
            gradeLevel: null,
            tags: [],
            isPublic: false,
            createdAt: transcriptionData.transcription.created_at,
            icon: '📄',
            color: '#9b59b6'
          });
        }
      }

      // Sort by creation date (newest first)
      content.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setContentItems(content);
    } catch (err) {
      console.error('Error loading lesson content:', err);
      setError('שגיאה בטעינת תוכן השיעור');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredContent = () => {
    if (activeFilter === 'all') {
      return contentItems;
    }
    return contentItems.filter(item => item.type === activeFilter);
  };

  const getContentTypeCount = (type) => {
    return contentItems.filter(item => item.type === type).length;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleContentClick = (item) => {
    // Handle navigation to specific content based on type
    switch (item.type) {
      case 'summary':
        // Navigate to summary view
        console.log('Navigate to summary:', item.id);
        break;
      case 'memory_cards':
        // Navigate to memory cards view
        console.log('Navigate to memory cards:', item.id);
        break;
      case 'test':
        // Navigate to test view
        console.log('Navigate to test:', item.id);
        break;
      case 'transcription':
        // Navigate to transcription view
        console.log('Navigate to transcription:', item.id);
        break;
      default:
        console.log('Unknown content type:', item.type);
    }
  };

  if (loading) {
    return (
      <div className="lesson-content-list">
        <div className="content-header">
          <div className="content-title">
            <h3>תוכן השיעור</h3>
            <p>{lessonTitle}</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>טוען תוכן השיעור...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-content-list">
        <div className="content-header">
          <div className="content-title">
            <h3>תוכן השיעור</h3>
            <p>{lessonTitle}</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadLessonContent}>
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  const filteredContent = getFilteredContent();

  return (
    <div className="lesson-content-list">
      <div className="content-header">
        <div className="content-title">
          <h3>תוכן השיעור</h3>
          <p>{lessonTitle}</p>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Content Type Filters */}
      <div className="content-filters">
        <button
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          הכל ({contentItems.length})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveFilter('summary')}
        >
          📝 סיכומים ({getContentTypeCount('summary')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'memory_cards' ? 'active' : ''}`}
          onClick={() => setActiveFilter('memory_cards')}
        >
          🎴 כרטיסי זיכרון ({getContentTypeCount('memory_cards')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'test' ? 'active' : ''}`}
          onClick={() => setActiveFilter('test')}
        >
          📋 מבחנים ({getContentTypeCount('test')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'transcription' ? 'active' : ''}`}
          onClick={() => setActiveFilter('transcription')}
        >
          📄 תמלול ({getContentTypeCount('transcription')})
        </button>
      </div>

      {/* Content List */}
      <div className="content-items">
        {filteredContent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h4>אין תוכן זמין</h4>
            <p>
              {activeFilter === 'all' 
                ? 'לא נמצא תוכן עבור שיעור זה'
                : `לא נמצא תוכן מסוג ${activeFilter === 'summary' ? 'סיכומים' : 
                    activeFilter === 'memory_cards' ? 'כרטיסי זיכרון' :
                    activeFilter === 'test' ? 'מבחנים' : 'תמלול'} עבור שיעור זה`
              }
            </p>
          </div>
        ) : (
          filteredContent.map(item => (
            <div
              key={item.id}
              className="content-item"
              onClick={() => handleContentClick(item)}
            >
              <div className="content-item-icon" style={{ color: item.color }}>
                {item.icon}
              </div>
              <div className="content-item-info">
                <div className="content-item-header">
                  <h5>{item.title}</h5>
                  <div className="content-item-badges">
                    {item.isPublic && (
                      <span className="public-badge">ציבורי</span>
                    )}
                  </div>
                </div>
                <p className="content-item-description">{item.description}</p>
                <div className="content-item-meta">
                  {item.subjectArea && (
                    <span className="meta-tag">{item.subjectArea}</span>
                  )}
                  {item.gradeLevel && (
                    <span className="meta-tag">כיתה {item.gradeLevel}</span>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    item.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="meta-tag tag">{tag}</span>
                    ))
                  )}
                </div>
                <div className="content-item-date">
                  נוצר: {formatDate(item.createdAt)}
                </div>
              </div>
              <div className="content-item-arrow">
                ←
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .lesson-content-list {
          background: var(--color-surface, #ffffff);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem;
          border-bottom: 2px solid var(--color-border, #e9ecef);
          background: var(--color-surfaceHover, #f8f9fa);
        }

        .content-title h3 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary, #3498db);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .content-title p {
          margin: 0;
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 1rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          color: var(--color-textSecondary, #7f8c8d);
          cursor: pointer;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm, 4px);
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: var(--color-danger, #e74c3c);
          color: white;
        }

        .content-filters {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--color-border, #e9ecef);
          flex-wrap: wrap;
        }

        .filter-btn {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-btn:hover {
          border-color: var(--color-primary, #3498db);
          background: var(--color-primaryLight, #ebf3fd);
        }

        .filter-btn.active {
          background: var(--color-primary, #3498db);
          color: white;
          border-color: var(--color-primary, #3498db);
        }

        .content-items {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
        }

        .content-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--color-surface, #ffffff);
        }

        .content-item:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .content-item-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .content-item-info {
          flex: 1;
          min-width: 0;
        }

        .content-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          gap: 1rem;
        }

        .content-item-header h5 {
          margin: 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.1rem;
          font-weight: 600;
        }

        .content-item-badges {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .public-badge {
          background: var(--color-success, #27ae60);
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.7rem;
          font-weight: 500;
        }

        .content-item-description {
          color: var(--color-textSecondary, #7f8c8d);
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .content-item-meta {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-tag {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .meta-tag.tag {
          background: var(--color-info, #17a2b8);
          color: white;
          border-color: var(--color-info, #17a2b8);
        }

        .content-item-date {
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 0.8rem;
        }

        .content-item-arrow {
          font-size: 1.5rem;
          color: var(--color-textSecondary, #7f8c8d);
          flex-shrink: 0;
        }

        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--color-border, #e9ecef);
          border-top: 4px solid var(--color-primary, #3498db);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h4 {
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .lesson-content-list {
            max-width: 95vw;
            max-height: 95vh;
          }

          .content-header {
            padding: 1rem;
          }

          .content-filters {
            padding: 0.5rem 1rem;
          }

          .filter-btn {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }

          .content-items {
            padding: 0.5rem 1rem;
          }

          .content-item {
            padding: 0.8rem;
          }

          .content-item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LessonContentList;
