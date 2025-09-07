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
  overflow: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
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

const MediaContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const AudioPlayer = styled.audio`
  width: 100%;
  max-width: 600px;
  height: 54px;
  border-radius: var(--radius-sm);
  background: var(--color-surfaceElevated);
`;

const VideoPlayer = styled.video`
  width: 100%;
  max-width: 800px;
  max-height: 60vh;
  border-radius: var(--radius-sm);
  background: var(--color-surfaceElevated);
`;

const DocumentViewer = styled.div`
  width: 100%;
  max-width: 800px;
  text-align: center;
`;

const DocumentPreview = styled.iframe`
  width: 100%;
  height: 60vh;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: white;
`;

const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 60vh;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const FileInfo = styled.div`
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-top: 1rem;
  width: 100%;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: var(--color-textSecondary);
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-family: 'Courier New', monospace;
`;

const UnsupportedMessage = styled.div`
  background: var(--color-warningLight);
  color: var(--color-warning);
  padding: 2rem;
  border-radius: var(--radius-sm);
  text-align: center;
  border: 1px solid var(--color-warningBorder);
`;

const DownloadButton = styled.button`
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
  margin-top: 1rem;

  &:hover {
    background: var(--color-primaryHover);
  }
`;

const MediaViewModal = ({ isOpen, onClose, mediaItem, mediaType }) => {
  // Always call hooks in the same order - don't conditionally call them
  const blobUrlsRef = useRef(new Set());
  const isClosingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState(null);

  // Optimized cleanup function
  const cleanupBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Error revoking blob URL:', error);
      }
    });
    blobUrlsRef.current.clear();
  }, []);

  // Handle modal close with proper cleanup
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    
    isClosingRef.current = true;
    cleanupBlobUrls();
    
    // Small delay to ensure cleanup completes before state updates
    setTimeout(() => {
      onClose();
      isClosingRef.current = false;
    }, 50);
  }, [onClose, cleanupBlobUrls]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isClosingRef.current) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      cleanupBlobUrls();
      setMediaUrl(null);
    }

    return () => {
      cleanupBlobUrls();
    };
  }, [isOpen, cleanupBlobUrls]);

  // Create media URL when modal opens and mediaItem changes
  useEffect(() => {
    if (isOpen && mediaItem) {
      const createMediaUrl = async () => {
        if (mediaItem.base64Data) {
          const url = createBlobUrl(mediaItem.base64Data);
          setMediaUrl(url);
        } else if (mediaItem.url || mediaItem.filePath || mediaItem.src) {
          const sourceUrl = mediaItem.url || mediaItem.filePath || mediaItem.src;
          
          // Check if this is a server-side authenticated URL
          if (sourceUrl.startsWith('/api/recordings/') && sourceUrl.includes('/stream')) {
            try {
              setLoading(true);
              const token = localStorage.getItem('token');
              
              if (!token) {
                console.error('No authentication token found');
                setMediaUrl(null);
                return;
              }

              const response = await fetch(sourceUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              
              // Track the blob URL for cleanup
              blobUrlsRef.current.add(blobUrl);
              setMediaUrl(blobUrl);
              
            } catch (error) {
              console.error('Error fetching authenticated media:', error);
              setMediaUrl(null);
            } finally {
              setLoading(false);
            }
          } else {
            // For non-authenticated URLs, use directly
            setMediaUrl(sourceUrl);
          }
        } else {
          setMediaUrl(null);
        }
      };
      
      createMediaUrl();
    }
  }, [isOpen, mediaItem]);

  // Handle overlay click with debouncing
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && !isClosingRef.current) {
      handleClose();
    }
  }, [handleClose]);

  // Optimized blob URL creation with proper cleanup tracking
  const createBlobUrl = useCallback((base64Data) => {
    if (isClosingRef.current) return null;
    
    try {
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mediaItem?.type });
      const url = URL.createObjectURL(blob);
      
      // Track the blob URL for cleanup
      blobUrlsRef.current.add(url);
      
      return url;
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return null;
    }
  }, [mediaItem?.type]);

  // Optimized download function
  const downloadFile = useCallback(async () => {
    if (isClosingRef.current || !mediaItem) return;
    
    let url;
    let filename = mediaItem?.title || mediaItem?.name || mediaItem?.filename || 'download';

    if (mediaItem?.base64Data) {
      url = createBlobUrl(mediaItem.base64Data);
    } else if (mediaItem?.url) {
      const sourceUrl = mediaItem.url;
      
      // Check if this is a server-side authenticated URL that needs special handling
      if (sourceUrl.startsWith('/api/recordings/')) {
        try {
          const token = localStorage.getItem('token');
          
          if (!token) {
            console.error('No authentication token found for download');
            return;
          }

          // Convert stream URL to download URL for proper Content-Disposition headers
          const downloadUrl = sourceUrl.replace('/stream', '/download');

          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();
          url = URL.createObjectURL(blob);
          
          // Track the blob URL for cleanup
          blobUrlsRef.current.add(url);
          
        } catch (error) {
          console.error('Error downloading authenticated media:', error);
          return;
        }
      } else {
        // For non-authenticated URLs, use directly
        url = sourceUrl;
      }
    } else {
      console.error('No download URL available');
      return;
    }

    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL if we created it
      if ((mediaItem?.base64Data || mediaItem?.url?.startsWith('/api/recordings/')) && blobUrlsRef.current.has(url)) {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          blobUrlsRef.current.delete(url);
        }, 1000);
      }
    }
  }, [mediaItem, createBlobUrl]);

  // Early return if modal is not open - but hooks are still called above
  if (!isOpen || !mediaItem) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return 'לא ידוע';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  const renderMediaContent = () => {
    switch (mediaType) {
      case 'audio':
        return (
          <MediaContainer>
            {mediaUrl ? (
              <AudioPlayer controls autoPlay={true}>
                <source src={mediaUrl} type={mediaItem.type} />
                הדפדפן שלך לא תומך בנגן האודיו.
              </AudioPlayer>
            ) : (
              <UnsupportedMessage>
                לא ניתן להציג את קובץ האודיו
              </UnsupportedMessage>
            )}
          </MediaContainer>
        );

      case 'video':
        return (
          <MediaContainer>
            {mediaUrl ? (
              <VideoPlayer controls autoPlay={true}>
                <source src={mediaUrl} type={mediaItem.type} />
                הדפדפן שלך לא תומך בנגן הווידאו.
              </VideoPlayer>
            ) : (
              <UnsupportedMessage>
                לא ניתן להציג את קובץ הווידאו
              </UnsupportedMessage>
            )}
          </MediaContainer>
        );

      case 'image':
        return (
          <MediaContainer>
            {mediaUrl ? (
              <ImagePreview src={mediaUrl} alt={mediaItem.title || mediaItem.name} />
            ) : (
              <UnsupportedMessage>
                לא ניתן להציג את התמונה
              </UnsupportedMessage>
            )}
          </MediaContainer>
        );

      case 'document':
        const isPDF = mediaItem.type === 'application/pdf';
        
        return (
          <MediaContainer>
            <DocumentViewer>
              {isPDF && mediaUrl ? (
                <DocumentPreview
                  src={mediaUrl}
                  title={mediaItem.title || mediaItem.name}
                />
              ) : (
                <UnsupportedMessage>
                  <div style={{ marginBottom: '1rem' }}>
                    📄 תצוגה מקדימה לא זמינה עבור סוג קובץ זה
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-textSecondary)' }}>
                    ניתן להוריד את הקובץ כדי לפתוח אותו ביישום המתאים
                  </div>
                </UnsupportedMessage>
              )}
            </DocumentViewer>
          </MediaContainer>
        );

      default:
        return (
          <UnsupportedMessage>
            סוג מדיה לא נתמך
          </UnsupportedMessage>
        );
    }
  };

  const getModalTitle = () => {
    const typeEmoji = {
      audio: '🎵',
      video: '🎬',
      document: '📄',
      image: '🖼️'
    };
    const title = mediaItem.title || mediaItem.name || mediaItem.filename || 'ללא שם';
    return `${typeEmoji[mediaType] || '📁'} ${title}`;
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{getModalTitle()}</ModalTitle>
          <CloseButton onClick={handleClose}>
            ✕ סגור
          </CloseButton>
        </ModalHeader>

        {renderMediaContent()}

        <FileInfo>
          <InfoRow>
            <InfoLabel>שם קובץ:</InfoLabel>
            <InfoValue>{mediaItem.title || mediaItem.name || mediaItem.filename || 'ללא שם'}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>גודל:</InfoLabel>
            <InfoValue>{formatFileSize(mediaItem.size || mediaItem.file_size || 0)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>סוג:</InfoLabel>
            <InfoValue>{getFileExtension(mediaItem.name || mediaItem.filename || '')} ({mediaItem.type || 'לא ידוע'})</InfoValue>
          </InfoRow>
          {mediaItem.duration && (
            <InfoRow>
              <InfoLabel>משך זמן:</InfoLabel>
              <InfoValue>{formatDuration(mediaItem.duration)}</InfoValue>
            </InfoRow>
          )}
          {(mediaItem.savedAt || mediaItem.created_at || mediaItem.createdAt) && (
            <InfoRow>
              <InfoLabel>נשמר:</InfoLabel>
              <InfoValue>{new Date(mediaItem.savedAt || mediaItem.created_at || mediaItem.createdAt).toLocaleString('he-IL')}</InfoValue>
            </InfoRow>
          )}
          {mediaItem.compressionInfo && (
            <InfoRow>
              <InfoLabel>דחיסה:</InfoLabel>
              <InfoValue>
                {formatFileSize(mediaItem.compressionInfo.originalSize)} → {formatFileSize(mediaItem.compressionInfo.compressedSize)} 
                ({mediaItem.compressionInfo.compressionRatio}% חיסכון)
              </InfoValue>
            </InfoRow>
          )}
          
          <DownloadButton onClick={downloadFile}>
            📥 הורד קובץ
          </DownloadButton>
        </FileInfo>
      </ModalContent>
    </ModalOverlay>
  );
};

export default MediaViewModal;
