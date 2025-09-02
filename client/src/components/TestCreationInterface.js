import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Modal = styled.div`
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
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
  
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
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 2px solid var(--color-border);
`;

const Title = styled.h2`
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: var(--color-danger);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-dangerHover);
    transform: scale(1.05);
  }
`;

const Content = styled.div`
  padding: 2rem;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  gap: 1rem;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  
  &.active {
    background: var(--color-primary);
    color: var(--color-textOnPrimary);
  }
  
  &.completed {
    background: var(--color-success);
    color: var(--color-textOnPrimary);
  }
  
  &.inactive {
    background: var(--color-surfaceHover);
    color: var(--color-textSecondary);
  }
`;

const StepNumber = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
`;

const CreationModeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ModeCard = styled.div`
  border: 2px solid ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  padding: 2rem;
  cursor: pointer;
  transition: all var(--transition-medium);
  background: ${props => props.selected ? 'var(--color-primaryLight)' : 'var(--color-surface)'};
  
  &:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  }
`;

const ModeIcon = styled.div`
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const ModeTitle = styled.h3`
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  text-align: center;
  font-size: 1.2rem;
`;

const ModeDescription = styled.p`
  color: var(--color-textSecondary);
  margin: 0;
  text-align: center;
  line-height: 1.4;
  font-size: 0.9rem;
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: var(--color-text);
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  background: var(--color-surface);
  direction: rtl;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  font-size: 0.9rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const LessonSelector = styled.div`
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  max-height: 300px;
  overflow-y: auto;
`;

const LessonItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--color-borderLight);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 1rem;
  
  &:hover {
    background: var(--color-surfaceHover);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const LessonCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const LessonInfo = styled.div`
  flex: 1;
`;

const LessonTitle = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.25rem;
`;

const LessonMeta = styled.div`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  display: flex;
  gap: 1rem;
`;

const ConfigSection = styled.div`
  background: var(--color-surfaceElevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const RangeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RangeInput = styled.input`
  width: 100%;
`;

const RangeValue = styled.div`
  text-align: center;
  font-weight: 500;
  color: var(--color-primary);
  font-size: 0.9rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 2rem;
  border-top: 2px solid var(--color-border);
`;

const ActionButton = styled.button`
  padding: 0.75rem 2rem;
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
  
  &.primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
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
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
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

