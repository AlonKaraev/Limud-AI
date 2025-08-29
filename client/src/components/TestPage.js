import React, { useState, useEffect, useCallback } from 'react';
import { heTranslations } from '../translations';
import QuestionDisplay from './QuestionDisplay';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import '../styles/theme.css';
import '../styles/components.css';
import './StudentPortal.css';
import './TestInterface.css';

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

// Test Summary Component
const TestSummary = ({ questions, answers, onSubmit, onContinue, isSubmitting }) => {
  const answeredCount = Object.keys(answers).length;
  const unansweredQuestions = questions
    .map((q, index) => ({ question: q, index: index + 1 }))
    .filter((_, index) => !answers[index]);

  return (
    <div className="test-summary">
      <div className="summary-header">
        <h2>סיכום המבחן</h2>
        <p>בדוק את תשובותיך לפני השליחה</p>
      </div>
      
      <div className="summary-stats">
        <div className="stat-item">
          <span className="stat-number">{answeredCount}</span>
          <span className="stat-label">שאלות נענו</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{questions.length - answeredCount}</span>
          <span className="stat-label">שאלות לא נענו</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{questions.length}</span>
          <span className="stat-label">סה"כ שאלות</span>
        </div>
      </div>
      
      {unansweredQuestions.length > 0 && (
        <div className="unanswered-warning">
          <h3>שאלות שלא נענו:</h3>
          <div className="unanswered-list">
            {unansweredQuestions.map(({ index }) => (
              <span key={index} className="unanswered-question">
                שאלה {index}
              </span>
            ))}
          </div>
          <p className="warning-text">
            האם אתה בטוח שברצונך לשלוח את המבחן ללא מענה לשאלות אלו?
          </p>
        </div>
      )}
      
      <div className="summary-actions">
        <button 
          className="btn btn-outline"
          onClick={onContinue}
          disabled={isSubmitting}
        >
          המשך עריכה
        </button>
        <button 
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              שולח מבחן...
              <div className="loading-spinner loading-spinner-small"></div>
            </>
          ) : (
            t('student.submitTest')
          )}
        </button>
      </div>
    </div>
  );
};

