import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  overflow: hidden;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
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

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--color-textSecondary);
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  background: var(--color-dangerLight, #fadbd8);
  color: var(--color-danger);
  padding: 2rem;
  border-radius: var(--radius-sm);
  text-align: center;
  border: 1px solid var(--color-dangerBorder, #f5b7b1);
  margin: 1rem 0;
`;

const TextContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const ExtractedText = styled.div`
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
  word-wrap: break-word;
  direction: ${props => props.isHebrew ? 'rtl' : 'ltr'};
  text-align: ${props => props.isHebrew ? 'right' : 'left'};
`;

const MetadataContainer = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
`;

const MetadataTitle = styled.h4`
  color: var(--color-text);
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
`;

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
`;

const MetadataItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-sm);
`;

const MetadataLabel = styled.span`
  font-weight: 500;
  color: var(--color-textSecondary);
  font-size: 0.9rem;
`;

const MetadataValue = styled.span`
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: 'Courier New', monospace;
`;

const ConfidenceScore = styled.span`
  background: ${props => {
    const confidence = props.confidence || 0;
    if (confidence >= 0.9) return 'var(--color-successLight, #d5f4e6)';
    if (confidence >= 0.7) return 'var(--color-warningLight, #fff3cd)';
    return 'var(--color-dangerLight, #fadbd8)';
  }};
  color: ${props => {
    const confidence = props.confidence || 0;
    if (confidence >= 0.9) return 'var(--color-success, #155724)';
    if (confidence >= 0.7) return 'var(--color-warning, #856404)';
    return 'var(--color-danger, #721c24)';
  }};
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: var(--color-primaryHover);
  }

  &:disabled {
    background: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const CopyButton = styled(ActionButton)`
  background: var(--color-success);
  
  &:hover {
    background: var(--color-successHover);
  }
`;

const EditButton = styled(ActionButton)`
  background: var(--color-info, #17a2b8);
  
  &:hover {
    background: var(--color-infoHover, #138496);
  }
`;

const ExtractedTextModal = ({ isOpen, onClose, documentId, documentName, mediaType = 'document' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extraction, setExtraction] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Add ref to prevent multiple simultaneous requests
  const loadingRef = useRef(false);

  // Handle escape key press
  useEffect(() => {
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

  // Fetch extracted text when modal opens
  useEffect(() => {
    console.log('🔍 ExtractedTextModal useEffect triggered:', { 
      isOpen, 
      documentId, 
      mediaType 
    });
    if (isOpen && documentId) {
      console.log('✅ Calling fetchExtractedText');
      fetchExtractedText();
    } else {
      console.log('❌ Not calling fetchExtractedText:', { 
        isOpenFalsy: !isOpen, 
        documentIdFalsy: !documentId 
      });
    }
  }, [isOpen, documentId]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Optimized text fetching with timeout and caching
  const fetchExtractedText = useCallback(async () => {
    console.log('🚀 fetchExtractedText called with:', { documentId, mediaType });
    
    if (loadingRef.current) {
      console.log('❌ fetchExtractedText aborted - already loading');
      return;
    }
    loadingRef.current = true;
    
    setLoading(true);
    setError('');
    setExtraction(null);

    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      if (!token) {
        console.log('❌ No token found');
        setError('נדרש להתחבר מחדש');
        return;
      }

      // Add timeout and caching
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Use correct endpoint based on media type
      let endpoint;
      if (mediaType === 'audio' || mediaType === 'video') {
        endpoint = `/api/recordings/${documentId}/transcription`;
      } else if (mediaType === 'image') {
        endpoint = `/api/images/${documentId}/text`;
      } else {
        endpoint = `/api/documents/${documentId}/text`;
      }
      
      console.log('🌐 Constructed endpoint:', endpoint);
      console.log('📤 Making API request...');
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'max-age=300' // 5 minute cache
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        console.log('✅ Response OK, parsing JSON...');
        const data = await response.json();
        console.log('📊 Response data:', data);
        console.log('🔍 Extraction object:', data.extraction);
        console.log('📝 Extracted text preview:', data.extraction?.text?.substring(0, 100) + '...');
        setExtraction(data.extraction);
        console.log('✅ Extraction set to state');
      } else {
        console.log('❌ Response not OK, parsing error...');
        const errorData = await response.json();
        console.log('❌ Error data:', errorData);
        setError(errorData.error || 'שגיאה בטעינת הטקסט המחולץ');
        console.log('❌ Error set to state:', errorData.error);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏰ Request aborted - timeout');
        setError('הבקשה נכשלה - זמן המתנה פג');
      } else {
        console.error('💥 Error fetching extracted text:', error);
        console.error('💥 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        setError('שגיאה בחיבור לשרת');
      }
    } finally {
      console.log('🏁 fetchExtractedText completed, cleaning up...');
      setLoading(false);
      loadingRef.current = false;
    }
  }, [documentId, mediaType]);

  const copyToClipboard = useCallback(async () => {
    if (!extraction?.text) return;

    try {
      await navigator.clipboard.writeText(extraction.text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = extraction.text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [extraction?.text]);

  const downloadAsText = useCallback(() => {
    if (!extraction?.text) return;

    const blob = new Blob([extraction.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName || 'document'}_extracted_text.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }, [extraction?.text, documentName]);

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'לא ידוע';
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds} שניות`;
    const minutes = Math.round(seconds / 60);
    return `${minutes} דקות`;
  };

  const detectLanguage = (text) => {
    if (!text) return false;
    // Simple Hebrew detection - check if text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {mediaType === 'audio' || mediaType === 'video' ? '🎵 תמלול' : '📄 טקסט מחולץ'} - {documentName}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            ✕ סגור
          </CloseButton>
        </ModalHeader>

        {loading && (
          <LoadingContainer>
            <LoadingSpinner />
            <div>{mediaType === 'audio' || mediaType === 'video' ? 'טוען תמלול...' : 'טוען טקסט מחולץ...'}</div>
          </LoadingContainer>
        )}

        {error && (
          <ErrorContainer>
            <strong>שגיאה:</strong> {error}
          </ErrorContainer>
        )}

        {extraction && (
          <>
            <MetadataContainer>
              <MetadataTitle>{mediaType === 'audio' || mediaType === 'video' ? 'פרטי התמלול' : 'פרטי החילוץ'}</MetadataTitle>
              <MetadataGrid>
                <MetadataItem>
                  <MetadataLabel>שיטת חילוץ:</MetadataLabel>
                  <MetadataValue>{extraction.method || 'לא ידוע'}</MetadataValue>
                </MetadataItem>
                
                {extraction.confidence && (
                  <MetadataItem>
                    <MetadataLabel>דיוק:</MetadataLabel>
                    <ConfidenceScore confidence={extraction.confidence}>
                      {Math.round(extraction.confidence * 100)}%
                    </ConfidenceScore>
                  </MetadataItem>
                )}
                
                {extraction.language && (
                  <MetadataItem>
                    <MetadataLabel>שפה מזוהה:</MetadataLabel>
                    <MetadataValue>
                      {extraction.language === 'hebrew' ? 'עברית' : 
                       extraction.language === 'english' ? 'אנגלית' : 
                       extraction.language}
                    </MetadataValue>
                  </MetadataItem>
                )}
                
                {extraction.processingDuration && (
                  <MetadataItem>
                    <MetadataLabel>זמן עיבוד:</MetadataLabel>
                    <MetadataValue>{formatDuration(extraction.processingDuration)}</MetadataValue>
                  </MetadataItem>
                )}
                
                {extraction.isEdited && (
                  <MetadataItem>
                    <MetadataLabel>סטטוס:</MetadataLabel>
                    <MetadataValue style={{ color: 'var(--color-info)' }}>נערך ידנית</MetadataValue>
                  </MetadataItem>
                )}
                
                <MetadataItem>
                  <MetadataLabel>תאריך חילוץ:</MetadataLabel>
                  <MetadataValue>
                    {new Date(extraction.createdAt).toLocaleDateString('he-IL')}
                  </MetadataValue>
                </MetadataItem>
              </MetadataGrid>
            </MetadataContainer>

            {/* Enhanced OCR Metadata Section */}
            {extraction.metadata && (
              <MetadataContainer>
                <MetadataTitle>🔍 פרטי OCR מתקדמים</MetadataTitle>
                <MetadataGrid>
                  {extraction.metadata.extractionMethod && (
                    <MetadataItem>
                      <MetadataLabel>שיטת עיבוד:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.extractionMethod}</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.imagesProcessed !== undefined && (
                    <MetadataItem>
                      <MetadataLabel>תמונות עובדו:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.imagesProcessed}</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.standardTextLength !== undefined && (
                    <MetadataItem>
                      <MetadataLabel>טקסט רגיל:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.standardTextLength} תווים</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.ocrTextLength !== undefined && (
                    <MetadataItem>
                      <MetadataLabel>טקסט OCR:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.ocrTextLength} תווים</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.slideCount !== undefined && (
                    <MetadataItem>
                      <MetadataLabel>מספר שקפים:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.slideCount}</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.pages !== undefined && (
                    <MetadataItem>
                      <MetadataLabel>מספר עמודים:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.pages}</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.languages && (
                    <MetadataItem>
                      <MetadataLabel>שפות OCR:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.languages}</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.wordCount !== undefined && (
                    <MetadataItem>
                      <MetadataLabel>מספר מילים:</MetadataLabel>
                      <MetadataValue>{extraction.metadata.wordCount}</MetadataValue>
                    </MetadataItem>
                  )}
                  
                  {extraction.metadata.note && (
                    <MetadataItem style={{ gridColumn: '1 / -1' }}>
                      <MetadataLabel>הערות:</MetadataLabel>
                      <MetadataValue style={{ fontFamily: 'inherit', fontSize: '0.85rem' }}>
                        {extraction.metadata.note}
                      </MetadataValue>
                    </MetadataItem>
                  )}
                </MetadataGrid>
              </MetadataContainer>
            )}

            <TextContainer>
              <ExtractedText isHebrew={detectLanguage(extraction.text)}>
                {extraction.text}
              </ExtractedText>
            </TextContainer>

            <ActionButtons>
              <CopyButton onClick={copyToClipboard}>
                {copySuccess ? '✅ הועתק!' : '📋 העתק טקסט'}
              </CopyButton>
              
              <ActionButton onClick={downloadAsText}>
                📥 הורד כקובץ טקסט
              </ActionButton>
              
              <EditButton onClick={() => {
                // TODO: Implement text editing functionality
                alert('עריכת טקסט תתווסף בעדכון הבא');
              }}>
                ✏️ ערוך טקסט
              </EditButton>
            </ActionButtons>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default ExtractedTextModal;
