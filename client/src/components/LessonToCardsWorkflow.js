import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import MemoryCardPreview from './MemoryCardPreview';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

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

const Subtitle = styled.p`
  color: var(--color-textSecondary);
  margin: 0.5rem 0 0 0;
  font-size: 1rem;
`;

const StepContainer = styled.div`
  margin-bottom: 2rem;
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.active ? 'var(--color-primary)' : props.completed ? 'var(--color-success)' : 'var(--color-disabled)'};
  color: var(--color-textOnPrimary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
`;

const StepTitle = styled.h3`
  color: var(--color-text);
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const StepContent = styled.div`
  margin-right: 3rem;
  padding: 1rem;
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
`;

const LessonSelector = styled.div`
  margin-bottom: 1.5rem;
`;

const LessonDropdown = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  background: var(--color-surface);
  color: var(--color-text);
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
  
  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const LessonInfo = styled.div`
  background: var(--color-primaryLight);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-top: 1rem;
`;

const LessonInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LessonInfoLabel = styled.span`
  font-weight: 500;
  color: var(--color-text);
`;

const LessonInfoValue = styled.span`
  color: var(--color-textSecondary);
`;

const ConfigSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ConfigGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ConfigLabel = styled.label`
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
`;

const ConfigInput = styled.input`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const ConfigSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  background: var(--color-surface);
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const GenerateButton = styled.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-md);
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-medium);
  box-shadow: var(--shadow-sm);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-xs);
  }
