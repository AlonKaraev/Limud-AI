import React, { useState, useEffect, useCallback } from 'react';
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

// Individual transcription status component
const TranscriptionStatusItem = ({ recordingId, status, onTranscriptionComplete, onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!recordingId || isRetrying) return;

    setIsRetrying(true);

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
        if (onRetry) {
          onRetry(recordingId);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בהתחלת התמלול');
      }
    } catch (error) {
      console.error('Error retrying transcription:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusText = () => {
    switch (status.transcriptionStatus) {
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
    switch (status.transcriptionStatus) {
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

  // Notify parent component when transcription is complete
  useEffect(() => {
    if (status.transcriptionStatus === 'completed' && status.transcription && onTranscriptionComplete) {
      onTranscriptionComplete(status.transcription);
    }
  }, [status.transcriptionStatus, status.transcription, onTranscriptionComplete]);

  // Component runs in background for processing but renders nothing
  return null;
};

// Main bulk transcription status manager
const BulkTranscriptionStatusManager = ({ recordings, onTranscriptionComplete }) => {
  const [statuses, setStatuses] = useState({});
  const [error, setError] = useState('');

  // Extract recording IDs from recordings array
  const recordingIds = recordings.map(recording => recording.id).filter(Boolean);

  // Fetch bulk transcription status
  const fetchBulkStatus = useCallback(async () => {
    if (recordingIds.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/recordings/bulk-transcription-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recordingIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses || {});
        setError('');
      } else {
        console.error('Failed to fetch bulk transcription status');
        setError('שגיאה בטעינת סטטוס התמלול');
      }
    } catch (error) {
      console.error('Error fetching bulk transcription status:', error);
      setError('שגיאה בחיבור לשרת');
    }
  }, [recordingIds.join(',')]); // Use join to create a stable dependency

  // Poll for transcription status
  useEffect(() => {
    if (recordingIds.length === 0) return;

    // Initial fetch
    fetchBulkStatus();

    // Set up polling interval - poll every 5 seconds
    const pollInterval = 5000;
    const interval = setInterval(fetchBulkStatus, pollInterval);

    return () => clearInterval(interval);
  }, [fetchBulkStatus]);

  // Handle retry for individual recording
  const handleRetry = useCallback((recordingId) => {
    // Update status to pending for the retried recording
    setStatuses(prev => ({
      ...prev,
      [recordingId]: {
        ...prev[recordingId],
        transcriptionStatus: 'pending',
        job: null,
        transcription: null
      }
    }));
  }, []);

  if (error) {
    return (
      <ErrorMessage>
        <strong>שגיאה:</strong> {error}
      </ErrorMessage>
    );
  }

  return (
    <>
      {recordings.map(recording => {
        const status = statuses[recording.id] || {
          transcriptionStatus: 'not_started',
          job: null,
          transcription: null
        };

        return (
          <TranscriptionStatusItem
            key={recording.id}
            recordingId={recording.id}
            status={status}
            onTranscriptionComplete={onTranscriptionComplete}
            onRetry={handleRetry}
          />
        );
      })}
    </>
  );
};

export default BulkTranscriptionStatusManager;
