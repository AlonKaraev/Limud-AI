import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 0.5rem 0;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StatusIcon = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  
  &.pending {
    background: var(--color-warning);
    color: var(--color-textOnPrimary);
  }
  
  &.processing {
    background: var(--color-primary);
    color: var(--color-textOnPrimary);
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  &.completed {
    background: var(--color-success);
    color: var(--color-textOnPrimary);
  }
  
  &.failed {
    background: var(--color-danger);
    color: var(--color-textOnPrimary);
  }
  
  &.not_started {
    background: var(--color-disabled);
    color: var(--color-textSecondary);
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const StatusText = styled.div`
  font-weight: 500;
  color: var(--color-text);
`;

const StatusDetails = styled.div`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  margin-top: 0.25rem;
`;

const TranscriptionPreview = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-top: 0.5rem;
  max-height: 100px;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-text);
`;

const ErrorMessage = styled.div`
  background: var(--color-dangerLight, #fadbd8);
  color: var(--color-danger);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  margin-top: 0.5rem;
  font-size: 0.8rem;
`;

const RetryButton = styled.button`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-primaryHover);
  }

  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const TranscriptionStatus = ({ recordingId, onTranscriptionComplete }) => {
  const [status, setStatus] = useState('not_started');
  const [transcription, setTranscription] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  // Poll for transcription status
  useEffect(() => {
    if (!recordingId) return;

    const pollStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/recordings/${recordingId}/transcription-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.transcriptionStatus);
          setJob(data.job);
          setTranscription(data.transcription);
          setError('');

          // Notify parent component when transcription is complete
          if (data.transcriptionStatus === 'completed' && data.transcription && onTranscriptionComplete) {
            onTranscriptionComplete(data.transcription);
          }
        } else {
          console.error('Failed to fetch transcription status');
        }
      } catch (error) {
        console.error('Error polling transcription status:', error);
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval - poll every 5 seconds
    const pollInterval = 5000;
    const interval = setInterval(pollStatus, pollInterval);

    return () => clearInterval(interval);
  }, [recordingId, status, onTranscriptionComplete]);

  const handleRetry = async () => {
    if (!recordingId || isRetrying) return;

    setIsRetrying(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות');
      }

      const response = await fetch(`/api/recordings/${recordingId}/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'openai',
          useEnhancedProcessing: true
        })
      });

      if (response.ok) {
        setStatus('pending');
        setJob(null);
        setTranscription(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בהתחלת התמלול');
      }
    } catch (error) {
      console.error('Error retrying transcription:', error);
      setError(error.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'not_started':
        return 'תמלול לא החל';
      case 'pending':
        return 'ממתין לתמלול...';
      case 'processing':
        return 'מתמלל...';
      case 'completed':
        return 'תמלול הושלם';
      case 'failed':
        return 'תמלול נכשל';
      default:
        return 'סטטוס לא ידוע';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'not_started':
        return '⏸️';
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    const seconds = Math.round(ms / 1000);
    return `${seconds} שניות`;
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Container>
      <StatusHeader>
        <StatusIcon className={status}>
          {getStatusIcon()}
        </StatusIcon>
        <StatusText>{getStatusText()}</StatusText>
      </StatusHeader>

      {job && (
        <StatusDetails>
          {job.startedAt && `התחל: ${new Date(job.startedAt).toLocaleString('he-IL')}`}
          {job.completedAt && ` • הושלם: ${new Date(job.completedAt).toLocaleString('he-IL')}`}
          {job.aiProvider && ` • ספק: ${job.aiProvider}`}
        </StatusDetails>
      )}

      {transcription && (
        <>
          <StatusDetails>
            שפה: {transcription.language === 'he' ? 'עברית' : transcription.language === 'en' ? 'אנגלית' : transcription.language}
            {transcription.confidenceScore && ` • רמת ביטחון: ${Math.round(transcription.confidenceScore * 100)}%`}
            {transcription.processingDuration && ` • זמן עיבוד: ${formatDuration(transcription.processingDuration)}`}
          </StatusDetails>
          <TranscriptionPreview>
            {truncateText(transcription.text)}
          </TranscriptionPreview>
        </>
      )}

      {status === 'failed' && (
        <>
          {job?.errorMessage && (
            <ErrorMessage>
              שגיאה: {job.errorMessage}
            </ErrorMessage>
          )}
          <RetryButton 
            onClick={handleRetry} 
            disabled={isRetrying}
          >
            {isRetrying ? 'מנסה שוב...' : 'נסה שוב'}
          </RetryButton>
        </>
      )}

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}
    </Container>
  );
};

export default TranscriptionStatus;