`;

const ProgressSection = styled.div`
  text-align: center;
  padding: 2rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--color-surfaceElevated);
  border-radius: 4px;
  margin: 1rem 0;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primaryHover));
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  border-radius: 4px;
`;

const ProgressText = styled.div`
  color: var(--color-text);
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const ProgressSubtext = styled.div`
  color: var(--color-textSecondary);
  font-size: 0.9rem;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const CardContainer = styled.div`
  position: relative;
  border: 2px solid ${props => props.selected ? 'var(--color-success)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  background: ${props => props.selected ? 'var(--color-successLight)' : 'var(--color-surface)'};
  transition: var(--transition-medium);
  overflow: hidden;
  
  &:hover {
    border-color: ${props => props.selected ? 'var(--color-success)' : 'var(--color-primary)'};
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
`;

const CardCheckbox = styled.input`
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  width: 24px;
  height: 24px;
  cursor: pointer;
  z-index: 10;
  accent-color: var(--color-success);
  
  &:checked {
    transform: scale(1.1);
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
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
    background: linear-gradient(135deg, var(--color-success), var(--color-successHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-successHover), var(--color-successActive));
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

const SelectionSummary = styled.div`
  background: linear-gradient(135deg, var(--color-primaryLight) 0%, rgba(52, 152, 219, 0.05) 100%);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-weight: 600;
  color: var(--color-text);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const SelectionCount = styled.span`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  min-width: 120px;
  text-align: center;
`;

const QuickActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SetSelector = styled.div`
  margin-bottom: 1.5rem;
  background: var(--color-surfaceElevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
`;

const SetOptions = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const SetOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text);
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: var(--transition-medium);
  background: var(--color-surface);
  
  &:hover {
    border-color: var(--color-primary);
    background: var(--color-primaryLight);
  }
  
  &:has(input:checked) {
    border-color: var(--color-primary);
    background: var(--color-primaryLight);
    color: var(--color-primary);
  }
`;

const SetOptionRadio = styled.input`
  margin: 0;
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
`;

const NewSetFields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const LessonToCardsWorkflow = ({ userId, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Generation configuration
  const [config, setConfig] = useState({
    cardCount: 10,
    difficultyLevel: 'medium',
    subjectArea: '',
    gradeLevel: '',
    language: 'hebrew'
  });
  
  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [generationJobId, setGenerationJobId] = useState(null);
  
  // Set selection
  const [setOption, setSetOption] = useState('existing'); // 'existing' or 'new'
  const [existingSets, setExistingSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');

  useEffect(() => {
    loadLessons();
    loadExistingSets();
  }, [userId]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('שגיאה בטעינת השיעורים');
      }

      const data = await response.json();
      
      // Filter lessons that have transcriptions
      const lessonsWithTranscriptions = [];
      
      for (const lesson of data.recordings || []) {
        try {
          const contentResponse = await fetch(`/api/ai-content/content/${lesson.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            if (contentData.content?.transcription?.transcription_text) {
              lessonsWithTranscriptions.push({
                ...lesson,
                aiContent: contentData.content
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to load AI content for lesson ${lesson.id}:`, error);
        }
      }

      setLessons(lessonsWithTranscriptions);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setError('שגיאה בטעינת השיעורים: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSets = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/memory-cards/sets/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingSets(data.data || []);
      }
    } catch (error) {
      console.error('Error loading existing sets:', error);
    }
  };

  const handleLessonSelect = (lessonId) => {
    const lesson = lessons.find(l => l.id === parseInt(lessonId));
    setSelectedLesson(lesson);
    
    if (lesson) {
      // Extract field of study and class level from lesson metadata
      let subjectArea = 'כללי';
      let gradeLevel = 'כיתות ד-ו';
      
      if (lesson.metadata) {
        // Extract subject area from various possible field names
        subjectArea = lesson.metadata.subjectArea || 
                     lesson.metadata.subject || 
                     lesson.metadata.fieldOfStudy || 
                     lesson.metadata.subject_area || 
                     'כללי';
        
        // Extract grade level from various possible field names
        gradeLevel = lesson.metadata.gradeLevel || 
                    lesson.metadata.classLevel || 
                    lesson.metadata.grade_level || 
                    lesson.metadata.class_level || 
                    'כיתות ד-ו';
      }
      
      // Auto-populate config from lesson metadata - always inherit from lesson
      setConfig(prev => ({
        ...prev,
        subjectArea: subjectArea,
        gradeLevel: gradeLevel
      }));
      
      // Auto-generate set name if creating new set
      if (setOption === 'new' && !newSetName) {
        const lessonName = lesson.metadata?.lessonName || 
                          lesson.metadata?.title || 
                          lesson.metadata?.name || 
                          `שיעור ${lesson.id}`;
        setNewSetName(`כרטיסי זיכרון - ${lessonName}`);
      }
    }
  };

  const handleGenerateCards = async () => {
    if (!selectedLesson) {
      setError('אנא בחר שיעור');
      return;
    }

    try {
      setGenerating(true);
      setGenerationProgress(0);
      setError('');
      setCurrentStep(2);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/memory-cards/generate/from-lesson/${selectedLesson.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'שגיאה ביצירת כרטיסים');
      }

      const result = await response.json();
      
      if (result.success && result.cards) {
        setGeneratedCards(result.cards);
        setSelectedCards(new Set(result.cards.map((_, index) => index)));
        setGenerationJobId(result.jobId); // Store the job ID
        setCurrentStep(3);
      } else {
        throw new Error('לא הצלחנו ליצור כרטיסים');
      }

    } catch (error) {
      console.error('Error generating cards:', error);
      setError('שגיאה ביצירת כרטיסים: ' + error.message);
      setCurrentStep(1);
    } finally {
      setGenerating(false);
    }
  };

  const handleCardToggle = (cardIndex) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardIndex)) {
      newSelected.delete(cardIndex);
    } else {
      newSelected.add(cardIndex);
    }
    setSelectedCards(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCards.size === generatedCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(generatedCards.map((_, index) => index)));
    }
  };

  const handleSaveCards = async () => {
    if (selectedCards.size === 0) {
      setError('אנא בחר לפחות כרטיס אחד');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const approvedCards = Array.from(selectedCards).map(index => generatedCards[index]);

      let targetSetId = selectedSetId;
      let setName = newSetName;
      let setDescription = newSetDescription;

      // If creating new set, prepare the data
      if (setOption === 'new') {
        if (!newSetName.trim()) {
          throw new Error('אנא הכנס שם לסט החדש');
        }
        targetSetId = null;
      } else {
        if (!selectedSetId) {
          throw new Error('אנא בחר סט קיים');
        }
        setName = null;
        setDescription = null;
      }

      const response = await fetch(`/api/memory-cards/generate/approve/${generationJobId || 0}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          setId: targetSetId,
          approvedCards,
          setName,
          setDescription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'שגיאה בשמירת הכרטיסים');
      }

      const result = await response.json();
      
      if (result.success) {
        // Success! Call completion callback
        if (onComplete) {
          onComplete({
            setId: result.data.setId,
            setName: result.data.setName,
            cardsAdded: result.data.cardsAdded,
            sourceLesson: selectedLesson
          });
        }
      } else {
        throw new Error('שמירת הכרטיסים נכשלה');
      }

    } catch (error) {
      console.error('Error saving cards:', error);
      setError('שגיאה בשמירת הכרטיסים: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContent>
            <LessonSelector>
              <ConfigLabel>בחר שיעור ליצירת כרטיסים</ConfigLabel>
              <LessonDropdown
                value={selectedLesson?.id || ''}
                onChange={(e) => handleLessonSelect(e.target.value)}
                disabled={loading}
              >
                <option value="">בחר שיעור...</option>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.metadata?.lessonName || `הקלטה ${lesson.id}`} - {new Date(lesson.created_at).toLocaleDateString('he-IL')}
                  </option>
                ))}
              </LessonDropdown>
              
              {lessons.length === 0 && !loading && (
                <div style={{ color: 'var(--color-textSecondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  אין שיעורים זמינים עם תמליל. אנא צור תמליל לשיעור תחילה.
                </div>
              )}
            </LessonSelector>

            {selectedLesson && (
              <LessonInfo>
                <LessonInfoRow>
                  <LessonInfoLabel>שם השיעור:</LessonInfoLabel>
                  <LessonInfoValue>{selectedLesson.metadata?.lessonName || `הקלטה ${selectedLesson.id}`}</LessonInfoValue>
                </LessonInfoRow>
                <LessonInfoRow>
                  <LessonInfoLabel>תאריך:</LessonInfoLabel>
                  <LessonInfoValue>{new Date(selectedLesson.created_at).toLocaleDateString('he-IL')}</LessonInfoValue>
                </LessonInfoRow>
                <LessonInfoRow>
                  <LessonInfoLabel>משך:</LessonInfoLabel>
                  <LessonInfoValue>{Math.floor((selectedLesson.metadata?.duration || 0) / 60)} דקות</LessonInfoValue>
                </LessonInfoRow>
                <LessonInfoRow>
                  <LessonInfoLabel>אורך תמליל:</LessonInfoLabel>
                  <LessonInfoValue>{selectedLesson.aiContent?.transcription?.transcription_text?.length || 0} תווים</LessonInfoValue>
                </LessonInfoRow>
              </LessonInfo>
            )}

            <ConfigSection>
              <ConfigGroup>
                <ConfigLabel>מספר כרטיסים</ConfigLabel>
                <ConfigInput
                  type="number"
                  min="5"
                  max="20"
                  value={config.cardCount}
                  onChange={(e) => setConfig(prev => ({ ...prev, cardCount: parseInt(e.target.value) || 10 }))}
                />
              </ConfigGroup>

              <ConfigGroup>
                <ConfigLabel>רמת קושי</ConfigLabel>
                <ConfigSelect
                  value={config.difficultyLevel}
                  onChange={(e) => setConfig(prev => ({ ...prev, difficultyLevel: e.target.value }))}
                >
                  <option value="easy">קל</option>
                  <option value="medium">בינוני</option>
                  <option value="hard">קשה</option>
                </ConfigSelect>
              </ConfigGroup>

              <ConfigGroup>
                <ConfigLabel>תחום לימוד</ConfigLabel>
                <ConfigInput
                  type="text"
                  value={config.subjectArea}
                  onChange={(e) => setConfig(prev => ({ ...prev, subjectArea: e.target.value }))}
                  placeholder="מתמטיקה, עברית, מדעים..."
                />
              </ConfigGroup>

              <ConfigGroup>
                <ConfigLabel>רמת כיתה</ConfigLabel>
                <ConfigInput
                  type="text"
                  value={config.gradeLevel}
                  onChange={(e) => setConfig(prev => ({ ...prev, gradeLevel: e.target.value }))}
                  placeholder="כיתה ג', כיתות ד-ו..."
                />
              </ConfigGroup>
            </ConfigSection>

            <div style={{ textAlign: 'center' }}>
              <GenerateButton
                onClick={handleGenerateCards}
                disabled={!selectedLesson || loading}
              >
                צור כרטיסים
              </GenerateButton>
            </div>
          </StepContent>
        );

      case 2:
        return (
          <StepContent>
            <ProgressSection>
              <ProgressText>יוצר כרטיסי זיכרון מהשיעור...</ProgressText>
              <ProgressBar>
                <ProgressFill progress={generationProgress} />
              </ProgressBar>
              <ProgressSubtext>
                {generationProgress < 30 && 'מנתח את תוכן השיעור...'}
                {generationProgress >= 30 && generationProgress < 60 && 'מזהה נושאים מרכזיים...'}
                {generationProgress >= 60 && generationProgress < 90 && 'יוצר שאלות ותשובות...'}
                {generationProgress >= 90 && 'מסיים את התהליך...'}
              </ProgressSubtext>
            </ProgressSection>
          </StepContent>
        );

      case 3:
        return (
          <StepContent>
            <SelectionSummary>
              <SelectionInfo>
                <span>כרטיסים נבחרו:</span>
                <SelectionCount>
                  {selectedCards.size} מתוך {generatedCards.length}
                </SelectionCount>
              </SelectionInfo>
              <QuickActions>
                <ActionButton 
                  className="secondary" 
                  onClick={handleSelectAll}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  {selectedCards.size === generatedCards.length ? 'בטל בחירת הכל' : 'בחר הכל'}
                </ActionButton>
              </QuickActions>
            </SelectionSummary>

            <CardsGrid>
              {generatedCards.map((card, index) => (
                <CardContainer key={index} selected={selectedCards.has(index)}>
                  <CardCheckbox
                    type="checkbox"
                    checked={selectedCards.has(index)}
                    onChange={() => handleCardToggle(index)}
                  />
                  <MemoryCardPreview
                    card={card}
                    size="small"
                    showFlipHint={true}
                  />
                </CardContainer>
              ))}
            </CardsGrid>

            <SetSelector>
              <ConfigLabel>בחר היכן לשמור את הכרטיסים</ConfigLabel>
              <SetOptions>
                <SetOption>
                  <SetOptionRadio
                    type="radio"
                    name="setOption"
                    value="existing"
                    checked={setOption === 'existing'}
                    onChange={(e) => setSetOption(e.target.value)}
                  />
                  הוסף לסט קיים
                </SetOption>
                <SetOption>
                  <SetOptionRadio
                    type="radio"
                    name="setOption"
                    value="new"
                    checked={setOption === 'new'}
                    onChange={(e) => setSetOption(e.target.value)}
                  />
                  צור סט חדש
                </SetOption>
              </SetOptions>

              {setOption === 'existing' ? (
                <ConfigSelect
                  value={selectedSetId}
                  onChange={(e) => setSelectedSetId(e.target.value)}
                >
                  <option value="">בחר סט...</option>
                  {existingSets.map(set => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.totalCards || 0} כרטיסים)
                    </option>
                  ))}
                </ConfigSelect>
              ) : (
                <NewSetFields>
                  <ConfigGroup>
                    <ConfigLabel>שם הסט החדש</ConfigLabel>
                    <ConfigInput
                      type="text"
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                      placeholder="שם הסט..."
                    />
                  </ConfigGroup>
                  <ConfigGroup>
                    <ConfigLabel>תיאור (אופציונלי)</ConfigLabel>
                    <ConfigInput
                      type="text"
                      value={newSetDescription}
                      onChange={(e) => setNewSetDescription(e.target.value)}
                      placeholder="תיאור הסט..."
                    />
                  </ConfigGroup>
                </NewSetFields>
              )}
            </SetSelector>
          </StepContent>
        );

      default:
        return null;
    }
  };

  if (loading && currentStep === 1) {
    return (
      <Container>
        <LoadingSpinner />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          טוען שיעורים...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>יצירת כרטיסי זיכרון משיעור</Title>
          <Subtitle>צור כרטיסי זיכרון אוטומטית מתמליל השיעור באמצעות בינה מלאכותית</Subtitle>
        </div>
      </Header>

      {error && (
        <ErrorMessage style={{ marginBottom: '2rem' }}>
          {error}
        </ErrorMessage>
      )}

      {/* Step 1: Lesson Selection */}
      <StepContainer>
        <StepHeader>
          <StepNumber active={currentStep === 1} completed={currentStep > 1}>
            {currentStep > 1 ? '✓' : '1'}
          </StepNumber>
          <StepTitle>בחירת שיעור והגדרות</StepTitle>
        </StepHeader>
        {currentStep === 1 && renderStepContent()}
      </StepContainer>

      {/* Step 2: Generation Progress */}
      {currentStep >= 2 && (
        <StepContainer>
          <StepHeader>
            <StepNumber active={currentStep === 2} completed={currentStep > 2}>
              {currentStep > 2 ? '✓' : '2'}
            </StepNumber>
            <StepTitle>יצירת כרטיסים</StepTitle>
          </StepHeader>
          {currentStep === 2 && renderStepContent()}
        </StepContainer>
      )}

      {/* Step 3: Review and Save */}
      {currentStep >= 3 && (
        <StepContainer>
          <StepHeader>
            <StepNumber active={currentStep === 3} completed={currentStep > 3}>
              {currentStep > 3 ? '✓' : '3'}
            </StepNumber>
            <StepTitle>בחירה ושמירה</StepTitle>
          </StepHeader>
          {currentStep === 3 && renderStepContent()}
        </StepContainer>
      )}

      {/* Action Buttons */}
      {currentStep === 3 && (
        <CardActions>
          <ActionButton 
            className="secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            ביטול
          </ActionButton>
          <ActionButton 
            className="primary" 
            onClick={handleSaveCards}
            disabled={loading || selectedCards.size === 0}
          >
            {loading ? 'שומר...' : `שמור ${selectedCards.size} כרטיסים`}
          </ActionButton>
        </CardActions>
      )}
    </Container>
  );
};

export default LessonToCardsWorkflow;
