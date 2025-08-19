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

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;

  &:hover {
    background-color: #229954;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
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

const AIStatusSection = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  background: #f8f9fa;
  border-left: 4px solid #3498db;
`;

const StatusDetails = styled.div`
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.5rem;
`;

const ErrorDetails = styled.div`
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #c53030;
`;

const WarningDetails = styled.div`
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #d97706;
`;

const ServiceHealthIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  
  &.healthy {
    background-color: #f0f9ff;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }
  
  &.unhealthy {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
`;

const HealthDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  &.healthy {
    background-color: #10b981;
  }
  
  &.unhealthy {
    background-color: #ef4444;
  }
`;

const UploadModal = styled.div`
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

const UploadModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: #3498db;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;
  margin: 1rem 0;

  &:hover {
    background-color: #2980b9;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 2rem;
  margin: 1rem 0;
  text-align: center;
  transition: border-color 0.2s;

  &.dragover {
    border-color: #3498db;
    background-color: #f8f9fa;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #ecf0f1;
  border-radius: 4px;
  margin: 1rem 0;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #27ae60;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const FormGroup = styled.div`
  margin: 1rem 0;
  text-align: right;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  direction: rtl;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
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
  const [processingJobs, setProcessingJobs] = useState({});
  const [aiServiceHealth, setAiServiceHealth] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lessonName, setLessonName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchLessons();
    fetchAIServiceHealth();
    // Set up periodic refresh for processing jobs
    const interval = setInterval(() => {
      fetchProcessingJobs();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
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

  const fetchProcessingJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai-content/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const jobsMap = {};
        data.jobs.forEach(job => {
          jobsMap[job.recording_id] = job;
        });
        setProcessingJobs(jobsMap);
      }
    } catch (error) {
      console.error('Error fetching processing jobs:', error);
    }
  };

  const fetchAIServiceHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai-content/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiServiceHealth(data.health);
      }
    } catch (error) {
      console.error('Error fetching AI service health:', error);
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
      
      const response = await fetch(`/api/ai-content/process/${recordingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generateSummary: processingOptions.generateSummary,
          generateQuestions: processingOptions.generateQuestions
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

  const getAIStatusInfo = (lesson) => {
    const job = processingJobs[lesson.id];
    const { aiContent } = lesson;
    
    // Check if there's an active processing job
    if (job) {
      if (job.status === 'failed') {
        return {
          status: 'failed',
          text: 'נכשל',
          details: job.error_message || 'עיבוד AI נכשל',
          showError: true
        };
      } else if (job.status === 'processing') {
        return {
          status: 'processing',
          text: 'בעיבוד',
          details: `מעבד ${job.job_type}...`,
          showProgress: true
        };
      } else if (job.status === 'pending') {
        return {
          status: 'processing',
          text: 'ממתין בתור',
          details: 'המשימה ממתינה לעיבוד',
          showProgress: true
        };
      }
    }

    // Check AI content status
    if (!aiContent) {
      // Check if AI service is healthy
      if (aiServiceHealth && !aiServiceHealth.configuration.valid) {
        return {
          status: 'failed',
          text: 'שירות לא זמין',
          details: 'שירותי AI אינם מוגדרים כראוי',
          showError: true,
          configIssues: aiServiceHealth.configuration.issues
        };
      }
      return {
        status: 'pending',
        text: 'ממתין',
        details: 'לא הופק תוכן AI עדיין'
      };
    }

    const { transcription, summary, questions } = aiContent;
    
    // Check for errors in content
    const hasErrors = (transcription?.error) || (summary?.error) || (questions?.error);
    if (hasErrors) {
      const errors = [];
      if (transcription?.error) errors.push(`תמליל: ${transcription.error}`);
      if (summary?.error) errors.push(`סיכום: ${summary.error}`);
      if (questions?.error) errors.push(`שאלות: ${questions.error}`);
      
      return {
        status: 'failed',
        text: 'נכשל חלקית',
        details: 'חלק מהעיבוד נכשל',
        showError: true,
        errors
      };
    }
    
    // Check completion status
    if (transcription && summary && questions?.length > 0) {
      return {
        status: 'completed',
        text: 'הושלם',
        details: `תמליל, סיכום ו-${questions.length} שאלות`
      };
    } else if (transcription || summary || questions?.length > 0) {
      const completed = [];
      if (transcription) completed.push('תמליל');
      if (summary) completed.push('סיכום');
      if (questions?.length > 0) completed.push(`${questions.length} שאלות`);
      
      return {
        status: 'processing',
        text: 'הושלם חלקית',
        details: `הושלם: ${completed.join(', ')}`,
        showWarning: true
      };
    }

    return {
      status: 'pending',
      text: 'ממתין',
      details: 'לא הופק תוכן AI עדיין'
    };
  };

  const renderAIStatusSection = (lesson) => {
    const statusInfo = getAIStatusInfo(lesson);
    
    return (
      <AIStatusSection>
        <InfoRow>
          <InfoLabel>סטטוס AI:</InfoLabel>
          <StatusBadge className={statusInfo.status}>
            {statusInfo.text}
          </StatusBadge>
        </InfoRow>
        
        <StatusDetails>
          {statusInfo.details}
        </StatusDetails>

        {statusInfo.showError && (
          <ErrorDetails>
            <strong>שגיאה:</strong> {statusInfo.details}
            {statusInfo.errors && (
              <div style={{ marginTop: '0.5rem' }}>
                {statusInfo.errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            )}
            {statusInfo.configIssues && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>בעיות תצורה:</strong>
                {statusInfo.configIssues.map((issue, index) => (
                  <div key={index}>• {issue}</div>
                ))}
              </div>
            )}
          </ErrorDetails>
        )}

        {statusInfo.showWarning && (
          <WarningDetails>
            <strong>התראה:</strong> העיבוד לא הושלם במלואו. ייתכן שחלק מהשירותים נכשלו.
          </WarningDetails>
        )}
      </AIStatusSection>
    );
  };

  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('אנא בחר קובץ אודיו תקין');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      alert('גודל הקובץ חייב להיות קטן מ-100MB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-generate lesson name from file name if not set
    if (!lessonName) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setLessonName(fileName);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('אנא בחר קובץ לעלות');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('recordingId', `upload_${Date.now()}`);
      formData.append('metadata', JSON.stringify({
        lessonName: lessonName || selectedFile.name,
        uploadedAt: new Date().toISOString(),
        originalFileName: selectedFile.name
      }));

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        try {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            console.log('Upload successful:', response);
            
            if (response.success) {
              // Close modal and refresh lessons
              setUploadModal(false);
              setSelectedFile(null);
              setLessonName('');
              setUploadProgress(0);
              setUploading(false);
              
              // Refresh lessons list
              fetchLessons();
              
              alert('הקובץ הועלה בהצלחה!');
            } else {
              throw new Error(response.error || 'העלאה נכשלה');
            }
          } else {
            let errorMessage = `שגיאת שרת: ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorMessage;
            } catch (e) {
              // If response is not JSON, use status text
              errorMessage = xhr.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }
        } catch (parseError) {
          console.error('Error processing upload response:', parseError);
          throw new Error('שגיאה בעיבוד תגובת השרת: ' + parseError.message);
        }
      });

      // Handle network errors
      xhr.addEventListener('error', (e) => {
        console.error('Network error during upload:', e);
        throw new Error('שגיאת רשת - בדוק את החיבור לאינטרנט ושהשרת פועל');
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        throw new Error('זמן ההעלאה פג - הקובץ גדול מדי או החיבור איטי');
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        throw new Error('העלאה בוטלה');
      });

      // Set timeout (5 minutes for large files)
      xhr.timeout = 5 * 60 * 1000;

      // Start upload
      xhr.open('POST', '/api/recordings/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      console.log('Starting upload:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });
      
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      alert('שגיאה בהעלאת הקובץ: ' + error.message);
      setUploading(false);
      setUploadProgress(0);
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
          <HeaderButtons>
            <UploadButton onClick={() => setUploadModal(true)}>
              העלה הקלטה
            </UploadButton>
            <RefreshButton onClick={fetchLessons}>רענן</RefreshButton>
          </HeaderButtons>
        </Header>

        {/* AI Service Health Indicator */}
        {aiServiceHealth && (
          <ServiceHealthIndicator className={aiServiceHealth.configuration.valid ? 'healthy' : 'unhealthy'}>
            <HealthDot className={aiServiceHealth.configuration.valid ? 'healthy' : 'unhealthy'} />
            {aiServiceHealth.configuration.valid ? 'שירותי AI פעילים' : 'שירותי AI לא זמינים'}
            {!aiServiceHealth.configuration.valid && aiServiceHealth.configuration.issues && (
              <span style={{ marginRight: '0.5rem' }}>
                - {aiServiceHealth.configuration.issues[0]}
              </span>
            )}
          </ServiceHealthIndicator>
        )}

        {lessons.length === 0 ? (
          <EmptyState>
            <h3>אין שיעורים עדיין</h3>
            <p>השתמש בלשונית "הקלטת שיעור" כדי להקליט שיעור חדש</p>
          </EmptyState>
        ) : (
          <LessonGrid>
            {lessons.map((lesson) => {
              const statusInfo = getAIStatusInfo(lesson);
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
                  </LessonInfo>

                  {/* Enhanced AI Status Section */}
                  {renderAIStatusSection(lesson)}

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

                    {statusInfo.status === 'pending' && (
                      <ActionButton 
                        className="success"
                        onClick={() => setProcessingModal(lesson)}
                      >
                        צור תוכן AI
                      </ActionButton>
                    )}

                    {statusInfo.status === 'failed' && (
                      <ActionButton 
                        className="success"
                        onClick={() => setProcessingModal(lesson)}
                      >
                        נסה שוב
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

      {uploadModal && (
        <UploadModal>
          <UploadModalContent>
            <ModalTitle>העלה הקלטת שיעור</ModalTitle>
            
            <FormGroup>
              <FormLabel>שם השיעור</FormLabel>
              <FormInput
                type="text"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                placeholder="הכנס שם לשיעור"
              />
            </FormGroup>

            <UploadArea 
              className={dragOver ? 'dragover' : ''}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  handleFileSelect(files[0]);
                }
              }}
            >
              {selectedFile ? (
                <div>
                  <p>קובץ נבחר: {selectedFile.name}</p>
                  <p>גודל: {formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <p>גרור קובץ אודיו לכאן או</p>
                  <FileInputLabel htmlFor="fileInput">
                    בחר קובץ
                  </FileInputLabel>
                  <FileInput
                    id="fileInput"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      if (e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                    קבצי אודיו עד 100MB
                  </p>
                </div>
              )}
            </UploadArea>

            {uploading && (
              <div>
                <p>מעלה קובץ...</p>
                <ProgressBar>
                  <ProgressFill progress={uploadProgress} />
                </ProgressBar>
                <p>{uploadProgress}%</p>
              </div>
            )}

            <ActionButtons>
              <ActionButton 
                className="success"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'מעלה...' : 'העלה'}
              </ActionButton>
              <ActionButton 
                className="secondary"
                onClick={() => {
                  setUploadModal(false);
                  setSelectedFile(null);
                  setLessonName('');
                  setUploadProgress(0);
                  setUploading(false);
                }}
              >
                ביטול
              </ActionButton>
            </ActionButtons>
          </UploadModalContent>
        </UploadModal>
      )}
    </>
  );
};

export default LessonsManager;
