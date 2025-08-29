import React, { useState, useEffect } from 'react';
import { heTranslations } from '../translations';
import '../styles/theme.css';
import '../styles/components.css';
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

// Answer Input Components
const MultipleChoiceInput = ({ question, selectedAnswer, onAnswerChange }) => {
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
};

const TrueFalseInput = ({ question, selectedAnswer, onAnswerChange }) => {
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
};

const ShortAnswerInput = ({ question, selectedAnswer, onAnswerChange }) => {
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
};

const EssayInput = ({ question, selectedAnswer, onAnswerChange }) => {
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
      {question.guidelines && (
        <div className="essay-guidelines">
          <h4>הנחיות לתשובה:</h4>
          <p>{question.guidelines}</p>
        </div>
      )}
    </div>
  );
};

// Progress Indicator Component
const ProgressIndicator = ({ currentQuestion, totalQuestions, answeredQuestions }) => {
  const progressPercentage = (currentQuestion / totalQuestions) * 100;
  const answeredCount = answeredQuestions.size;
  
  return (
    <div className="progress-container">
      <div className="progress-info">
        <span className="progress-text">
          {t('student.questionOf', { current: currentQuestion, total: totalQuestions })}
        </span>
        <span className="answered-count">
          נענו: {answeredCount} מתוך {totalQuestions}
        </span>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={currentQuestion}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          aria-label={`שאלה ${currentQuestion} מתוך ${totalQuestions}`}
        />
      </div>
      <div className="question-indicators">
        {Array.from({ length: totalQuestions }, (_, index) => (
          <div
            key={index}
            className={`question-indicator ${
              index + 1 === currentQuestion ? 'current' : ''
            } ${
              answeredQuestions.has(index) ? 'answered' : ''
            }`}
            title={`שאלה ${index + 1}${answeredQuestions.has(index) ? ' - נענתה' : ''}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

// Navigation Controls Component
const NavigationControls = ({ 
  currentQuestion, 
  totalQuestions, 
  onPrevious, 
  onNext, 
  onQuestionJump,
  hasAnswer 
}) => {
  const canGoPrevious = currentQuestion > 1;
  const canGoNext = currentQuestion < totalQuestions;
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' && canGoPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowLeft' && canGoNext) {
        onNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canGoPrevious, canGoNext, onPrevious, onNext]);
  
  return (
    <div className="navigation-controls">
      <button
        className="btn btn-outline"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label={t('accessibility.previous')}
      >
        ← {t('student.previousQuestion')}
      </button>
      
      <div className="question-jump-container">
        <span className="jump-label">עבור לשאלה:</span>
        <div className="question-jump-buttons">
          {Array.from({ length: Math.min(totalQuestions, 10) }, (_, index) => (
            <button
              key={index}
              className={`btn btn-sm ${
                index + 1 === currentQuestion ? 'btn-primary' : 'btn-outline'
              }`}
              onClick={() => onQuestionJump(index + 1)}
              aria-label={`עבור לשאלה ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
      
      <button
        className="btn btn-outline"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={t('accessibility.next')}
      >
        {t('student.nextQuestion')} →
      </button>
    </div>
  );
};

// Main Question Display Component
const QuestionDisplay = ({ 
  question, 
  questionIndex, 
  totalQuestions, 
  selectedAnswer, 
  onAnswerChange,
  onPrevious,
  onNext,
  onQuestionJump,
  answeredQuestions 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  if (!question) {
    return (
      <div className="question-container">
        <div className="loading-container">
          <div className="loading-spinner loading-spinner-large"></div>
          <div className="loading-message">טוען שאלה...</div>
        </div>
      </div>
    );
  }
  
  const renderAnswerInput = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceInput
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
          />
        );
      case 'true_false':
        return (
          <TrueFalseInput
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
          />
        );
      case 'short_answer':
        return (
          <ShortAnswerInput
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
          />
        );
      case 'essay':
        return (
          <EssayInput
            question={question}
            selectedAnswer={selectedAnswer}
            onAnswerChange={onAnswerChange}
          />
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
    <div className="question-container" dir="rtl">
      {/* Progress Indicator */}
      <ProgressIndicator
        currentQuestion={questionIndex}
        totalQuestions={totalQuestions}
        answeredQuestions={answeredQuestions}
      />
      
      {/* Question Content */}
      <div className="question-content">
        <div className="question-header">
          <h2 className="question-title">
            שאלה {questionIndex}
          </h2>
          {question.topic_area && (
            <span className="question-topic">{question.topic_area}</span>
          )}
        </div>
        
        <div className="question-text">
          {question.question_text}
        </div>
        
        {question.difficulty_level && (
          <div className="question-meta">
            <span className="difficulty-badge difficulty-{question.difficulty_level}">
              רמת קושי: {question.difficulty_level === 'easy' ? 'קל' : 
                        question.difficulty_level === 'medium' ? 'בינוני' : 'קשה'}
            </span>
          </div>
        )}
        
        {/* Answer Input */}
        <div className="answer-section">
          <h3 className="answer-title">
            {question.question_type === 'multiple_choice' ? t('student.selectAnswer') :
             question.question_type === 'true_false' ? 'בחר תשובה:' :
             'הכנס תשובתך:'}
          </h3>
          
          {renderAnswerInput()}
          
          {!selectedAnswer && (
            <div className="answer-hint">
              {t('student.noAnswerSelected')}
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation Controls */}
      <NavigationControls
        currentQuestion={questionIndex}
        totalQuestions={totalQuestions}
        onPrevious={onPrevious}
        onNext={onNext}
        onQuestionJump={onQuestionJump}
        hasAnswer={!!selectedAnswer}
      />
    </div>
  );
};

export default QuestionDisplay;
