import React, { useState } from 'react';
import styled from 'styled-components';
import MemoryCardForm from './MemoryCardForm';
import LessonToCardsWorkflow from './LessonToCardsWorkflow';

const Container = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2rem;
  box-shadow: 0 2px 8px var(--color-shadowLight);
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const Title = styled.h2`
  color: var(--color-text);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ModeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  border: 1px solid var(--color-border);
`;

const ModeButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-medium);
  background: ${props => props.active ? 'var(--color-primary)' : 'transparent'};
  color: ${props => props.active ? 'var(--color-textOnPrimary)' : 'var(--color-text)'};
  
  &:hover:not(:disabled) {
    background: ${props => props.active ? 'var(--color-primaryHover)' : 'var(--color-surface)'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ModeDescription = styled.div`
  background: var(--color-primaryLight);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 2rem;
  text-align: center;
`;

const ModeDescriptionTitle = styled.h3`
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const ModeDescriptionText = styled.p`
  color: var(--color-textSecondary);
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const SuccessMessage = styled.div`
  background: var(--color-successLight);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
`;

const SuccessTitle = styled.h3`
  color: var(--color-success);
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const SuccessDetails = styled.div`
  color: var(--color-text);
  margin-bottom: 1rem;
`;

const SuccessActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const ActionButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-medium);
  
  &.primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
    }
  }
  
  &.secondary {
    background: var(--color-surfaceElevated);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    
    &:hover:not(:disabled) {
      background: var(--color-surface);
      border-color: var(--color-primary);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MemoryCardManager = ({ userId, onCardCreated, onCancel }) => {
  const [mode, setMode] = useState('manual'); // 'manual' or 'generate'
  const [completionResult, setCompletionResult] = useState(null);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCompletionResult(null);
  };

  const handleGenerationComplete = (result) => {
    setCompletionResult(result);
    
    // Also notify parent if provided
    if (onCardCreated) {
      onCardCreated({
        type: 'bulk_generation',
        ...result
      });
    }
  };

  const handleManualCardCreated = (card) => {
    // Notify parent of single card creation
    if (onCardCreated) {
      onCardCreated({
        type: 'single_card',
        card
      });
    }
  };

  const handleStartOver = () => {
    setCompletionResult(null);
    setMode('manual');
  };

  const handleCreateMore = () => {
    setCompletionResult(null);
    // Stay in current mode
  };

  if (completionResult) {
    return (
      <Container>
        <SuccessMessage>
          <SuccessTitle>🎉 כרטיסים נוצרו בהצלחה!</SuccessTitle>
          <SuccessDetails>
            <div><strong>{completionResult.cardsAdded}</strong> כרטיסים נוספו לסט <strong>"{completionResult.setName}"</strong></div>
            {completionResult.sourceLesson && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-textSecondary)' }}>
                מקור: {completionResult.sourceLesson.metadata?.lessonName || `שיעור ${completionResult.sourceLesson.id}`}
              </div>
            )}
          </SuccessDetails>
          <SuccessActions>
            <ActionButton className="secondary" onClick={handleStartOver}>
              חזור לתפריט הראשי
            </ActionButton>
            <ActionButton className="primary" onClick={handleCreateMore}>
              צור עוד כרטיסים
            </ActionButton>
          </SuccessActions>
        </SuccessMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>כרטיסי זיכרון</Title>
        <ModeSelector>
          <ModeButton 
            active={mode === 'manual'} 
            onClick={() => handleModeChange('manual')}
          >
            יצירה ידנית
          </ModeButton>
          <ModeButton 
            active={mode === 'generate'} 
            onClick={() => handleModeChange('generate')}
          >
            יצירה משיעור
          </ModeButton>
        </ModeSelector>
      </Header>

      {mode === 'manual' && (
        <>
          <ModeDescription>
            <ModeDescriptionTitle>יצירה ידנית</ModeDescriptionTitle>
            <ModeDescriptionText>
              צור כרטיסי זיכרון אחד אחד עם שליטה מלאה על התוכן, התגיות ורמת הקושי
            </ModeDescriptionText>
          </ModeDescription>
          <MemoryCardForm 
            userId={userId} 
            onCardCreated={handleManualCardCreated}
            onCancel={onCancel}
          />
        </>
      )}

      {mode === 'generate' && (
        <>
          <ModeDescription>
            <ModeDescriptionTitle>יצירה אוטומטית משיעור</ModeDescriptionTitle>
            <ModeDescriptionText>
              בחר שיעור קיים עם תמליל ויצור כרטיסי זיכרון אוטומטית באמצעות בינה מלאכותית.
              המערכת תנתח את תוכן השיעור ותיצור שאלות ותשובות רלוונטיות.
            </ModeDescriptionText>
          </ModeDescription>
          <LessonToCardsWorkflow 
            userId={userId}
            onComplete={handleGenerationComplete}
            onCancel={onCancel}
          />
        </>
      )}
    </Container>
  );
};

export default MemoryCardManager;
