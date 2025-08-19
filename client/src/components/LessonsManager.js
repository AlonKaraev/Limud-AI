import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #ecf0f1;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin: 0;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const LessonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
`;

const LessonCard = styled.div`
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafbfc;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

const LessonHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const LessonTitle = styled.h3`
  color: #2c3e50;
  margin: 0;
  font-size: 1.1rem;
`;

const LessonDate = styled.span`
  color: #7f8c8d;
  font-size: 0.9rem;
`;

const LessonInfo = styled.div`
  margin-bottom: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const InfoLabel = styled.span`
  color: #7f8c8d;
`;

const InfoValue = styled.span`
  color: #2c3e50;
  font-weight: 500;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  
  &.completed {
    background-color: #d5f4e6;
    color: #27ae60;
  }
  
  &.processing {
    background-color: #fef9e7;
    color: #f39c12;
  }
  
  &.failed {
    background-color: #fadbd8;
    color: #e74c3c;
  }
  
  &.pending {
    background-color: #ebf3fd;
    color: #3498db;
  }
`;

const ContentSection = styled.div`
  margin-bottom: 1rem;
`;

const ContentTitle = styled.h4`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
`;

const ContentPreview = styled.div`
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 0.9rem;
  color: #555;
  max-height: 100px;
  overflow-y: auto;
  line-height: 1.4;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  transition: all 0.2s;

  &.primary {
    background-color: #3498db;
    color: white;
  }

  &.primary:hover {
    background-color: #2980b9;
  }

  &.secondary {
    background-color: #95a5a6;
    color: white;
  }

  &.secondary:hover {
    background-color: #7f8c8d;
  }

  &.success {
    background-color: #27ae60;
    color: white;
  }

  &.success:hover {
    background-color: #229954;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  background-color: #fadbd8;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
`;

const ProcessingModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const ModalTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 1rem;
`;

const ProcessingOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: right;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const CheckboxLabel = styled.label`
  color: #2c3e50;
  cursor: pointer;
`;

const LessonsManager = ({ t }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingModal, setProcessingModal] = useState(null);
  const [processingOptions, setProcessingOptions] = useState({
    generateSummary: true,
    generateQuestions: true
  });

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      const data = await response.json();
      
      // Fetch AI content for each recording
      const lessonsWithContent = await Promise.all(
        data.recordings.map(async (recording) => {
          try {
            const contentResponse = await fetch(`/api/ai-content/content/${recording.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            let aiContent = null;
            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              aiContent = contentData.content;
            }

            return {
              ...recording,
              aiContent
            };
          } catch (error) {
            console.error(`Error fetching AI content for recording ${recording.id}:`, error);
            return {
              ...recording,
              aiContent: null
            };
          }
        })
      );

      setLessons(lessonsWithContent);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('שגיאה בטעינת השיעורים');
    } finally {
      setLoading(false);
    }
  };

  const startAIProcessing = async (recordingId) => {
    try {
      const token = localStorage.getItem('token');
      const processingTypes = [];
      
      if (processingOptions.generateSummary) {
        processingTypes.push('summary');
      }
      if (processingOptions.generateQuestions) {
        processingTypes.push('questions');
      }
      
      const response = await fetch('/api/ai-content/process-recording', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recordingId,
          processingOptions: processingTypes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start AI processing');
      }

      const data = await response.json();
      console.log('AI processing started:', data);

      // Close modal and refresh lessons
      setProcessingModal(null);
      fetchLessons();

      // Show success message
      alert('עיבוד AI התחיל בהצלחה! תוכל לראות את התוצאות כאן כשהעיבוד יסתיים.');
    } catch (error) {
      console.error('Error starting AI processing:', error);
      alert('שגיאה בהתחלת עיבוד AI');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getAIStatus = (lesson) => {
    if (!lesson.aiContent) {
      return 'pending';
    }

    const { transcription, summary, questions } = lesson.aiContent;
    
    if (transcription && summary && questions?.length > 0) {
      return 'completed';
    } else if (transcription || summary || questions?.length > 0) {
      return 'processing';
    } else {
      return 'pending';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'הושלם';
      case 'processing':
        return 'בעיבוד';
      case 'failed':
        return 'נכשל';
      case 'pending':
      default:
        return 'ממתין';
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingMessage>טוען שיעורים...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
        <RefreshButton onClick={fetchLessons}>נסה שוב</RefreshButton>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Header>
          <Title>שיעורים</Title>
          <RefreshButton onClick={fetchLessons}>רענן</RefreshButton>
        </Header>

        {lessons.length === 0 ? (
          <EmptyState>
            <h3>אין שיעורים עדיין</h3>
            <p>השתמש בלשונית "הקלטת שיעור" כדי להקליט שיעור חדש</p>
          </EmptyState>
        ) : (
          <LessonGrid>
            {lessons.map((lesson) => {
              const aiStatus = getAIStatus(lesson);
              const { aiContent } = lesson;

              return (
                <LessonCard key={lesson.id}>
                  <LessonHeader>
                    <LessonTitle>
                      {lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}
                    </LessonTitle>
                    <LessonDate>{formatDate(lesson.created_at)}</LessonDate>
                  </LessonHeader>

                  <LessonInfo>
                    <InfoRow>
                      <InfoLabel>משך:</InfoLabel>
                      <InfoValue>{formatDuration(lesson.metadata?.duration || 0)}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>גודל קובץ:</InfoLabel>
                      <InfoValue>{formatFileSize(lesson.file_size)}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>סטטוס AI:</InfoLabel>
                      <StatusBadge className={aiStatus}>
                        {getStatusText(aiStatus)}
                      </StatusBadge>
                    </InfoRow>
                  </LessonInfo>

                  {aiContent?.transcription && (
                    <ContentSection>
                      <ContentTitle>תמליל</ContentTitle>
                      <ContentPreview>
                        {aiContent.transcription.transcription_text.substring(0, 150)}
                        {aiContent.transcription.transcription_text.length > 150 && '...'}
                      </ContentPreview>
                    </ContentSection>
                  )}

                  {aiContent?.summary && (
                    <ContentSection>
                      <ContentTitle>סיכום</ContentTitle>
                      <ContentPreview>
                        {aiContent.summary.summary_text.substring(0, 150)}
                        {aiContent.summary.summary_text.length > 150 && '...'}
                      </ContentPreview>
                    </ContentSection>
                  )}

                  {aiContent?.questions && aiContent.questions.length > 0 && (
                    <ContentSection>
                      <ContentTitle>שאלות ({aiContent.questions.length})</ContentTitle>
                      <ContentPreview>
                        <strong>שאלה לדוגמה:</strong><br />
                        {aiContent.questions[0].question_text}
                      </ContentPreview>
                    </ContentSection>
                  )}

                  <ActionButtons>
                    <ActionButton 
                      className="primary"
                      onClick={() => {
                        // Play audio functionality would go here
                        const audio = new Audio(`/api/recordings/${lesson.id}/download`);
                        audio.play();
                      }}
                    >
                      השמע
                    </ActionButton>

                    {aiStatus === 'pending' && (
                      <ActionButton 
                        className="success"
                        onClick={() => setProcessingModal(lesson)}
                      >
                        צור תוכן AI
                      </ActionButton>
                    )}

                    {aiContent?.transcription && (
                      <ActionButton 
                        className="secondary"
                        onClick={() => {
                          // View full transcription
                          alert(aiContent.transcription.transcription_text);
                        }}
                      >
                        תמליל מלא
                      </ActionButton>
                    )}

                    {aiContent?.summary && (
                      <ActionButton 
                        className="secondary"
                        onClick={() => {
                          // View full summary
                          alert(aiContent.summary.summary_text);
                        }}
                      >
                        סיכום מלא
                      </ActionButton>
                    )}

                    {aiContent?.questions && aiContent.questions.length > 0 && (
                      <ActionButton 
                        className="secondary"
                        onClick={() => {
                          // View all questions
                          const questionsText = aiContent.questions.map((q, i) => 
                            `שאלה ${i + 1}: ${q.question_text}\n${q.answer_options?.map((opt, j) => `${String.fromCharCode(97 + j)}) ${opt}`).join('\n') || ''}\nתשובה נכונה: ${q.correct_answer}\n`
                          ).join('\n---\n');
                          alert(questionsText);
                        }}
                      >
                        כל השאלות
                      </ActionButton>
                    )}
                  </ActionButtons>
                </LessonCard>
              );
            })}
          </LessonGrid>
        )}
      </Container>

      {processingModal && (
        <ProcessingModal>
          <ModalContent>
            <ModalTitle>צור תוכן AI עבור השיעור</ModalTitle>
            <p>בחר איזה תוכן תרצה ליצור:</p>
            
            <ProcessingOptions>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="generateSummary"
                  checked={processingOptions.generateSummary}
                  onChange={(e) => setProcessingOptions({
                    ...processingOptions,
                    generateSummary: e.target.checked
                  })}
                />
                <CheckboxLabel htmlFor="generateSummary">
                  צור סיכום של השיעור
                </CheckboxLabel>
              </CheckboxGroup>

              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="generateQuestions"
                  checked={processingOptions.generateQuestions}
                  onChange={(e) => setProcessingOptions({
                    ...processingOptions,
                    generateQuestions: e.target.checked
                  })}
                />
                <CheckboxLabel htmlFor="generateQuestions">
                  צור שאלות בחינה (10 שאלות)
                </CheckboxLabel>
              </CheckboxGroup>
            </ProcessingOptions>

            <ActionButtons>
              <ActionButton 
                className="success"
                onClick={() => startAIProcessing(processingModal.id)}
                disabled={!processingOptions.generateSummary && !processingOptions.generateQuestions}
              >
                התחל עיבוד
              </ActionButton>
              <ActionButton 
                className="secondary"
                onClick={() => setProcessingModal(null)}
              >
                ביטול
              </ActionButton>
            </ActionButtons>
          </ModalContent>
        </ProcessingModal>
      )}
    </>
  );
};

export default LessonsManager;
