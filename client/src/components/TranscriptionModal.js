import React from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  width: 100%;
  max-width: 800px;
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
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: var(--color-danger);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: var(--color-dangerHover);
  }

  &:focus {
    outline: 2px solid var(--color-dangerLight);
    outline-offset: 2px;
  }
`;

const TranscriptionInfo = styled.div`
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-textSecondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

const TranscriptionContent = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  line-height: 1.6;
  font-size: 1rem;
  color: var(--color-text);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
`;

const NoTranscriptionMessage = styled.div`
  background: var(--color-warningLight);
  color: var(--color-warning);
  padding: 2rem;
  border-radius: var(--radius-sm);
  text-align: center;
  border: 1px solid var(--color-warningBorder);
`;

const LoadingMessage = styled.div`
  background: var(--color-primaryLight);
  color: var(--color-primary);
  padding: 2rem;
  border-radius: var(--radius-sm);
  text-align: center;
  border: 1px solid var(--color-primaryBorder);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primaryLight);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CopyButton = styled.button`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;

  &:hover {
    background: var(--color-primaryHover);
  }

  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const EditButton = styled.button`
  background: var(--color-secondary);
  color: var(--color-textOnSecondary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  margin-left: 0.5rem;

  &:hover {
    background: var(--color-secondaryHover);
  }

  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const EditingContainer = styled.div`
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  margin-top: 1rem;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-surface);
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-color: var(--color-primary);
  }
`;

const EditReasonInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-surface);
  margin-top: 1rem;

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  background: var(--color-success);
  color: var(--color-textOnSuccess);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: var(--color-successHover);
  }

  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  background: var(--color-textSecondary);
  color: var(--color-textOnSecondary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: var(--color-textSecondaryHover);
  }
`;

const EditedBadge = styled.span`
  background: var(--color-warningLight);
  color: var(--color-warning);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 0.5rem;
`;

const TranscriptionModal = ({ isOpen, onClose, recordingId, mediaName, mediaType }) => {
  const [transcription, setTranscription] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState('');
  const [editReason, setEditReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Fetch transcription when modal opens
  React.useEffect(() => {
    if (isOpen && recordingId) {
      fetchTranscription();
    }
  }, [isOpen, recordingId]);

  // Handle escape key press
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchTranscription = async () => {
    setLoading(true);
    setError('');
    setTranscription(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות');
      }

      const response = await fetch(`/api/recordings/${recordingId}/transcription-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.transcription) {
          setTranscription(data.transcription);
        } else {
          setError('תמלול לא זמין עדיין');
        }
      } else {
        throw new Error('שגיאה בטעינת התמלול');
      }
    } catch (error) {
      console.error('Error fetching transcription:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const copyToClipboard = async () => {
    if (!transcription?.text) return;

    try {
      await navigator.clipboard.writeText(transcription.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy transcription:', error);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLanguageName = (code) => {
    const languages = {
      'he': 'עברית',
      'en': 'אנגלית',
      'ar': 'ערבית',
      'es': 'ספרדית',
      'fr': 'צרפתית',
      'de': 'גרמנית',
      'ru': 'רוסית'
    };
    return languages[code] || code;
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditedText(transcription.text);
    setEditReason('');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedText('');
    setEditReason('');
  };

  const saveEdit = async () => {
    if (!editedText.trim()) {
      alert('נא להזין טקסט תמלול');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות');
      }

      const response = await fetch(`/api/recordings/${recordingId}/transcription`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          editedText: editedText.trim(),
          editReason: editReason.trim() || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update transcription with edited version
        setTranscription(prev => ({
          ...prev,
          text: data.transcription.text,
          isEdited: data.transcription.isEdited,
          editedAt: data.transcription.editedAt,
          editedBy: data.transcription.editedBy
        }));
        setIsEditing(false);
        setEditedText('');
        setEditReason('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בשמירת העריכה');
      }
    } catch (error) {
      console.error('Error saving transcription edit:', error);
      alert(`שגיאה בשמירת העריכה: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            📝 תמלול - {mediaName}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            ✕ סגור
          </CloseButton>
        </ModalHeader>

        {loading && (
          <LoadingMessage>
            <Spinner />
            טוען תמלול...
          </LoadingMessage>
        )}

        {error && !loading && (
          <NoTranscriptionMessage>
            {error}
          </NoTranscriptionMessage>
        )}

        {transcription && !loading && (
          <>
            <TranscriptionInfo>
              <InfoItem>
                <InfoLabel>שפה</InfoLabel>
                <InfoValue>{getLanguageName(transcription.language)}</InfoValue>
              </InfoItem>
              {transcription.confidenceScore && (
                <InfoItem>
                  <InfoLabel>רמת ביטחון</InfoLabel>
                  <InfoValue>{Math.round(transcription.confidenceScore * 100)}%</InfoValue>
                </InfoItem>
              )}
              {transcription.processingDuration && (
                <InfoItem>
                  <InfoLabel>זמן עיבוד</InfoLabel>
                  <InfoValue>{formatDuration(transcription.processingDuration)}</InfoValue>
                </InfoItem>
              )}
              {transcription.createdAt && (
                <InfoItem>
                  <InfoLabel>תאריך יצירה</InfoLabel>
                  <InfoValue>{new Date(transcription.createdAt).toLocaleString('he-IL')}</InfoValue>
                </InfoItem>
              )}
            </TranscriptionInfo>

            <TranscriptionContent>
              {transcription.text}
              {transcription.isEdited && (
                <EditedBadge>נערך</EditedBadge>
              )}
            </TranscriptionContent>

            {!isEditing && (
              <ButtonGroup>
                <CopyButton onClick={copyToClipboard} disabled={!transcription.text}>
                  {copied ? '✅ הועתק!' : '📋 העתק תמלול'}
                </CopyButton>
                <EditButton onClick={startEditing} disabled={!transcription.text}>
                  ✏️ ערוך תמלול
                </EditButton>
              </ButtonGroup>
            )}

            {isEditing && (
              <EditingContainer>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>עריכת תמלול</h3>
                <EditTextarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  placeholder="ערוך את טקסט התמלול כאן..."
                />
                <EditReasonInput
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="סיבת העריכה (אופציונלי)"
                />
                <EditActions>
                  <CancelButton onClick={cancelEditing} disabled={saving}>
                    ✕ ביטול
                  </CancelButton>
                  <SaveButton onClick={saveEdit} disabled={saving || !editedText.trim()}>
                    {saving ? (
                      <>
                        <Spinner style={{ width: '16px', height: '16px' }} />
                        שומר...
                      </>
                    ) : (
                      <>
                        ✓ שמור
                      </>
                    )}
                  </SaveButton>
                </EditActions>
              </EditingContainer>
            )}
          </>
        )}

        {!transcription && !loading && !error && (
          <NoTranscriptionMessage>
            תמלול לא זמין עבור קובץ זה
          </NoTranscriptionMessage>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default TranscriptionModal;
