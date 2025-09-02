import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-lg, 12px);
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
  direction: rtl;

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

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 2px solid var(--color-border, #e9ecef);
`;

const ModalTitle = styled.h2`
  color: var(--color-text, #2c3e50);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: var(--color-textSecondary, #6c757d);
  color: var(--color-textOnPrimary, white);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast, all 0.2s);

  &:hover {
    background: var(--color-text, #5a6268);
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: var(--color-text, #2c3e50);
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionDescription = styled.p`
  color: var(--color-textSecondary, #7f8c8d);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const ContentTypesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ContentTypeCard = styled.div`
  border: 2px solid ${props => props.selected ? 'var(--color-primary, #3498db)' : 'var(--color-border, #e9ecef)'};
  border-radius: var(--radius-md, 8px);
  padding: 1.5rem;
  cursor: pointer;
  transition: var(--transition-medium, all 0.3s);
  background: ${props => props.selected ? 'var(--color-primaryLight, #f0f8ff)' : 'var(--color-surface, white)'};
  position: relative;
  
  &:hover {
    border-color: var(--color-primary, #3498db);
    background: var(--color-primaryLight, #f0f8ff);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-surfaceDisabled, #f8f9fa);
    border-color: var(--color-border, #e9ecef);
    
    &:hover {
      transform: none;
      box-shadow: none;
      border-color: var(--color-border, #e9ecef);
      background: var(--color-surfaceDisabled, #f8f9fa);
    }
  }
`;

const ContentTypeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ContentTypeIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: ${props => {
    if (props.available) return 'var(--color-success, #27ae60)';
    if (props.processing) return 'var(--color-warning, #f39c12)';
    if (props.failed) return 'var(--color-danger, #e74c3c)';
    return 'var(--color-primary, #3498db)';
  }};
  color: var(--color-textOnPrimary, white);
  flex-shrink: 0;
`;

const ContentTypeInfo = styled.div`
  flex: 1;
`;

const ContentTypeTitle = styled.h4`
  margin: 0 0 0.25rem 0;
  color: var(--color-text, #2c3e50);
  font-size: 1.1rem;
  font-weight: 600;
`;

const ContentTypeStatus = styled.div`
  font-size: 0.85rem;
  color: ${props => {
    if (props.available) return 'var(--color-success, #27ae60)';
    if (props.processing) return 'var(--color-warning, #f39c12)';
    if (props.failed) return 'var(--color-danger, #e74c3c)';
    return 'var(--color-textSecondary, #7f8c8d)';
  }};
  font-weight: 500;
`;

const ContentTypeDescription = styled.p`
  margin: 0.75rem 0 0 0;
  font-size: 0.9rem;
  color: var(--color-textSecondary, #7f8c8d);
  line-height: 1.4;
`;

const Checkbox = styled.input`
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 20px;
  height: 20px;
  cursor: pointer;
  
  &:disabled {
    cursor: not-allowed;
  }
`;

const LanguageSection = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-md, 8px);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const LanguageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid ${props => props.selected ? 'var(--color-primary, #3498db)' : 'var(--color-border, #e9ecef)'};
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: var(--transition-fast, all 0.2s);
  background: ${props => props.selected ? 'var(--color-primaryLight, #f0f8ff)' : 'var(--color-surface, white)'};
  
  &:hover {
    border-color: var(--color-primary, #3498db);
    background: var(--color-primaryLight, #f0f8ff);
  }
`;

const LanguageRadio = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const LanguageLabel = styled.label`
  font-weight: 500;
  color: var(--color-text, #2c3e50);
  cursor: pointer;
  flex: 1;
`;

const LanguageFlag = styled.span`
  font-size: 1.5rem;
`;

const GuidanceSection = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-md, 8px);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const GuidanceTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 2px solid var(--color-border, #e9ecef);
  border-radius: var(--radius-sm, 6px);
  font-family: 'Heebo', sans-serif;
  font-size: 0.95rem;
  line-height: 1.5;
  resize: vertical;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary, #3498db);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  &::placeholder {
    color: var(--color-textTertiary, #95a5a6);
  }
`;

const CharacterCount = styled.div`
  text-align: left;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.overLimit ? 'var(--color-danger, #e74c3c)' : 'var(--color-textSecondary, #7f8c8d)'};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e9ecef);
`;

const ActionButton = styled.button`
  padding: 0.75rem 2rem;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-medium, all 0.3s);
  min-width: 120px;
  
  &.primary {
    background: linear-gradient(135deg, var(--color-success, #27ae60), var(--color-successHover, #229954));
    color: var(--color-textOnPrimary, white);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-successHover, #229954), var(--color-successActive, #1e8449));
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
    }
  }
  
  &.secondary {
    background: var(--color-textSecondary, #6c757d);
    color: var(--color-textOnPrimary, white);
    
    &:hover:not(:disabled) {
      background: var(--color-text, #5a6268);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ProgressSection = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border, #e9ecef);
`;

const ProgressTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: var(--color-text, #2c3e50);
  font-size: 1.1rem;
  font-weight: 600;
`;

const ProgressList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--color-surface, white);
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-borderLight, #f0f0f0);
`;

const ProgressIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
  
  &.pending {
    background-color: var(--color-disabled, #bdc3c7);
    color: var(--color-textOnPrimary, white);
  }
  
  &.processing {
    background-color: var(--color-warning, #f39c12);
    color: var(--color-textOnPrimary, white);
    animation: pulse 1.5s infinite;
  }
  
  &.completed {
    background-color: var(--color-success, #27ae60);
    color: var(--color-textOnPrimary, white);
  }
  
  &.failed {
    background-color: var(--color-danger, #e74c3c);
    color: var(--color-textOnPrimary, white);
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

const ProgressText = styled.div`
  flex: 1;
`;

const ProgressLabel = styled.div`
  font-weight: 500;
  color: var(--color-text, #2c3e50);
  margin-bottom: 0.25rem;
`;

const ProgressStatus = styled.div`
  font-size: 0.85rem;
  color: var(--color-textSecondary, #7f8c8d);
`;

const AIContentGenerationInterface = ({ 
  lesson, 
  onClose, 
  onGenerate, 
  isGenerating = false,
  generationProgress = {}
}) => {
  const [selectedContentTypes, setSelectedContentTypes] = useState({
    transcription: false,
    summary: false,
    questions: false,
    memoryCards: false
  });
  
  const [selectedLanguage, setSelectedLanguage] = useState('hebrew');
  const [customGuidance, setCustomGuidance] = useState('');
  
  const maxGuidanceLength = 500;

  // Initialize selected content types based on what's missing
  useEffect(() => {
    if (lesson?.aiContent) {
      const { aiContent } = lesson;
      setSelectedContentTypes({
        transcription: !aiContent.transcription?.transcription_text,
        summary: !aiContent.summary?.summary_text,
        questions: !aiContent.questions?.length,
        memoryCards: false // Always allow memory cards generation
      });
    } else {
      // If no AI content exists, select all by default
      setSelectedContentTypes({
        transcription: true,
        summary: true,
        questions: true,
        memoryCards: false
      });
    }
  }, [lesson]);

  const contentTypes = [
    {
      id: 'transcription',
      title: 'תמליל',
      icon: '📝',
      description: 'המרת הדיבור בהקלטה לטקסט מלא ומדויק',
      status: getContentStatus('transcription'),
      available: !!lesson?.aiContent?.transcription?.transcription_text,
      processing: generationProgress.transcription === 'processing',
      failed: generationProgress.transcription === 'failed'
    },
    {
      id: 'summary',
      title: 'סיכום',
      icon: '📋',
      description: 'סיכום מרוכז של נקודות המפתח והתובנות העיקריות',
      status: getContentStatus('summary'),
      available: !!lesson?.aiContent?.summary?.summary_text,
      processing: generationProgress.summary === 'processing',
      failed: generationProgress.summary === 'failed'
    },
    {
      id: 'questions',
      title: 'שאלות בחינה',
      icon: '❓',
      description: 'יצירת שאלות בחינה מגוונות לבדיקת הבנה והטמעה',
      status: getContentStatus('questions'),
      available: !!lesson?.aiContent?.questions?.length,
      processing: generationProgress.questions === 'processing',
      failed: generationProgress.questions === 'failed'
    },
    {
      id: 'memoryCards',
      title: 'כרטיסי זיכרון',
      icon: '🃏',
      description: 'כרטיסי זיכרון אינטראקטיביים לחזרה ולימוד עצמי',
      status: 'available', // Always available for generation
      available: true,
      processing: generationProgress.memoryCards === 'processing',
      failed: generationProgress.memoryCards === 'failed'
    }
  ];

  function getContentStatus(contentType) {
    if (generationProgress[contentType] === 'processing') return 'בעיבוד...';
    if (generationProgress[contentType] === 'failed') return 'נכשל';
    if (generationProgress[contentType] === 'completed') return 'הושלם';
    
    if (!lesson?.aiContent) return 'לא קיים';
    
    const content = lesson.aiContent[contentType];
    if (contentType === 'questions') {
      return content?.length > 0 ? `קיים (${content.length} שאלות)` : 'לא קיים';
    }
    return content?.transcription_text || content?.summary_text ? 'קיים' : 'לא קיים';
  }

  const handleContentTypeToggle = (contentTypeId) => {
    setSelectedContentTypes(prev => ({
      ...prev,
      [contentTypeId]: !prev[contentTypeId]
    }));
  };

  const handleGenerate = () => {
    const selectedTypes = Object.keys(selectedContentTypes).filter(
      key => selectedContentTypes[key]
    );
    
    if (selectedTypes.length === 0) {
      alert('אנא בחר לפחות סוג תוכן אחד ליצירה');
      return;
    }

    const config = {
      contentTypes: selectedTypes,
      language: selectedLanguage,
      customGuidance: customGuidance.trim(),
      lessonMetadata: lesson?.metadata || {}
    };

    onGenerate(config);
  };

  const isAnyContentSelected = Object.values(selectedContentTypes).some(Boolean);
  const isGuidanceOverLimit = customGuidance.length > maxGuidanceLength;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            🤖 יצירת תוכן AI - {lesson?.metadata?.lessonName || `הקלטה ${lesson?.id}`}
          </ModalTitle>
          <CloseButton onClick={onClose} disabled={isGenerating}>
            ✕
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Content Types Selection */}
          <Section>
            <SectionTitle>
              🎯 בחר סוגי תוכן ליצירה
            </SectionTitle>
            <SectionDescription>
              בחר את סוגי התוכן שברצונך ליצור באמצעות בינה מלאכותית. ניתן לבחור מספר סוגים בו-זמנית.
            </SectionDescription>
            
            <ContentTypesGrid>
              {contentTypes.map((contentType) => (
                <ContentTypeCard
                  key={contentType.id}
                  selected={selectedContentTypes[contentType.id]}
                  className={isGenerating ? 'disabled' : ''}
                  onClick={() => !isGenerating && handleContentTypeToggle(contentType.id)}
                >
                  <Checkbox
                    type="checkbox"
                    checked={selectedContentTypes[contentType.id]}
                    onChange={() => handleContentTypeToggle(contentType.id)}
                    disabled={isGenerating}
                  />
                  
                  <ContentTypeHeader>
                    <ContentTypeIcon
                      available={contentType.available}
                      processing={contentType.processing}
                      failed={contentType.failed}
                    >
                      {contentType.icon}
                    </ContentTypeIcon>
                    <ContentTypeInfo>
                      <ContentTypeTitle>{contentType.title}</ContentTypeTitle>
                      <ContentTypeStatus
                        available={contentType.available}
                        processing={contentType.processing}
                        failed={contentType.failed}
                      >
                        {contentType.status}
                      </ContentTypeStatus>
                    </ContentTypeInfo>
                  </ContentTypeHeader>
                  
                  <ContentTypeDescription>
                    {contentType.description}
                  </ContentTypeDescription>
                </ContentTypeCard>
              ))}
            </ContentTypesGrid>
          </Section>

          {/* Language Selection */}
          <Section>
            <LanguageSection>
              <SectionTitle>
                🌐 בחר שפת פלט
              </SectionTitle>
              <SectionDescription>
                בחר את השפה בה יופק התוכן. עברית היא ברירת המחדל המומלצת.
              </SectionDescription>
              
              <LanguageGrid>
                <LanguageOption
                  selected={selectedLanguage === 'hebrew'}
                  onClick={() => !isGenerating && setSelectedLanguage('hebrew')}
                >
                  <LanguageRadio
                    type="radio"
                    name="language"
                    value="hebrew"
                    checked={selectedLanguage === 'hebrew'}
                    onChange={() => setSelectedLanguage('hebrew')}
                    disabled={isGenerating}
                  />
                  <LanguageFlag>🇮🇱</LanguageFlag>
                  <LanguageLabel>עברית (ברירת מחדל)</LanguageLabel>
                </LanguageOption>
                
                <LanguageOption
                  selected={selectedLanguage === 'english'}
                  onClick={() => !isGenerating && setSelectedLanguage('english')}
                >
                  <LanguageRadio
                    type="radio"
                    name="language"
                    value="english"
                    checked={selectedLanguage === 'english'}
                    onChange={() => setSelectedLanguage('english')}
                    disabled={isGenerating}
                  />
                  <LanguageFlag>🇺🇸</LanguageFlag>
                  <LanguageLabel>English</LanguageLabel>
                </LanguageOption>
              </LanguageGrid>
            </LanguageSection>
          </Section>

          {/* Custom Guidance */}
          <Section>
            <GuidanceSection>
              <SectionTitle>
                💡 הנחיות מותאמות אישית (אופציונלי)
              </SectionTitle>
              <SectionDescription>
                הוסף הנחיות ספציפיות לבינה המלאכותית כדי להתאים את התוכן לצרכים שלך. 
                לדוגמה: רמת קושי, דגשים מיוחדים, סגנון כתיבה וכו'.
              </SectionDescription>
              
              <GuidanceTextarea
                value={customGuidance}
                onChange={(e) => setCustomGuidance(e.target.value)}
                placeholder="דוגמאות להנחיות:
• התמקד בנושאים הבסיסיים ביותר
• צור שאלות ברמת קושי בינונית
• השתמש בשפה פשוטה ומובנת
• הדגש את הנקודות החשובות ביותר
• התאם את התוכן לתלמידי כיתה ו'"
                disabled={isGenerating}
                maxLength={maxGuidanceLength}
              />
              
              <CharacterCount overLimit={isGuidanceOverLimit}>
                {customGuidance.length}/{maxGuidanceLength} תווים
                {isGuidanceOverLimit && ' (חריגה מהמגבלה)'}
              </CharacterCount>
            </GuidanceSection>
          </Section>

          {/* Generation Progress */}
          {isGenerating && (
            <ProgressSection>
              <ProgressTitle>🔄 מצב יצירת התוכן</ProgressTitle>
              <ProgressList>
                {Object.keys(selectedContentTypes)
                  .filter(key => selectedContentTypes[key])
                  .map(contentType => {
                    const type = contentTypes.find(t => t.id === contentType);
                    const status = generationProgress[contentType] || 'pending';
                    
                    return (
                      <ProgressItem key={contentType}>
                        <ProgressIcon className={status}>
                          {status === 'pending' && '⏳'}
                          {status === 'processing' && '⚙️'}
                          {status === 'completed' && '✅'}
                          {status === 'failed' && '❌'}
                        </ProgressIcon>
                        <ProgressText>
                          <ProgressLabel>{type?.title}</ProgressLabel>
                          <ProgressStatus>
                            {status === 'pending' && 'ממתין בתור...'}
                            {status === 'processing' && 'יוצר תוכן...'}
                            {status === 'completed' && 'הושלם בהצלחה!'}
                            {status === 'failed' && 'יצירה נכשלה'}
                          </ProgressStatus>
                        </ProgressText>
                      </ProgressItem>
                    );
                  })}
              </ProgressList>
            </ProgressSection>
          )}

          {/* Action Buttons */}
          <ActionButtons>
            <ActionButton
              className="secondary"
              onClick={onClose}
              disabled={isGenerating}
            >
              {isGenerating ? 'יצירה בתהליך...' : 'ביטול'}
            </ActionButton>
            <ActionButton
              className="primary"
              onClick={handleGenerate}
              disabled={!isAnyContentSelected || isGenerating || isGuidanceOverLimit}
            >
              {isGenerating ? 'יוצר תוכן...' : 'התחל יצירה'}
            </ActionButton>
          </ActionButtons>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AIContentGenerationInterface;
