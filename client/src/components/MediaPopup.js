import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import AudioPlayer from './AudioPlayer';
import VideoPlayer from './VideoPlayer';

// Styled components for the popup
const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  padding: 2rem;
  direction: rtl;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PopupContainer = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  transform: ${props => props.isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)'};
  transition: transform 0.3s ease;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const PopupHeader = styled.div`
  background: var(--color-primary, #2c3e50);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PopupTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
  font-family: 'Heebo', sans-serif;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background 0.2s ease;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
`;

const PopupContent = styled.div`
  padding: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const AudioPlayerContainer = styled.div`
  padding: 2rem;
  background: white;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const VideoPlayerContainer = styled.div`
  background: black;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--color-error, #e74c3c);
  background: white;
  font-family: 'Heebo', sans-serif;
`;

const LoadingSpinner = styled.div`
  padding: 2rem;
  text-align: center;
  background: white;
  font-family: 'Heebo', sans-serif;
  
  &::after {
    content: '';
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--color-primary, #3498db);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-top: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const MediaPopup = ({
  isOpen = false,
  onClose,
  mediaItem = null,
  mediaType = 'audio',
  t = (key) => key // Translation function fallback
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mediaBlob, setMediaBlob] = useState(null);
  const overlayRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose && onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose && onClose();
    }
  };

  // Load media when popup opens
  useEffect(() => {
    if (isOpen && mediaItem) {
      loadMedia();
    } else {
      // Clean up when popup closes
      setMediaBlob(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, mediaItem]);

  const loadMedia = async () => {
    if (!mediaItem) return;

    setIsLoading(true);
    setError(null);

    try {
      let blob = null;

      // Check if we already have a blob
      if (mediaItem.blob) {
        blob = mediaItem.blob;
      }
      // Check for direct URL
      else if (mediaItem.url || mediaItem.filePath || mediaItem.src) {
        const mediaUrl = mediaItem.url || mediaItem.filePath || mediaItem.src;
        
        // If it's already a blob URL, use it directly
        if (mediaUrl.startsWith('blob:')) {
          blob = mediaUrl;
        } else {
          // Fetch the media file
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`Failed to load media: ${response.statusText}`);
          }
          blob = await response.blob();
        }
      }
      // Try to construct URL from server
      else if (mediaItem.id || mediaItem.filename) {
        const mediaUrl = `/api/media/${mediaItem.id || mediaItem.filename}`;
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(`Failed to load media: ${response.statusText}`);
        }
        blob = await response.blob();
      }
      else {
        throw new Error('No media source available');
      }

      setMediaBlob(blob);
    } catch (err) {
      console.error('Error loading media:', err);
      setError(err.message || 'Failed to load media');
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaTitle = () => {
    if (!mediaItem) return t('media.untitled');
    return mediaItem.title || 
           mediaItem.name || 
           mediaItem.filename || 
           mediaItem.originalFileName || 
           t('media.untitled');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingSpinner>
          {t('forms.loading')}
        </LoadingSpinner>
      );
    }

    if (error) {
      return (
        <ErrorMessage>
          {t('errors.mediaLoadFailed')}: {error}
        </ErrorMessage>
      );
    }

    if (!mediaBlob) {
      return (
        <ErrorMessage>
          {t('errors.noMediaAvailable')}
        </ErrorMessage>
      );
    }

    if (mediaType === 'audio') {
      return (
        <AudioPlayerContainer>
          <AudioPlayer
            audioBlob={mediaBlob}
            title={getMediaTitle()}
            metadata={mediaItem}
            t={t}
            onClose={onClose}
          />
        </AudioPlayerContainer>
      );
    }

    if (mediaType === 'video') {
      return (
        <VideoPlayerContainer>
          <VideoPlayer
            videoBlob={mediaBlob}
            title={getMediaTitle()}
            metadata={mediaItem}
            onClose={onClose}
            autoPlay={false}
            showInfo={true}
            isPopup={true}
          />
        </VideoPlayerContainer>
      );
    }

    return (
      <ErrorMessage>
        {t('errors.unsupportedMediaType')}
      </ErrorMessage>
    );
  };

  if (!isOpen) return null;

  return (
    <PopupOverlay
      ref={overlayRef}
      isOpen={isOpen}
      onClick={handleOverlayClick}
    >
      <PopupContainer isOpen={isOpen}>
        <PopupHeader>
          <PopupTitle>
            {mediaType === 'audio' ? t('media.audioPlayer') : t('media.videoPlayer')}
          </PopupTitle>
          <CloseButton
            onClick={onClose}
            aria-label={t('actions.close')}
          >
            ✕
          </CloseButton>
        </PopupHeader>
        
        <PopupContent>
          {renderContent()}
        </PopupContent>
      </PopupContainer>
    </PopupOverlay>
  );
};

export default MediaPopup;
