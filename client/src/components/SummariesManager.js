import React, { useState, useEffect } from 'react';
import SummaryForm from './SummaryForm';

const SummariesManager = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSummaryForm, setShowSummaryForm] = useState(false);

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      // Load summaries from localStorage
      const storedSummaries = localStorage.getItem('limud-ai-summaries');
      if (storedSummaries) {
        const parsedSummaries = JSON.parse(storedSummaries);
        setSummaries(parsedSummaries);
      } else {
        setSummaries([]);
      }
      setError(null);
    } catch (error) {
      console.error('Error loading summaries from localStorage:', error);
      setError('שגיאה בטעינת הסיכומים');
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSummary = () => {
    setShowSummaryForm(true);
  };

  const handleSummaryCreated = (newSummary) => {
    // Add the new summary to the list
    setSummaries(prev => [newSummary, ...prev]);
    // Hide the form
    setShowSummaryForm(false);
  };

  const handleCancelSummaryCreation = () => {
    setShowSummaryForm(false);
  };

  const handleEditSummary = (summaryId) => {
    // TODO: Implement summary editing logic
    console.log('Edit summary:', summaryId);
  };

  const saveSummariesToStorage = (summariesList) => {
    try {
      localStorage.setItem('limud-ai-summaries', JSON.stringify(summariesList));
    } catch (error) {
      console.error('Error saving summaries to localStorage:', error);
      setError('שגיאה בשמירת הסיכומים');
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הסיכום?')) {
      return;
    }

    try {
      // Remove the summary from the list
      const updatedSummaries = summaries.filter(summary => summary.id !== summaryId);
      setSummaries(updatedSummaries);
      
      // Update localStorage
      saveSummariesToStorage(updatedSummaries);
      
      console.log('Summary deleted successfully');
    } catch (error) {
      console.error('Error deleting summary:', error);
      setError('שגיאה במחיקת הסיכום');
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
        <button 
          className="btn btn-primary"
          onClick={handleCreateSummary}
        >
          + צור סיכום חדש
        </button>
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
                  <h3>{summary.title}</h3>
                  <div className="summary-meta">
                    {summary.subjectArea && <span className="summary-subject">{summary.subjectArea}</span>}
                    {summary.gradeLevel && <span className="summary-grade">כיתה {summary.gradeLevel}</span>}
                  </div>
                </div>
                <div className="summary-content-preview">
                  {summary.content && summary.content.length > 150 
                    ? `${summary.content.substring(0, 150)}...` 
                    : summary.content}
                </div>
                {summary.tags && summary.tags.length > 0 && (
                  <div className="summary-tags">
                    {summary.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="summary-footer">
                  <div className="summary-info">
                    {summary.isPublic && <span className="public-badge">ציבורי</span>}
                    <span className="summary-date">
                      {summary.createdAt && new Date(summary.createdAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  <div className="summary-actions">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleEditSummary(summary.id)}
                    >
                      עריכה
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteSummary(summary.id)}
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
              onSummaryCreated={handleSummaryCreated}
              onCancel={handleCancelSummaryCreation}
            />
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
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
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

        .summary-header h3 {
          margin: 0 0 0.5rem 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.3rem;
          line-height: 1.4;
        }

        .summary-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .summary-subject,
        .summary-grade {
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

        .btn-danger:hover {
          background: #c0392b;
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
      `}</style>
    </div>
  );
};

export default SummariesManager;