// Main Test Page Component - Following LessonViewer pattern
const TestPage = ({ 
  recordingId, 
  testData: preloadedTestData,
  onClose, 
  onTestComplete 
}) => {
  // State management
  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startTime] = useState(Date.now());

  // API service for test operations
  const apiService = {
    async getTest(recordingId) {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/lesson/${recordingId}/test`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `שגיאת שרת ${response.status}`);
      }

      return await response.json();
    },

    async submitTest(testId, answers, timeSpent) {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/test/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers,
          timeSpent,
          submittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `שגיאת שרת ${response.status}`);
      }

      return await response.json();
    }
  };

  // Load test data
  const loadTestData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiService.getTest(recordingId);
      
      if (!data.test || !data.questions || data.questions.length === 0) {
        throw new Error('לא נמצאו שאלות עבור מבחן זה');
      }

      setTestData(data.test);
      setQuestions(data.questions);
      
      // Set timer if test has time limit
      if (data.test.estimated_duration) {
        setTimeRemaining(data.test.estimated_duration * 60); // Convert to seconds
      }
      
    } catch (error) {
      console.error('Error loading test:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit when time runs out
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Load test data on mount or use preloaded data
  useEffect(() => {
    if (preloadedTestData) {
      // Use preloaded test data (for demo)
      setTestData(preloadedTestData.test);
      setQuestions(preloadedTestData.questions);
      
      // Set timer if test has time limit
      if (preloadedTestData.test.timeLimit) {
        setTimeRemaining(preloadedTestData.test.timeLimit * 60); // Convert to seconds
      }
      
      setLoading(false);
    } else if (recordingId) {
      // Load from API
      loadTestData();
    } else {
      setError(new Error('לא סופק מזהה מבחן או נתוני מבחן'));
      setLoading(false);
    }
  }, [preloadedTestData, recordingId, loadTestData]);

  // Navigation handlers
  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const handleQuestionJump = useCallback((questionNumber) => {
    const index = questionNumber - 1;
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  }, [questions.length]);

  // Answer handling
  const handleAnswerChange = useCallback((answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  }, [currentQuestionIndex]);

  // Test submission
  const handleSubmitTest = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // For demo tests, just simulate submission
      if (preloadedTestData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = {
          success: true,
          score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
          timeSpent,
          answeredQuestions: Object.keys(answers).length,
          totalQuestions: questions.length
        };
        
        if (onTestComplete) {
          onTestComplete(result);
        } else {
          alert(`מבחן הדגמה הושלם בהצלחה!\nציון: ${result.score}\nזמן: ${Math.floor(timeSpent / 60)} דקות`);
          onClose();
        }
      } else {
        // Real test submission
        const result = await apiService.submitTest(testData.id, answers, timeSpent);
        
        if (onTestComplete) {
          onTestComplete(result);
        } else {
          alert('המבחן נשלח בהצלחה!');
          onClose();
        }
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert(error.message || 'שגיאה בשליחת המבחן');
    } finally {
      setIsSubmitting(false);
    }
  }, [testData, answers, startTime, onTestComplete, onClose, preloadedTestData, questions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            setActiveTab('summary');
            break;
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get answered questions set
  const answeredQuestions = new Set(
    Object.keys(answers).map(key => parseInt(key))
  );

  // Loading state
  if (loading) {
    return (
      <div className="lesson-viewer-overlay">
        <div className="lesson-viewer-modal">
          <LoadingSpinner 
            fullScreen 
            message="טוען מבחן..."
            size="large"
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="lesson-viewer-overlay">
        <div className="lesson-viewer-modal">
          <div className="lesson-viewer-header">
            <h2>שגיאה</h2>
            <button className="btn btn-secondary" onClick={onClose}>
              סגור
            </button>
          </div>
          <ErrorMessage 
            error={error}
            onRetry={loadTestData}
            type="error"
          />
        </div>
      </div>
    );
  }

  // No questions state
  if (!questions.length) {
    return (
      <div className="lesson-viewer-overlay">
        <div className="lesson-viewer-modal">
          <div className="lesson-viewer-header">
            <h2>מבחן ריק</h2>
            <button className="btn btn-secondary" onClick={onClose}>
              סגור
            </button>
          </div>
          <div className="lesson-content">
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-title">אין שאלות במבחן</div>
              <div className="empty-description">
                המבחן לא מכיל שאלות או שהן לא נטענו כראוי
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <ErrorBoundary fallbackMessage="שגיאה בטעינת המבחן">
      <div className="lesson-viewer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="lesson-viewer-modal" dir="rtl">
          {/* Header - Following LessonViewer pattern */}
          <header className="lesson-viewer-header">
            <div className="lesson-header-content">
              <h2 className="lesson-title">
                {testData?.title || testData?.set_name || 'מבחן'}
              </h2>
              <div className="lesson-meta">
                <span className="lesson-date">
                  {testData?.subject || 'כללי'}
                </span>
                <span className="lesson-duration">
                  {questions.length} שאלות
                </span>
                {testData?.estimatedDuration && (
                  <span className="lesson-duration">
                    זמן משוער: {testData.estimatedDuration} דקות
                  </span>
                )}
                {timeRemaining && (
                  <span className="lesson-duration" style={{ 
                    color: timeRemaining < 300 ? 'var(--color-error)' : 'var(--color-success)',
                    fontWeight: 'bold'
                  }}>
                    זמן נותר: {formatTime(timeRemaining)}
                  </span>
                )}
              </div>
            </div>
            <button 
              className="btn btn-secondary close-btn"
              onClick={onClose}
              aria-label="סגור מבחן"
            >
              ✕
            </button>
          </header>

          {/* Navigation Tabs - Following LessonViewer pattern */}
          <nav className="lesson-tabs">
            <button 
              className={`lesson-tab ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
              aria-selected={activeTab === 'questions'}
            >
              שאלות ({answeredQuestions.size}/{questions.length})
            </button>
            <button 
              className={`lesson-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
              aria-selected={activeTab === 'summary'}
            >
              סיכום המבחן
            </button>
            {testData?.description && (
              <button 
                className={`lesson-tab ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
                aria-selected={activeTab === 'info'}
              >
                מידע על המבחן
              </button>
            )}
          </nav>

          {/* Content - Following LessonViewer pattern */}
          <main className="lesson-content">
            {activeTab === 'questions' && (
              <div className="lesson-section">
                <QuestionDisplay
                  question={currentQuestion}
                  questionIndex={currentQuestionIndex + 1}
                  totalQuestions={questions.length}
                  selectedAnswer={answers[currentQuestionIndex] || ''}
                  onAnswerChange={handleAnswerChange}
                  onPrevious={handlePreviousQuestion}
                  onNext={handleNextQuestion}
                  onQuestionJump={handleQuestionJump}
                  answeredQuestions={answeredQuestions}
                />
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="lesson-section">
                <TestSummary
                  questions={questions}
                  answers={answers}
                  onSubmit={handleSubmitTest}
                  onContinue={() => setActiveTab('questions')}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {activeTab === 'info' && testData?.description && (
              <div className="lesson-section">
                <h3>מידע על המבחן</h3>
                <div className="lesson-text">
                  <p>{testData.description}</p>
                </div>
                
                <div className="test-info-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginTop: '1.5rem'
                }}>
                  <div className="info-card" style={{
                    padding: '1rem',
                    background: 'var(--color-backgroundSecondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>
                      מספר שאלות
                    </h4>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                      {questions.length}
                    </p>
                  </div>
                  
                  {testData.estimatedDuration && (
                    <div className="info-card" style={{
                      padding: '1rem',
                      background: 'var(--color-backgroundSecondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)'
                    }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>
                        זמן משוער
                      </h4>
                      <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {testData.estimatedDuration} דקות
                      </p>
                    </div>
                  )}
                  
                  <div className="info-card" style={{
                    padding: '1rem',
                    background: 'var(--color-backgroundSecondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>
                      התקדמות
                    </h4>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                      {Math.round((answeredQuestions.size / questions.length) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Footer Actions - Following LessonViewer pattern */}
          <footer className="lesson-viewer-footer">
            <div className="lesson-actions">
              <button className="btn btn-outline" onClick={onClose}>
                שמור וצא
              </button>
              {activeTab === 'questions' && (
                <button 
                  className="btn btn-success"
                  onClick={() => setActiveTab('summary')}
                  disabled={answeredQuestions.size === 0}
                >
                  סיים מבחן
                </button>
              )}
              {activeTab === 'summary' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('questions')}
                >
                  חזור לשאלות
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TestPage;
