import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContainer = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 2rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-surfaceElevated);
`;

const ModalTitle = styled.h2`
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
`;

const TitleIcon = styled.span`
  font-size: 1.8rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-textSecondary);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--color-surfaceHover);
    color: var(--color-text);
  }
`;

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
`;

const TestInfo = styled.div`
  background: var(--color-surfaceElevated);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const TestInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const TestInfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const TestInfoLabel = styled.span`
  font-size: 0.85rem;
  color: var(--color-textSecondary);
  font-weight: 600;
`;

const TestInfoValue = styled.span`
  font-size: 1rem;
  color: var(--color-text);
  font-weight: 500;
`;

const TestDescription = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
`;

const SectionTitle = styled.h3`
  color: var(--color-text);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
`;

const QuestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const QuestionCard = styled.div`
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: var(--color-surface);
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px var(--color-shadowLight);
  }
`;

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const QuestionNumber = styled.div`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const QuestionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const QuestionActionButton = styled.button`
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-surfaceHover);
  }
  
  &.danger {
    color: var(--color-danger);
    border-color: var(--color-dangerLight);
    
    &:hover:not(:disabled) {
      background: var(--color-dangerLight);
      border-color: var(--color-danger);
    }
  }
`;

const QuestionText = styled.div`
  color: var(--color-text);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-weight: 500;
`;

const QuestionOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const QuestionOption = styled.div`
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all var(--transition-fast);
  
  &.correct {
    background: var(--color-successLight);
    color: var(--color-success);
    font-weight: 600;
    border: 2px solid var(--color-success);
  }
  
  &.incorrect {
    background: var(--color-surfaceHover);
    color: var(--color-textSecondary);
    border: 2px solid var(--color-border);
  }
`;

const OptionLetter = styled.span`
  background: ${props => props.correct ? 'var(--color-success)' : 'var(--color-textSecondary)'};
  color: var(--color-textOnPrimary);
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
`;

const QuestionMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-textSecondary);
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
  margin-top: 1rem;
`;

const QuestionMetaLeft = styled.div`
  display: flex;
  gap: 1rem;
`;

const ModalFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surfaceElevated);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const FooterActions = styled.div`
  display: flex;
  gap: 1rem;
`;

const ActionButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all var(--transition-medium);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &.primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
    }
  }
  
  &.success {
    background: linear-gradient(135deg, var(--color-success), var(--color-successHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-successHover), var(--color-successActive));
    }
  }
  
  &.secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border: 2px solid var(--color-border);
    
    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border);
    border-top: 4px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background-color: var(--color-dangerLight);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  border: 1px solid var(--color-dangerLighter);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--color-textSecondary);
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyStateTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 0.5rem;
`;

const EmptyStateDescription = styled.p`
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const TestPreviewInterface = ({ 
  isOpen, 
  onClose, 
  test, 
  onEdit, 
  onDistribute, 
  onDelete,
  user,
  t 
}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && test) {
      fetchQuestions();
    }
  }, [isOpen, test]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      if (!test || !test.id) {
        throw new Error('מזהה מבחן לא תקין');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות');
      }

      const response = await fetch(`/api/ai-content/question-sets/${test.id}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = 'שגיאה בטעינת השאלות';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || 'שגיאה בטעינת השאלות');
      }
      
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError(`שגיאה בטעינת השאלות: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (question) => {
    // TODO: Open question editor
    console.log('Edit question:', question);
  };

  const handleDeleteQuestion = (question) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את השאלה?`)) {
      // TODO: Implement question deletion
      console.log('Delete question:', question);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות${remainingMinutes > 0 ? ` ו-${remainingMinutes} דקות` : ''}`;
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <TitleIcon>👁️</TitleIcon>
            תצוגה מקדימה: {test?.title}
          </ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <ModalContent>
          {test && (
            <TestInfo>
              <TestInfoGrid>
                <TestInfoItem>
                  <TestInfoLabel>שם המבחן</TestInfoLabel>
                  <TestInfoValue>{test.title}</TestInfoValue>
                </TestInfoItem>
                <TestInfoItem>
                  <TestInfoLabel>מספר שאלות</TestInfoLabel>
                  <TestInfoValue>{test.questionCount}</TestInfoValue>
                </TestInfoItem>
                {test.subjectArea && (
                  <TestInfoItem>
                    <TestInfoLabel>מקצוע</TestInfoLabel>
                    <TestInfoValue>{test.subjectArea}</TestInfoValue>
                  </TestInfoItem>
                )}
                {test.gradeLevel && (
                  <TestInfoItem>
                    <TestInfoLabel>כיתה</TestInfoLabel>
                    <TestInfoValue>{test.gradeLevel}</TestInfoValue>
                  </TestInfoItem>
                )}
                {test.estimatedDuration > 0 && (
                  <TestInfoItem>
                    <TestInfoLabel>משך זמן משוער</TestInfoLabel>
                    <TestInfoValue>{formatDuration(test.estimatedDuration)}</TestInfoValue>
                  </TestInfoItem>
                )}
                <TestInfoItem>
                  <TestInfoLabel>נוצר בתאריך</TestInfoLabel>
                  <TestInfoValue>{formatDate(test.createdAt)}</TestInfoValue>
                </TestInfoItem>
              </TestInfoGrid>
            </TestInfo>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SectionTitle>
            <span>📝</span>
            שאלות המבחן
          </SectionTitle>

          {loading ? (
            <LoadingSpinner />
          ) : questions.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>❓</EmptyStateIcon>
              <EmptyStateTitle>אין שאלות במבחן</EmptyStateTitle>
              <EmptyStateDescription>
                המבחן עדיין לא מכיל שאלות. אנא ערוך את המבחן כדי להוסיף שאלות.
              </EmptyStateDescription>
            </EmptyState>
          ) : (
            <QuestionsList>
              {questions.map((question, index) => (
                <QuestionCard key={question.id || index}>
                  <QuestionHeader>
                    <QuestionNumber>{index + 1}</QuestionNumber>
                    <QuestionActions>
                      <QuestionActionButton
                        onClick={() => handleEditQuestion(question)}
                      >
                        ערוך
                      </QuestionActionButton>
                      <QuestionActionButton
                        className="danger"
                        onClick={() => handleDeleteQuestion(question)}
                      >
                        מחק
                      </QuestionActionButton>
                    </QuestionActions>
                  </QuestionHeader>

                  <QuestionText>{question.question_text}</QuestionText>

                  {question.options && question.options.length > 0 && (
                    <QuestionOptions>
                      {question.options.map((option, optionIndex) => (
                        <QuestionOption
                          key={optionIndex}
                          className={option.is_correct ? 'correct' : 'incorrect'}
                        >
                          <OptionLetter correct={option.is_correct}>
                            {String.fromCharCode(65 + optionIndex)}
                          </OptionLetter>
                          {option.option_text}
                          {option.is_correct && <span style={{ marginRight: 'auto' }}>✓</span>}
                        </QuestionOption>
                      ))}
                    </QuestionOptions>
                  )}

                  <QuestionMeta>
                    <QuestionMetaLeft>
                      {question.question_type && (
                        <span>סוג: {question.question_type}</span>
                      )}
                      {question.difficulty_level && (
                        <span>רמת קושי: {question.difficulty_level}</span>
                      )}
                    </QuestionMetaLeft>
                  </QuestionMeta>
                </QuestionCard>
              ))}
            </QuestionsList>
          )}
        </ModalContent>

        <ModalFooter>
          <div>
            <span style={{ color: 'var(--color-textSecondary)', fontSize: '0.9rem' }}>
              {questions.length} שאלות במבחן
            </span>
          </div>
          <FooterActions>
            <ActionButton className="secondary" onClick={onClose}>
              <span>✕</span>
              סגור
            </ActionButton>
            <ActionButton 
              className="primary" 
              onClick={() => onEdit && onEdit(test)}
            >
              <span>✏️</span>
              ערוך מבחן
            </ActionButton>
            <ActionButton 
              className="success" 
              onClick={() => onDistribute && onDistribute(test)}
            >
              <span>📤</span>
              הפץ מבחן
            </ActionButton>
          </FooterActions>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TestPreviewInterface;
