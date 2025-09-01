import React, { useState, useEffect } from 'react';
import { heTranslations } from '../translations';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import CardGenerationInterface from './CardGenerationInterface';
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
  const [showCardGeneration, setShowCardGeneration] = useState(false);
  const [cardGenerationSuccess, setCardGenerationSuccess] = useState(null);

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

  const handleGenerateCards = () => {
    setShowCardGeneration(true);
  };

  const handleCardGenerationClose = () => {
    setShowCardGeneration(false);
    setCardGenerationSuccess(null);
  };

  const handleCardsGenerated = (result) => {
    setCardGenerationSuccess(result);
    setShowCardGeneration(false);
    
    // Show success message for a few seconds
    setTimeout(() => {
      setCardGenerationSuccess(null);
    }, 5000);
  };

  const canGenerateCards = () => {
    return lessonData?.transcription_text && lessonData.transcription_text.trim().length >= 100;
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
          {/* Success notification */}
          {cardGenerationSuccess && (
            <div className="card-generation-success">
              <div className="success-message">
                <span className="success-icon">✅</span>
                <span className="success-text">
                  {cardGenerationSuccess.cardsAdded} כרטיסים נוצרו ונשמרו בסט "{cardGenerationSuccess.setName}"
                </span>
              </div>
            </div>
          )}
          
          <div className="lesson-actions">
            <button className="btn btn-outline" onClick={onClose}>
              {t('forms.cancel')}
            </button>
            
            {canGenerateCards() && (
              <button 
                className="btn btn-success" 
                onClick={handleGenerateCards}
                title="צור כרטיסי זיכרון מהשיעור"
              >
                🎴 צור כרטיסים
              </button>
            )}
            
            {lessonData.transcription_text && (
              <button className="btn btn-primary" onClick={downloadTranscript}>
                {t('student.downloadTranscript')}
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* Card Generation Interface */}
      {showCardGeneration && (
        <CardGenerationInterface
          recordingId={lesson.recording_id}
          onClose={handleCardGenerationClose}
          onCardsGenerated={handleCardsGenerated}
          initialConfig={{
            subjectArea: lessonData.subject_area || '',
            gradeLevel: lessonData.grade_level || ''
          }}
        />
      )}

      <style jsx>{`
        .card-generation-success {
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(39, 174, 96, 0.05) 100%);
          border: 1px solid rgba(39, 174, 96, 0.2);
          border-radius: 8px;
          animation: slideIn 0.3s ease-out;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #27ae60;
          font-weight: 600;
        }

        .success-icon {
          font-size: 1.2rem;
        }

        .success-text {
          font-size: 0.9rem;
        }

        .btn-success {
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 6px rgba(39, 174, 96, 0.3);
        }

        .btn-success:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(39, 174, 96, 0.4);
        }

        .btn-success:active {
          transform: translateY(0);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .lesson-actions {
            flex-direction: column;
            gap: 0.75rem;
          }

          .btn-success,
          .btn-primary,
          .btn-outline {
            width: 100%;
            justify-content: center;
          }

          .card-generation-success {
            margin-bottom: 0.75rem;
            padding: 0.5rem 0.75rem;
          }

          .success-text {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LessonViewer;
