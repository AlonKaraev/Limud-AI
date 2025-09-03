import React, { useState, useEffect } from 'react';
import SummaryForm from './SummaryForm';

const SummariesManager = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSummaryForm, setShowSummaryForm] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [previewingSummary, setPreviewingSummary] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'manual', 'lesson'
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total_summaries: 0,
    manual_summaries: 0,
    lesson_summaries: 0,
    public_summaries: 0
  });

  useEffect(() => {
    loadSummaries();
    loadStats();
  }, [filterType, searchTerm]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      params.append('limit', '50');
      params.append('sort', 'created_at');
      params.append('order', 'desc');

      const response = await fetch(`/api/summaries?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('אין הרשאה. אנא התחבר מחדש למערכת.');
        }
        throw new Error(`שגיאה בטעינת הסיכומים: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSummaries(data.summaries || []);
        setError(null);
      } else {
        throw new Error(data.error || 'שגיאה בטעינת הסיכומים');
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
      setError(error.message);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/summaries/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats({
            total_summaries: data.total_summaries || 0,
            manual_summaries: data.manual_summaries || 0,
            lesson_summaries: data.lesson_summaries || 0,
            public_summaries: data.public_summaries || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading summary statistics:', error);
    }
  };

  const handleCreateSummary = () => {
    setShowSummaryForm(true);
  };

  const handleSummaryCreated = (newSummary) => {
    // Refresh the summaries list and stats
    loadSummaries();
    loadStats();
    // Hide the form and reset editing state
    setShowSummaryForm(false);
    setEditingSummary(null);
  };

  const handleCancelSummaryCreation = () => {
    setShowSummaryForm(false);
    setEditingSummary(null);
  };

  const handleEditSummary = (summaryId) => {
    const summary = summaries.find(s => s.id === summaryId);
    if (summary && summary.summary_type === 'manual') {
      setEditingSummary(summary);
      setShowSummaryForm(true);
    } else {
      alert('ניתן לערוך רק סיכומים ידניים.');
    }
  };

  const handlePreviewSummary = (summary) => {
    setPreviewingSummary(summary);
  };

  const handleClosePreview = () => {
    setPreviewingSummary(null);
  };

  const handleDeleteSummary = async (summaryId) => {
    const summary = summaries.find(s => s.id === summaryId);
    
    // Only allow deletion of manual summaries
    if (summary && summary.summary_type !== 'manual') {
      alert('ניתן למחוק רק סיכומים ידניים. סיכומי שיעורים נוצרים אוטומטית ולא ניתן למחוק אותם.');
      return;
    }

    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הסיכום?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      const response = await fetch(`/api/summaries/${summaryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה במחיקת הסיכום');
      }

      // Refresh the summaries list and stats
      loadSummaries();
      loadStats();
      
      console.log('Summary deleted successfully');
    } catch (error) {
      console.error('Error deleting summary:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>טוען סיכומים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <span className="error-icon">⚠</span>
        <p>שגיאה: {error}</p>
      </div>
    );
  }

  return (
    <div className="summaries-manager">
      <div className="summaries-header">
        <div className="summaries-title">
          <h2>📝 מנהל סיכומים</h2>
          <p>נהל וצור סיכומי שיעורים עם תמיכה מלאה בעברית</p>
        </div>
        <div className="summaries-actions">
          <button 
            className="btn btn-primary"
            data-action="create-summary"
            onClick={handleCreateSummary}
          >
            + צור סיכום חדש
          </button>
        </div>
      </div>

      {/* Statistics and Filters */}
      <div className="summaries-controls">
        <div className="summaries-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.total_summaries}</span>
            <span className="stat-label">סה"כ סיכומים</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.manual_summaries}</span>
            <span className="stat-label">סיכומים ידניים</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.lesson_summaries}</span>
            <span className="stat-label">סיכומי שיעורים</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.public_summaries}</span>
            <span className="stat-label">סיכומים ציבוריים</span>
          </div>
        </div>

        <div className="summaries-filters">
          <div className="filter-group">
            <label>סינון לפי סוג:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">כל הסיכומים</option>
              <option value="manual">סיכומים ידניים</option>
              <option value="lesson">סיכומי שיעורים</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>חיפוש:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש בכותרת או תוכן..."
              className="search-input"
            />
          </div>
        </div>
      </div>
      
      <div className="summaries-content">
        {summaries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>אין לך סיכומים עדיין</h3>
            <p>צור את הסיכום הראשון שלך כדי להתחיל לארגן את החומר הלימודי</p>
            <button 
              className="btn btn-primary"
              onClick={handleCreateSummary}
            >
              צור סיכום ראשון
            </button>
          </div>
        ) : (
          <div className="summaries-list">
            {summaries.map(summary => (
              <div key={summary.id} className="summary-item">
                <div className="summary-header">
                  <div className="summary-title-row">
                    <h3>{summary.title}</h3>
                    <div className="summary-type-badge">
                      {summary.summary_type === 'manual' ? '✍️ ידני' : 
                       summary.summary_type === 'lesson' ? '🎓 שיעור' : '🤖 AI'}
                    </div>
                  </div>
                  <div className="summary-meta">
                    {summary.subject_area && <span className="summary-subject">{summary.subject_area}</span>}
                    {summary.grade_level && <span className="summary-grade">כיתה {summary.grade_level}</span>}
                    {summary.source_title && (
                      <span className="summary-source">מקור: {summary.source_title}</span>
                    )}
                  </div>
                </div>
                <div className="summary-content-preview">
                  {summary.content && summary.content.length > 150 
                    ? `${summary.content.substring(0, 150)}...` 
                    : summary.content}
                </div>
                {summary.tags && Array.isArray(summary.tags) && summary.tags.length > 0 && (
                  <div className="summary-tags">
                    {summary.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="summary-footer">
                  <div className="summary-info">
                    {summary.is_public && <span className="public-badge">ציבורי</span>}
                    {summary.ai_provider && (
                      <span className="ai-badge">AI: {summary.ai_provider}</span>
                    )}
                    <span className="summary-date">
                      {summary.created_at && new Date(summary.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  <div className="summary-actions">
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => handlePreviewSummary(summary)}
                      title="הצג סיכום מלא"
                    >
                      תצוגה מקדימה
                    </button>
                    {summary.summary_type === 'manual' && (
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditSummary(summary.id)}
                      >
                        עריכה
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteSummary(summary.id)}
                      disabled={summary.summary_type !== 'manual'}
                      title={summary.summary_type !== 'manual' ? 'ניתן למחוק רק סיכומים ידניים' : 'מחק סיכום'}
                    >
                      מחיקה
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Creation Modal */}
      {showSummaryForm && (
        <div className="modal-overlay" onClick={handleCancelSummaryCreation}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <SummaryForm
              editingSummary={editingSummary}
              onSummaryCreated={handleSummaryCreated}
              onCancel={handleCancelSummaryCreation}
            />
          </div>
        </div>
      )}

      {/* Summary Preview Modal */}
      {previewingSummary && (
        <div className="modal-overlay" onClick={handleClosePreview}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div className="preview-title-section">
                <h2>{previewingSummary.title}</h2>
                <div className="preview-badges">
                  <span className={`preview-type-badge ${previewingSummary.summary_type}`}>
                    {previewingSummary.summary_type === 'manual' ? '✍️ ידני' : 
                     previewingSummary.summary_type === 'lesson' ? '🎓 שיעור' : '🤖 AI'}
                  </span>
                  {previewingSummary.is_public && <span className="preview-public-badge">ציבורי</span>}
                </div>
              </div>
              <button 
                className="preview-close-button"
                onClick={handleClosePreview}
                aria-label="סגור"
              >
                ×
              </button>
            </div>

            <div className="preview-meta">
              {previewingSummary.subject_area && (
                <div className="preview-meta-item">
                  <strong>תחום לימוד:</strong> {previewingSummary.subject_area}
                </div>
              )}
              {previewingSummary.grade_level && (
                <div className="preview-meta-item">
                  <strong>רמת כיתה:</strong> כיתה {previewingSummary.grade_level}
                </div>
              )}
              {previewingSummary.source_title && (
                <div className="preview-meta-item">
                  <strong>מקור:</strong> {previewingSummary.source_title}
                </div>
              )}
              {previewingSummary.created_at && (
                <div className="preview-meta-item">
                  <strong>תאריך יצירה:</strong> {new Date(previewingSummary.created_at).toLocaleDateString('he-IL')}
                </div>
              )}
              {previewingSummary.updated_at && previewingSummary.updated_at !== previewingSummary.created_at && (
                <div className="preview-meta-item">
                  <strong>עודכן לאחרונה:</strong> {new Date(previewingSummary.updated_at).toLocaleDateString('he-IL')}
                </div>
              )}
            </div>

            {previewingSummary.tags && Array.isArray(previewingSummary.tags) && previewingSummary.tags.length > 0 && (
              <div className="preview-tags">
                <strong>תגיות:</strong>
                <div className="preview-tags-list">
                  {previewingSummary.tags.map((tag, index) => (
                    <span key={index} className="preview-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="preview-content">
              <h3>תוכן הסיכום</h3>
              <div className="preview-content-text">
                {previewingSummary.content ? 
                  previewingSummary.content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  )) : 
                  <p className="no-content">אין תוכן זמין</p>
                }
              </div>
            </div>

            <div className="preview-actions">
              {previewingSummary.summary_type === 'manual' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    handleClosePreview();
                    handleEditSummary(previewingSummary.id);
                  }}
                >
                  ערוך סיכום
                </button>
              )}
              <button 
                className="btn btn-secondary"
                onClick={handleClosePreview}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .summaries-manager {
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-container {
          text-align: center;
          padding: 3rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--color-border, #e9ecef);
          border-top: 4px solid var(--color-primary, #3498db);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-container {
          text-align: center;
          padding: 2rem;
          background: #f8d7da;
          color: #721c24;
          border-radius: var(--radius-md, 8px);
          border: 1px solid #f5c6cb;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .error-icon {
          font-size: 2rem;
        }

        .summaries-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .summaries-actions {
          display: flex;
          gap: 0.5rem;
        }

        .summaries-controls {
          background: var(--color-surfaceHover, #f8f9fa);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .summaries-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
          background: var(--color-surface, #ffffff);
          border-radius: var(--radius-sm, 4px);
          border: 1px solid var(--color-border, #e9ecef);
        }

        .stat-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary, #3498db);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--color-textSecondary, #7f8c8d);
          font-weight: 500;
        }

        .summaries-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-weight: 500;
          color: var(--color-text, #2c3e50);
          font-size: 0.9rem;
        }

        .filter-select,
        .search-input {
          padding: 0.5rem;
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-sm, 4px);
          font-family: 'Heebo', sans-serif;
          background: var(--color-surface, #ffffff);
        }

        .filter-select:focus,
        .search-input:focus {
          outline: none;
          border-color: var(--color-primary, #3498db);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }

        .search-input {
          direction: rtl;
        }

        .summaries-title h2 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary, #3498db);
          font-size: 1.8rem;
        }

        .summaries-title p {
          margin: 0;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .summaries-content {
          background: var(--color-surface, #ffffff);
          border-radius: var(--radius-lg, 12px);
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .summaries-list {
          display: grid;
          gap: 1.5rem;
        }

        .summary-item {
          background: var(--color-surfaceHover, #f8f9fa);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .summary-item:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .summary-header {
          margin-bottom: 1rem;
        }

        .summary-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .summary-header h3 {
          margin: 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.3rem;
          line-height: 1.4;
          flex: 1;
        }

        .summary-type-badge {
          background: var(--color-primary, #3498db);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .summary-type-badge:has-text("🎓 שיעור") {
          background: var(--color-success, #27ae60);
        }

        .summary-type-badge:has-text("🤖 AI") {
          background: var(--color-warning, #f39c12);
        }

        .summary-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .summary-subject,
        .summary-grade,
        .summary-source {
          background: var(--color-primary, #3498db);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          font-weight: 500;
        }

        .summary-grade {
          background: var(--color-textSecondary, #7f8c8d);
        }

        .summary-source {
          background: var(--color-success, #27ae60);
        }

        .ai-badge {
          background: var(--color-warning, #f39c12);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          font-weight: 500;
        }

        .summary-content-preview {
          color: var(--color-text, #2c3e50);
          line-height: 1.6;
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }

        .summary-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .tag {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .summary-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border, #e9ecef);
        }

        .summary-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .public-badge {
          background: #28a745;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          font-weight: 500;
        }

        .summary-date {
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 0.9rem;
        }

        .summary-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: var(--radius-md, 8px);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: var(--color-primary, #3498db);
          color: white;
        }

        .btn-primary:hover {
          background: #2980b9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .btn-outline {
          background: transparent;
          color: var(--color-primary, #3498db);
          border: 2px solid var(--color-primary, #3498db);
        }

        .btn-outline:hover {
          background: var(--color-primary, #3498db);
          color: white;
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c0392b;
        }

        .btn-info {
          background: #17a2b8;
          color: white;
        }

        .btn-info:hover {
          background: #138496;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
        }

        .btn-secondary {
          background: var(--color-textSecondary, #7f8c8d);
          color: white;
        }

        .btn-secondary:hover {
          background: #6c757d;
          transform: translateY(-1px);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn:disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--color-background, #f8f9fa);
          border-radius: var(--radius-lg, 12px);
          max-width: 95vw;
          max-height: 95vh;
          width: 100%;
          max-width: 900px;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 768px) {
          .summaries-manager {
            padding: 1rem;
          }

          .summaries-header {
            flex-direction: column;
            align-items: stretch;
          }

          .summary-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .summary-actions {
            justify-content: stretch;
          }

          .btn {
            flex: 1;
          }

          .modal-content {
            max-width: 100vw;
            max-height: 100vh;
            border-radius: 0;
            margin: 0;
          }

          .modal-overlay {
            padding: 0;
          }
        }

        /* Preview Modal Styles */
        .preview-modal {
          max-width: 1000px;
          background: var(--color-surface, #ffffff);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 2rem 2rem 1rem 2rem;
          border-bottom: 2px solid var(--color-border, #e9ecef);
          gap: 1rem;
        }

        .preview-title-section {
          flex: 1;
        }

        .preview-header h2 {
          margin: 0 0 1rem 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.8rem;
          line-height: 1.3;
        }

        .preview-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .preview-type-badge {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md, 8px);
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
        }

        .preview-type-badge.manual {
          background: var(--color-primary, #3498db);
        }

        .preview-type-badge.lesson {
          background: var(--color-success, #27ae60);
        }

        .preview-type-badge.ai {
          background: var(--color-warning, #f39c12);
        }

        .preview-public-badge {
          background: #28a745;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md, 8px);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .preview-close-button {
          background: none;
          border: none;
          font-size: 2.5rem;
          color: var(--color-textSecondary, #7f8c8d);
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
          border-radius: var(--radius-md, 8px);
          transition: all 0.3s ease;
          width: 3rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .preview-close-button:hover {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          transform: scale(1.1);
        }

        .preview-meta {
          padding: 1.5rem 2rem;
          background: var(--color-surfaceHover, #f8f9fa);
          border-bottom: 1px solid var(--color-border, #e9ecef);
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .preview-meta-item {
          color: var(--color-text, #2c3e50);
          font-size: 0.95rem;
        }

        .preview-meta-item strong {
          color: var(--color-primary, #3498db);
          margin-left: 0.5rem;
        }

        .preview-tags {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--color-border, #e9ecef);
        }

        .preview-tags strong {
          color: var(--color-primary, #3498db);
          margin-bottom: 0.5rem;
          display: block;
        }

        .preview-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .preview-tag {
          background: var(--color-primary, #3498db);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md, 8px);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .preview-content {
          padding: 2rem;
        }

        .preview-content h3 {
          margin: 0 0 1.5rem 0;
          color: var(--color-primary, #3498db);
          font-size: 1.4rem;
          border-bottom: 2px solid var(--color-border, #e9ecef);
          padding-bottom: 0.5rem;
        }

        .preview-content-text {
          line-height: 1.8;
          font-size: 1rem;
          color: var(--color-text, #2c3e50);
        }

        .preview-content-text p {
          margin-bottom: 1rem;
        }

        .preview-content-text p:last-child {
          margin-bottom: 0;
        }

        .no-content {
          color: var(--color-textSecondary, #7f8c8d);
          font-style: italic;
          text-align: center;
          padding: 2rem;
        }

        .preview-actions {
          padding: 1.5rem 2rem;
          border-top: 2px solid var(--color-border, #e9ecef);
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          background: var(--color-surfaceHover, #f8f9fa);
        }

        @media (max-width: 768px) {
          .preview-header {
            padding: 1.5rem 1rem 1rem 1rem;
            flex-direction: column;
            align-items: stretch;
          }

          .preview-close-button {
            align-self: flex-end;
            margin-top: -1rem;
          }

          .preview-meta {
            padding: 1rem;
            grid-template-columns: 1fr;
          }

          .preview-tags {
            padding: 1rem;
          }

          .preview-content {
            padding: 1.5rem 1rem;
          }

          .preview-actions {
            padding: 1rem;
            flex-direction: column;
          }

          .preview-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SummariesManager;
