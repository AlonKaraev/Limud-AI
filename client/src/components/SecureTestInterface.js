import React, { useState, useEffect, useCallback, useRef } from 'react';
import { heTranslations } from '../translations';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import '../styles/theme.css';
import '../styles/components.css';
import './SecureTestInterface.css';

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

// Security Hook - Disable copying, right-click, shortcuts, and dev tools
const useSecurityMeasures = () => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable drag
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e) => {
      // Disable Ctrl+A (Select All)
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+C (Copy)
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+V (Paste)
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+X (Cut)
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      
      // Disable F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Disable text selection via CSS
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
    };
  }, []);
};

// Memory clearing utility
const clearMemory = () => {
  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }
  
  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
};

// Question Display Page Component
const QuestionPage = ({ 
  question, 
  questionIndex, 
  totalQuestions, 
  onProceedToAnswers,
  timeRemaining 
}) => {
  const [hasReadQuestion, setHasReadQuestion] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const readingTimerRef = useRef(null);

  useEffect(() => {
    // Start reading timer
    readingTimerRef.current = setInterval(() => {
      setReadingTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
    };
  }, []);

  const handleProceedToAnswers = () => {
    setHasReadQuestion(true);
    clearInterval(readingTimerRef.current);
    
    // Clear question from memory before proceeding
    setTimeout(() => {
      clearMemory();
      onProceedToAnswers();
    }, 100);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="secure-page question-page">
      <div className="secure-header">
        <div className="test-progress">
          <span className="question-counter">
            שאלה {questionIndex} מתוך {totalQuestions}
          </span>
          {timeRemaining && (
            <div className="time-display">
              <span className="time-label">זמן נותר:</span>
              <span className="time-value">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        <div className="reading-timer">
          זמן קריאה: {formatTime(readingTime)}
        </div>
      </div>

      <div className="secure-content">
        <div className="question-container">
          <div className="question-header">
            <h1 className="question-title">שאלה {questionIndex}</h1>
            {question.topic_area && (
              <span className="question-topic">{question.topic_area}</span>
            )}
          </div>

          <div className="question-content">
            <div className="question-text">
              {question.question_text}
            </div>

            {question.difficulty_level && (
              <div className="question-meta">
                <span className={`difficulty-badge difficulty-${question.difficulty_level}`}>
                  רמת קושי: {question.difficulty_level === 'easy' ? 'קל' : 
                            question.difficulty_level === 'medium' ? 'בינוני' : 'קשה'}
                </span>
              </div>
            )}

            {question.guidelines && (
              <div className="question-guidelines">
                <h3>הנחיות:</h3>
                <p>{question.guidelines}</p>
              </div>
            )}
          </div>

          <div className="question-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={handleProceedToAnswers}
              disabled={readingTime < 10} // Minimum 10 seconds reading time
            >
              {readingTime < 10 
                ? `המתן ${10 - readingTime} שניות לפני המשך...`
                : 'המשך לתשובות'
              }
            </button>
            
            {readingTime < 10 && (
              <p className="reading-instruction">
                אנא קרא את השאלה בעיון לפני המעבר לתשובות
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Answer Selection Page Component
const AnswerPage = ({ 
  question, 
  questionIndex, 
  totalQuestions, 
  selectedAnswer,
  onAnswerChange,
  onSubmitAnswer,
  timeRemaining 
}) => {
  const [answerTime, setAnswerTime] = useState(0);
  const answerTimerRef = useRef(null);

  useEffect(() => {
    // Start answer timer
    answerTimerRef.current = setInterval(() => {
      setAnswerTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (answerTimerRef.current) {
        clearInterval(answerTimerRef.current);
      }
    };
  }, []);

  const handleSubmitAnswer = () => {
    clearInterval(answerTimerRef.current);
    
    // Clear answer options from memory before proceeding
    setTimeout(() => {
      clearMemory();
      onSubmitAnswer(answerTime);
    }, 100);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderAnswerOptions = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        const options = ['א', 'ב', 'ג', 'ד'];
        return (
          <div className="answer-options">
            {question.answer_options.map((option, index) => (
              <label key={index} className="answer-option">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="answer-radio"
                />
                <span className="answer-option-text">
                  <span className="answer-option-letter">{options[index]})</span>
                  <span className="answer-option-content">{option}</span>
                </span>
              </label>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div className="answer-options">
            <label className="answer-option">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="נכון"
                checked={selectedAnswer === 'נכון'}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="answer-radio"
              />
              <span className="answer-option-text">
                <span className="answer-option-content">נכון</span>
              </span>
            </label>
            <label className="answer-option">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="לא נכון"
                checked={selectedAnswer === 'לא נכון'}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="answer-radio"
              />
              <span className="answer-option-text">
                <span className="answer-option-content">לא נכון</span>
              </span>
            </label>
          </div>
        );

      case 'short_answer':
        return (
          <div className="answer-input-container">
            <textarea
              className="answer-textarea"
              placeholder="הכנס את תשובתך כאן..."
              value={selectedAnswer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              rows={3}
              maxLength={500}
              dir="rtl"
            />
            <div className="character-count">
              {(selectedAnswer || '').length}/500 תווים
            </div>
          </div>
        );

      case 'essay':
        return (
          <div className="answer-input-container">
            <textarea
              className="answer-textarea essay-textarea"
              placeholder="כתוב את תשובתך המפורטת כאן..."
              value={selectedAnswer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              rows={8}
              maxLength={2000}
              dir="rtl"
            />
            <div className="character-count">
              {(selectedAnswer || '').length}/2000 תווים
            </div>
          </div>
        );

      default:
        return (
          <div className="error-message">
            סוג שאלה לא נתמך: {question.question_type}
          </div>
        );
    }
  };

  return (
    <div className="secure-page answer-page">
      <div className="secure-header">
        <div className="test-progress">
          <span className="question-counter">
            תשובות לשאלה {questionIndex} מתוך {totalQuestions}
          </span>
          {timeRemaining && (
            <div className="time-display">
              <span className="time-label">זמן נותר:</span>
              <span className="time-value">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        <div className="answer-timer">
          זמן מענה: {formatTime(answerTime)}
        </div>
      </div>

      <div className="secure-content">
        <div className="answer-container">
          <div className="answer-header">
            <h1 className="answer-title">בחר תשובה לשאלה {questionIndex}</h1>
            <p className="answer-instruction">
              {question.question_type === 'multiple_choice' ? 'בחר תשובה אחת מהאפשרויות הבאות:' :
               question.question_type === 'true_false' ? 'בחר האם הטענה נכונה או לא נכונה:' :
               'הכנס את תשובתך בשדה הטקסט:'}
            </p>
          </div>

          <div className="answer-content">
            {renderAnswerOptions()}
          </div>

          <div className="answer-actions">
            <button 
              className="btn btn-success btn-large"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
            >
              {selectedAnswer ? 'שלח תשובה והמשך' : 'בחר תשובה כדי להמשיך'}
            </button>
            
            {!selectedAnswer && (
              <p className="answer-warning">
                יש לבחור תשובה לפני המעבר לשאלה הבאה
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Secure Test Interface Component
const SecureTestInterface = ({ 
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
  const [currentPage, setCurrentPage] = useState('question'); // 'question' or 'answer'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [startTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState({});

  // Apply security measures
  useSecurityMeasures();

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

    async submitTest(testId, answers, timeSpent, questionTimes) {
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
          questionTimes,
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
  const handleProceedToAnswers = useCallback(() => {
    setCurrentPage('answer');
  }, []);

  const handleAnswerChange = useCallback((answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  }, [currentQuestionIndex]);

  const handleSubmitAnswer = useCallback((answerTime) => {
    // Record time spent on this question
    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestionIndex]: answerTime
    }));

    // Move to next question or finish test
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentPage('question');
    } else {
      // Last question - submit test
      handleSubmitTest();
    }
  }, [currentQuestionIndex, questions.length]);

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
          totalQuestions: questions.length,
          questionTimes
        };
        
        if (onTestComplete) {
          onTestComplete(result);
        } else {
          alert(`מבחן מאובטח הושלם בהצלחה!\nציון: ${result.score}\nזמן: ${Math.floor(timeSpent / 60)} דקות`);
          onClose();
        }
      } else {
        // Real test submission
        const result = await apiService.submitTest(testData.id, answers, timeSpent, questionTimes);
        
        if (onTestComplete) {
          onTestComplete(result);
        } else {
          alert('המבחן המאובטח נשלח בהצלחה!');
          onClose();
        }
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert(error.message || 'שגיאה בשליחת המבחן');
    } finally {
      setIsSubmitting(false);
    }
  }, [testData, answers, startTime, onTestComplete, onClose, preloadedTestData, questions.length, questionTimes]);

  // Prevent page navigation/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'האם אתה בטוח שברצונך לעזוב את המבחן? התקדמותך תאבד.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="secure-test-overlay">
        <div className="secure-test-container">
          <LoadingSpinner 
            fullScreen 
            message="טוען מבחן מאובטח..."
            size="large"
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="secure-test-overlay">
        <div className="secure-test-container">
          <ErrorMessage 
            error={error}
            onRetry={loadTestData}
            type="error"
          />
          <div className="error-actions">
            <button className="btn btn-outline" onClick={onClose}>
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No questions state
  if (!questions.length) {
    return (
      <div className="secure-test-overlay">
        <div className="secure-test-container">
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <div className="empty-title">אין שאלות במבחן המאובטח</div>
            <div className="empty-description">
              המבחן לא מכיל שאלות או שהן לא נטענו כראוי
            </div>
            <button className="btn btn-primary" onClick={onClose}>
              חזור
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitting state
  if (isSubmitting) {
    return (
      <div className="secure-test-overlay">
        <div className="secure-test-container">
          <LoadingSpinner 
            fullScreen 
            message="שולח מבחן מאובטח..."
            size="large"
          />
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <ErrorBoundary fallbackMessage="שגיאה בטעינת המבחן המאובטח">
      <div className="secure-test-overlay">
        <div className="secure-test-container" dir="rtl">
          {currentPage === 'question' ? (
            <QuestionPage
              question={currentQuestion}
              questionIndex={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              onProceedToAnswers={handleProceedToAnswers}
              timeRemaining={timeRemaining}
            />
          ) : (
            <AnswerPage
              question={currentQuestion}
              questionIndex={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedAnswer={answers[currentQuestionIndex] || ''}
              onAnswerChange={handleAnswerChange}
              onSubmitAnswer={handleSubmitAnswer}
              timeRemaining={timeRemaining}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SecureTestInterface;
