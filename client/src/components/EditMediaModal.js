import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import TagInput from './TagInput';
import MetadataForm from './MetadataForm';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const ModalTitle = styled.h2`
  color: var(--color-text);
  margin: 0;
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-textSecondary);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-surfaceElevated);
    color: var(--color-text);
  }
`;

const ModalBody = styled.div`
  margin-bottom: 1.5rem;
`;

const MediaInfo = styled.div`
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
`;

const MediaName = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const MediaMeta = styled.div`
  font-size: 0.9rem;
  color: var(--color-textSecondary);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: var(--color-text);
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  background-color: var(--color-dangerLight, #fadbd8);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  border: 1px solid var(--color-dangerBorder, #f5b7b1);
`;

const SuccessMessage = styled.div`
  background-color: var(--color-successLight, #d5f4e6);
  color: var(--color-success);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  border: 1px solid var(--color-successBorder, #a9dfbf);
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  transition: var(--transition-fast);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: var(--color-surfaceElevated);
  color: var(--color-text);
  border: 1px solid var(--color-border);

  &:hover:not(:disabled) {
    background-color: var(--color-border);
  }
`;

const SaveButton = styled(Button)`
  background-color: var(--color-primary);
  color: var(--color-textOnPrimary);

  &:hover:not(:disabled) {
    background-color: var(--color-primaryHover);
  }
`;

const EditMediaModal = ({ 
  isOpen, 
  onClose, 
  mediaItem, 
  mediaType = 'audio',
  availableTags = [],
  onSave 
}) => {
  const [tags, setTags] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize form data when modal opens or mediaItem changes
  useEffect(() => {
    if (isOpen && mediaItem) {
      setTags(mediaItem.tags || []);
      setMetadata(mediaItem.metadata || {});
      setError('');
      setSuccess('');
    }
  }, [isOpen, mediaItem]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!mediaItem) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      // For server recordings, use the API
      if (mediaItem.isFromServer || mediaItem.serverRecordingId) {
        const recordingId = mediaItem.serverRecordingId || mediaItem.id;
        
        const response = await fetch(`/api/recordings/${recordingId}/tags-metadata`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags,
            metadata
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'שגיאה בעדכון הנתונים');
        }

        const result = await response.json();
        setSuccess('הנתונים עודכנו בהצלחה בשרת');
        
        // Call onSave callback with updated data
        if (onSave) {
          onSave({
            ...mediaItem,
            tags: result.recording.tags,
            metadata: result.recording.metadata,
            updatedAt: result.recording.updatedAt
          });
        }
      } else {
        // For local files, just call the callback
        setSuccess('הנתונים עודכנו בהצלחה');
        
        if (onSave) {
          onSave({
            ...mediaItem,
            tags,
            metadata
          });
        }
      }

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error updating media:', error);
      setError(`שגיאה בעדכון הנתונים: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return null;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  };

  const getMediaTypeName = () => {
    switch (mediaType) {
      case 'video':
        return 'ווידאו';
      case 'audio':
        return 'אודיו';
      case 'document':
        return 'מסמך';
      default:
        return 'קובץ';
    }
  };

  if (!isOpen || !mediaItem) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {getMediaTypeIcon()} עריכת {getMediaTypeName()}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            ×
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {error && (
            <ErrorMessage>
              <strong>שגיאה:</strong> {error}
            </ErrorMessage>
          )}

          {success && (
            <SuccessMessage>
              <strong>הצלחה:</strong> {success}
            </SuccessMessage>
          )}

          <MediaInfo>
            <MediaName>{mediaItem.name || mediaItem.filename}</MediaName>
            <MediaMeta>
              <span>{formatFileSize(mediaItem.size || mediaItem.file_size)}</span>
              {mediaItem.duration && (
                <span>משך: {formatDuration(mediaItem.duration)}</span>
              )}
              {mediaItem.savedAt && (
                <span>נשמר: {new Date(mediaItem.savedAt).toLocaleDateString('he-IL')}</span>
              )}
              {mediaItem.createdAt && (
                <span>נוצר: {new Date(mediaItem.createdAt).toLocaleDateString('he-IL')}</span>
              )}
            </MediaMeta>
          </MediaInfo>

          <Section>
            <SectionTitle>תגיות</SectionTitle>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder={`הוסף תגיות ל${getMediaTypeName()}...`}
              suggestions={availableTags}
              disabled={isLoading}
            />
          </Section>

          <Section>
            <SectionTitle>מטא-דאטה</SectionTitle>
            <MetadataForm
              fileData={{ ...mediaItem, metadata }}
              onChange={setMetadata}
              disabled={isLoading}
              mediaType={mediaType}
            />
          </Section>
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose} disabled={isLoading}>
            ביטול
          </CancelButton>
          <SaveButton onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'שומר...' : 'שמור שינויים'}
          </SaveButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default EditMediaModal;
