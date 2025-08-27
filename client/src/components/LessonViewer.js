import React, { useState, useEffect } from 'react';
import { heTranslations } from '../translations';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import './StudentPortal.css';

// Translation helper
const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const t = (key, params = {}) => {
  let translation = getNestedTranslation(heTranslations, key) || key;
  
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{{${param}}}`, params[param]);
  });
  
  return translation;
};

const LessonViewer = ({ lesson, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetchLessonDetails();
  }, [lesson.recording_id]);

  const fetchLessonDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/lesson/${lesson.recording_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLessonData(data.lesson);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה בטעינת השיעור');
      }
    } catch (error) {
      console.error('Lesson fetch error:', error);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (metadata) => {
    if (metadata?.duration) {
      const minutes = Math.floor(metadata.duration / 60);
      const seconds = metadata.duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return 'לא ידוע';
  };

  const downloadTranscript = () => {
    if (lessonData?.transcription_text) {
      const blob = new Blob([lessonData.transcription_text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lessonData.filename}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="lesson-viewer-overlay">
        <div className="lesson-viewer-modal">
          <LoadingSpinner message={t('student.loadingLessons')} size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-viewer-overlay">
        <div className="lesson-viewer-modal">
          <div className="lesson-viewer-header">
            <h2>שגיאה</h2>
            <button className="btn btn-secondary" onClick={onClose}>
              {t('accessibility.close')}
            </button>
          </div>
          <ErrorMessage error={error} onRetry={fetchLessonDetails} />
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-viewer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lesson-viewer-modal">
        {/* Header */}
        <header className="lesson-viewer-header">
          <div className="lesson-header-content">
            <h2 className="lesson-title">{lessonData.filename}</h2>
            <div className="lesson-meta">
              <span className="lesson-date">{formatDate(lessonData.created_at)}</span>
              <span className="lesson-duration">{formatDuration(lessonData.metadata)}</span>
            </div>
          </div>
          <button 
            className="btn btn-secondary close-btn"
            onClick={onClose}
            aria-label={t('accessibility.close')}
          >
            ✕
          </button>
        </header>

        {/* Navigation Tabs */}
        <nav className="lesson-tabs">
          <button 
            className={`lesson-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
            aria-selected={activeTab === 'summary'}
          >
            {t('student.summary')}
          </button>
          <button 
            className={`lesson-tab ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
            aria-selected={activeTab === 'transcript'}
            disabled={!lessonData.transcription_text}
          >
            {t('student.transcript')}
          </button>
          <button 
            className={`lesson-tab ${activeTab === 'topics' ? 'active' : ''}`}
            onClick={() => setActiveTab('topics')}
            aria-selected={activeTab === 'topics'}
            disabled={!lessonData.key_topics || lessonData.key_topics.length === 0}
          >
            {t('student.keyTopics')}
          </button>
        </nav>

        {/* Content */}
        <main className="lesson-content">
          {activeTab === 'summary' && (
            <div className="lesson-section">
              <h3>{t('student.summary')}</h3>
              {lessonData.summary_text ? (
                <div className="lesson-text">
                  <p>{lessonData.summary_text}</p>
                </div>
              ) : (
                <div className="empty-content">
                  <p>אין סיכום זמין עבור שיעור זה</p>
                </div>
              )}
              
              {lessonData.learning_objectives && lessonData.learning_objectives.length > 0 && (
                <div className="learning-objectives">
                  <h4>{t('student.learningObjectives')}</h4>
                  <ul>
                    {lessonData.learning_objectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="lesson-section">
              <div className="section-header">
                <h3>{t('student.transcript')}</h3>
                {lessonData.transcription_text && (
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={downloadTranscript}
                  >
                    {t('student.downloadTranscript')}
                  </button>
                )}
              </div>
              {lessonData.transcription_text ? (
                <div className="lesson-text transcript-text">
                  <pre>{lessonData.transcription_text}</pre>
                </div>
              ) : (
                <div className="empty-content">
                  <p>אין תמליל זמין עבור שיעור זה</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'topics' && (
            <div className="lesson-section">
              <h3>{t('student.keyTopics')}</h3>
              {lessonData.key_topics && lessonData.key_topics.length > 0 ? (
                <div className="topics-grid">
                  {lessonData.key_topics.map((topic, index) => (
                    <div key={index} className="topic-card">
                      <h4>{topic.title || topic}</h4>
                      {topic.description && <p>{topic.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-content">
                  <p>אין נושאים מרכזיים זמינים עבור שיעור זה</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer Actions */}
        <footer className="lesson-viewer-footer">
          <div className="lesson-actions">
            <button className="btn btn-outline" onClick={onClose}>
              {t('forms.cancel')}
            </button>
            {lessonData.transcription_text && (
              <button className="btn btn-primary" onClick={downloadTranscript}>
                {t('student.downloadTranscript')}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LessonViewer;