const TestCreationInterface = ({ onClose, onTestCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [creationMode, setCreationMode] = useState(''); // 'manual' or 'ai'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState([]);

  // Test configuration
  const [testConfig, setTestConfig] = useState({
    title: '',
    description: '',
    subjectArea: '',
    gradeLevel: '',
    estimatedDuration: 30,
    instructions: '',
    // AI-specific config
    questionCount: 10,
    questionType: 'multiple_choice',
    difficultyLevel: 'medium',
    language: 'hebrew',
    customGuidance: ''
  });

  useEffect(() => {
    if (creationMode === 'ai') {
      fetchLessons();
    }
  }, [creationMode]);

  const fetchLessons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLessons(data.recordings || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('שגיאה בטעינת השיעורים');
    }
  };

  const handleStepChange = (step) => {
    if (step <= currentStep + 1) {
      setCurrentStep(step);
    }
  };

  const handleModeSelect = (mode) => {
    setCreationMode(mode);
    setCurrentStep(2);
  };

  const handleLessonToggle = (lessonId) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleConfigChange = (field, value) => {
    setTestConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');

      if (creationMode === 'ai') {
        // Create test from AI-generated content
        if (selectedLessons.length === 0) {
          throw new Error('יש לבחור לפחות שיעור אחד');
        }

        // For now, we'll use the first selected lesson
        // In the future, we can enhance this to combine multiple lessons
        const lessonId = selectedLessons[0];

        const response = await fetch(`/api/ai-content/generate-test/${lessonId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            testConfig,
            questionCount: testConfig.questionCount,
            questionType: testConfig.questionType,
            difficultyLevel: testConfig.difficultyLevel,
            language: testConfig.language,
            customGuidance: testConfig.customGuidance
          })
        });

        if (!response.ok) {
          throw new Error('שגיאה ביצירת מבחן מתוכן AI');
        }

        const result = await response.json();
        onTestCreated(result.test);
      } else {
        // Create manual test
        const response = await fetch('/api/tests/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...testConfig,
            creationMode: 'manual'
          })
        });

        if (!response.ok) {
          throw new Error('שגיאה ביצירת מבחן ידני');
        }

        const result = await response.json();
        onTestCreated(result.test);
      }

      onClose();
    } catch (error) {
      console.error('Error creating test:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (step) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'inactive';
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return creationMode !== '';
      case 2:
        if (creationMode === 'ai') {
          return selectedLessons.length > 0 && testConfig.title.trim() !== '';
        }
        return testConfig.title.trim() !== '';
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CreationModeSelector>
            <ModeCard 
              selected={creationMode === 'manual'}
              onClick={() => handleModeSelect('manual')}
            >
              <ModeIcon>✏️</ModeIcon>
              <ModeTitle>יצירה ידנית</ModeTitle>
              <ModeDescription>
                צור מבחן באופן ידני עם שאלות מותאמות אישית
              </ModeDescription>
            </ModeCard>
            
            <ModeCard 
              selected={creationMode === 'ai'}
              onClick={() => handleModeSelect('ai')}
            >
              <ModeIcon>🤖</ModeIcon>
              <ModeTitle>יצירה אוטומטית</ModeTitle>
              <ModeDescription>
                צור מבחן אוטומטית מתוכן שיעורים קיימים באמצעות AI
              </ModeDescription>
            </ModeCard>
          </CreationModeSelector>
        );

      case 2:
        return (
          <>
            <FormSection>
              <SectionTitle>
                <span>📝</span>
                פרטי המבחן
              </SectionTitle>
              <FormGrid>
                <FormGroup>
                  <Label>שם המבחן *</Label>
                  <Input
                    type="text"
                    value={testConfig.title}
                    onChange={(e) => handleConfigChange('title', e.target.value)}
                    placeholder="הכנס שם למבחן"
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>מקצוע</Label>
                  <Input
                    type="text"
                    value={testConfig.subjectArea}
                    onChange={(e) => handleConfigChange('subjectArea', e.target.value)}
                    placeholder="מתמטיקה, עברית, מדעים..."
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>כיתה</Label>
                  <Input
                    type="text"
                    value={testConfig.gradeLevel}
                    onChange={(e) => handleConfigChange('gradeLevel', e.target.value)}
                    placeholder="כיתה ג', כיתות ד-ו..."
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>משך זמן משוער (דקות)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="180"
                    value={testConfig.estimatedDuration}
                    onChange={(e) => handleConfigChange('estimatedDuration', parseInt(e.target.value))}
                  />
                </FormGroup>
              </FormGrid>
              
              <FormGroup>
                <Label>תיאור המבחן</Label>
                <TextArea
                  value={testConfig.description}
                  onChange={(e) => handleConfigChange('description', e.target.value)}
                  placeholder="תיאור קצר של המבחן ומטרותיו"
                />
              </FormGroup>
            </FormSection>

            {creationMode === 'ai' && (
              <FormSection>
                <SectionTitle>
                  <span>📚</span>
                  בחירת שיעורים
                </SectionTitle>
                <p style={{ color: 'var(--color-textSecondary)', marginBottom: '1rem' }}>
                  בחר שיעור או מספר שיעורים שמהם תרצה ליצור את המבחן
                </p>
                <LessonSelector>
                  {lessons.map((lesson) => (
                    <LessonItem key={lesson.id}>
                      <LessonCheckbox
                        type="checkbox"
                        checked={selectedLessons.includes(lesson.id)}
                        onChange={() => handleLessonToggle(lesson.id)}
                      />
                      <LessonInfo>
                        <LessonTitle>
                          {lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}
                        </LessonTitle>
                        <LessonMeta>
                          <span>נוצר: {new Date(lesson.created_at).toLocaleDateString('he-IL')}</span>
                          <span>משך: {Math.round((lesson.metadata?.duration || 0) / 60)} דקות</span>
                          {lesson.metadata?.subject && <span>מקצוע: {lesson.metadata.subject}</span>}
                        </LessonMeta>
                      </LessonInfo>
                    </LessonItem>
                  ))}
                </LessonSelector>
              </FormSection>
            )}
          </>
        );

      case 3:
        return (
          <FormSection>
            <SectionTitle>
              <span>⚙️</span>
              הגדרות מבחן
            </SectionTitle>
            
            {creationMode === 'ai' && (
              <ConfigSection>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>הגדרות AI</h4>
                <ConfigGrid>
                  <FormGroup>
                    <Label>מספר שאלות</Label>
                    <RangeGroup>
                      <RangeInput
                        type="range"
                        min="5"
                        max="30"
                        value={testConfig.questionCount}
                        onChange={(e) => handleConfigChange('questionCount', parseInt(e.target.value))}
                      />
                      <RangeValue>{testConfig.questionCount} שאלות</RangeValue>
                    </RangeGroup>
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>סוג שאלות</Label>
                    <Select
                      value={testConfig.questionType}
                      onChange={(e) => handleConfigChange('questionType', e.target.value)}
                    >
                      <option value="multiple_choice">רב ברירה</option>
                      <option value="true_false">נכון/לא נכון</option>
                      <option value="short_answer">תשובה קצרה</option>
                      <option value="essay">חיבור</option>
                    </Select>
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>רמת קושי</Label>
                    <Select
                      value={testConfig.difficultyLevel}
                      onChange={(e) => handleConfigChange('difficultyLevel', e.target.value)}
                    >
                      <option value="easy">קל</option>
                      <option value="medium">בינוני</option>
                      <option value="hard">קשה</option>
                    </Select>
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>שפה</Label>
                    <Select
                      value={testConfig.language}
                      onChange={(e) => handleConfigChange('language', e.target.value)}
                    >
                      <option value="hebrew">עברית</option>
                      <option value="english">אנגלית</option>
                    </Select>
                  </FormGroup>
                </ConfigGrid>
                
                <FormGroup style={{ marginTop: '1rem' }}>
                  <Label>הנחיות נוספות ל-AI (אופציונלי)</Label>
                  <TextArea
                    value={testConfig.customGuidance}
                    onChange={(e) => handleConfigChange('customGuidance', e.target.value)}
                    placeholder="הנחיות מיוחדות ליצירת השאלות, נושאים להתמקד בהם, סגנון שאלות..."
                    style={{ minHeight: '80px' }}
                  />
                </FormGroup>
              </ConfigSection>
            )}
            
            <FormGroup>
              <Label>הוראות למבחן</Label>
              <TextArea
                value={testConfig.instructions}
                onChange={(e) => handleConfigChange('instructions', e.target.value)}
                placeholder="הוראות שיוצגו לתלמידים בתחילת המבחן"
                style={{ minHeight: '100px' }}
              />
            </FormGroup>
          </FormSection>
        );

      default:
        return null;
    }
  };

  return (
    <Modal onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent>
        <Header>
          <Title>
            <span>📝</span>
            יצירת מבחן חדש
          </Title>
          <CloseButton onClick={onClose}>
            ✕
          </CloseButton>
        </Header>

        <Content>
          <StepIndicator>
            <Step className={getStepStatus(1)} onClick={() => handleStepChange(1)}>
              <StepNumber>1</StepNumber>
              <span>בחירת סוג</span>
            </Step>
            <Step className={getStepStatus(2)} onClick={() => handleStepChange(2)}>
              <StepNumber>2</StepNumber>
              <span>פרטי מבחן</span>
            </Step>
            <Step className={getStepStatus(3)} onClick={() => handleStepChange(3)}>
              <StepNumber>3</StepNumber>
              <span>הגדרות</span>
            </Step>
          </StepIndicator>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          {renderStepContent()}
        </Content>

        <Actions>
          {currentStep > 1 && (
            <ActionButton className="secondary" onClick={handleBack}>
              חזור
            </ActionButton>
          )}
          
          {currentStep < 3 ? (
            <ActionButton 
              className="primary" 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              המשך
            </ActionButton>
          ) : (
            <ActionButton 
              className="primary" 
              onClick={handleCreate}
              disabled={loading || !canProceed()}
            >
              {loading && <LoadingSpinner />}
              {loading ? 'יוצר מבחן...' : 'צור מבחן'}
            </ActionButton>
          )}
        </Actions>
      </ModalContent>
    </Modal>
  );
};

export default TestCreationInterface;
