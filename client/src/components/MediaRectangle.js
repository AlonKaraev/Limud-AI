import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import MediaPopup from './MediaPopup';
import MediaMetadataForm from './MediaMetadataForm';

const RectangleContainer = styled.div`
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e9ecef);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  transition: all var(--transition-slow, 0.3s ease);
  cursor: pointer;
  height: 280px;
  width: 130%; /* Make media items 130% wider */
  display: flex;
  flex-direction: column;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px var(--color-shadowMedium, rgba(0, 0, 0, 0.15));
    border-color: var(--color-primary, #3498db);
  }
  
  &:focus {
    outline: 2px solid var(--color-primary, #3498db);
    outline-offset: 2px;
  }
`;

const ThumbnailArea = styled.div`
  height: 60%;
  position: relative;
  background: var(--color-surfaceElevated, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow, 0.3s ease);
  
  ${RectangleContainer}:hover & {
    transform: scale(1.05);
  }
`;

const MediaTypeIcon = styled.div`
  font-size: 2.5rem;
  color: var(--color-primary, #3498db);
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--color-surfaceElevated, #f8f9fa);
`;

const StatusIndicator = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
  z-index: 2;
  
  &.processing {
    background: var(--color-warning, #f39c12);
  }
  
  &.completed {
    background: var(--color-success, #27ae60);
  }
  
  &.failed {
    background: var(--color-error, #e74c3c);
  }
  
  &.pending {
    background: var(--color-info, #3498db);
  }
`;

const InfoArea = styled.div`
  height: 40%;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--color-surface, #ffffff);
`;

const MediaTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text, #2c3e50);
  line-height: 1.2;
  direction: rtl;
  text-align: right;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  /* Remove truncation - allow full title display */
  white-space: normal;
`;

const MediaMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.7rem;
  color: var(--color-textSecondary, #7f8c8d);
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &::before {
    content: '${props => props.icon || ''}';
    font-size: 0.8rem;
  }
`;

const TagsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
`;

const Tag = styled.span`
  background: var(--color-primary, #3498db);
  color: var(--color-textOnPrimary, #ffffff);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.6rem;
  font-weight: 500;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MoreTags = styled.span`
  background: var(--color-textSecondary, #7f8c8d);
  color: var(--color-textOnPrimary, #ffffff);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.6rem;
  font-weight: 500;
`;

const ActionButtons = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-height: 48px;
  max-height: 96px;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform var(--transition-fast, 0.2s ease);
  z-index: 10;
  
  ${RectangleContainer}:hover & {
    transform: translateY(0);
  }
  
  /* Ensure buttons are visible on smaller screens */
  @media (max-width: 480px) {
    padding: 0.25rem;
    gap: 0.25rem;
    min-height: 40px;
  }
  
  /* Handle overflow by allowing scrolling if needed */
  @media (max-width: 320px) {
    overflow-x: auto;
    overflow-y: hidden;
    flex-wrap: nowrap;
    justify-content: flex-start;
    
    &::-webkit-scrollbar {
      height: 2px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 1px;
    }
  }
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: var(--radius-sm, 4px);
  padding: 0.375rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text, #2c3e50);
  transition: all var(--transition-fast, 0.2s ease);
  min-width: 32px;
  min-height: 32px;
  max-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  white-space: nowrap;
  
  &:hover {
    background: white;
    transform: scale(1.1);
  }
  
  &:focus {
    outline: 2px solid var(--color-primary, #3498db);
    outline-offset: 1px;
  }
  
  &.primary {
    background: var(--color-primary, #3498db);
    color: var(--color-textOnPrimary, #ffffff);
  }
  
  &.primary:hover {
    background: var(--color-primaryHover, #2980b9);
  }
  
  &.danger {
    background: var(--color-error, #e74c3c);
    color: var(--color-textOnPrimary, #ffffff);
  }
  
  &.danger:hover {
    background: var(--color-errorHover, #c0392b);
  }
  
  /* Responsive adjustments */
  @media (max-width: 480px) {
    min-width: 28px;
    min-height: 28px;
    max-width: 40px;
    padding: 0.25rem;
    font-size: 0.7rem;
  }
  
  @media (max-width: 320px) {
    min-width: 24px;
    min-height: 24px;
    max-width: 36px;
    padding: 0.2rem;
    font-size: 0.6rem;
  }
`;

const WaveformPreview = styled.div`
  width: 100%;
  height: 40px;
  background: var(--color-surfaceElevated, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 1rem;
`;

const WaveformBar = styled.div`
  width: 3px;
  background: var(--color-primary, #3498db);
  border-radius: 1px;
  height: ${props => props.height || 20}%;
  opacity: 0.7;
  animation: pulse 2s infinite ease-in-out;
  animation-delay: ${props => props.delay || 0}s;
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.8;
    }
  }
`;

const MediaRectangle = ({
  mediaItem,
  mediaType = 'all',
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  onPlay,
  onViewTextOrTranscription,
  onMetadataUpdate,
  t = (key) => key // Translation function fallback
}) => {
  const [imageError, setImageError] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const containerRef = useRef(null);

  // Get media type icon with specific document type support
  const getMediaTypeIcon = (type, fileType, filename) => {
    if (type === 'audio' || fileType === 'audio') return '🎵';
    if (type === 'video' || fileType === 'video') return '🎥';
    if (type === 'image' || type === 'images') return '🖼️';
    
    // Handle document types with specific icons
    if (type === 'document' || type === 'documents') {
      const extension = filename ? filename.split('.').pop().toLowerCase() : '';
      
      switch (extension) {
        case 'pdf':
          return '📕';
        case 'doc':
        case 'docx':
          return '📘';
        case 'xls':
        case 'xlsx':
          return '📗';
        case 'ppt':
        case 'pptx':
          return '📙';
        case 'txt':
          return '📝';
        case 'rtf':
          return '📄';
        case 'odt':
          return '📄';
        case 'ods':
          return '📊';
        case 'odp':
          return '📋';
        default:
          return '📄';
      }
    }
    
    return '📁';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format relative date
  const formatRelativeDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.ceil(diffDays / 7)} שבועות`;
    if (diffDays < 365) return `לפני ${Math.ceil(diffDays / 30)} חודשים`;
    return `לפני ${Math.ceil(diffDays / 365)} שנים`;
  };

  // Get processing status
  const getProcessingStatus = () => {
    if (mediaItem.processingStatus) return mediaItem.processingStatus;
    if (mediaItem.extractionStatus) return mediaItem.extractionStatus;
    if (mediaItem.transcriptionStatus) return mediaItem.transcriptionStatus;
    return 'completed';
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'processing': return 'מעבד';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      case 'pending': return 'ממתין';
      default: return '';
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMainClick();
    }
  };

  // Handle main click - play media for audio/video, view for documents/images
  const handleMainClick = () => {
    const itemType = mediaItem.mediaType || mediaItem.type || mediaType;
    console.log('🔍 MediaRectangle handleMainClick:', { 
      itemType, 
      mediaItemType: mediaItem.mediaType, 
      mediaItemTypeField: mediaItem.type, 
      mediaTypeProps: mediaType,
      onPlayDefined: !!onPlay,
      onClickDefined: !!onClick
    });
    
    // For audio/video items, trigger playback or media-specific action
    if (itemType === 'audio' || itemType === 'video') {
      console.log('🎵 Audio/Video branch triggered, onPlay:', !!onPlay);
      if (onPlay) {
        console.log('📞 Calling onPlay prop');
        onPlay();
      } else {
        console.log('🔄 Fallback to built-in playMediaFile');
        // Fallback to built-in playback if no onPlay handler provided
        playMediaFile();
      }
    } else {
      console.log('📄 Document/Image branch triggered');
      // For documents/images, trigger general media view
      onClick && onClick();
    }
  };

  // Handle popup close
  const handlePopupClose = () => {
    setShowPopup(false);
  };

  // Handle metadata form close
  const handleMetadataFormClose = () => {
    setShowMetadataForm(false);
  };

  // Handle metadata save
  const handleMetadataSave = async (metadataData) => {
    try {
      const itemType = mediaItem.mediaType || mediaItem.type || mediaType;
      let endpoint = '';
      
      // Determine API endpoint based on media type
      switch (itemType) {
        case 'audio':
        case 'video':
          endpoint = `/api/recordings/${mediaItem.id}/metadata`;
          break;
        case 'image':
          endpoint = `/api/images/${mediaItem.id}/metadata`;
          break;
        case 'document':
          endpoint = `/api/documents/${mediaItem.id}/metadata`;
          break;
        default:
          throw new Error('סוג מדיה לא נתמך');
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming JWT token storage
        },
        body: JSON.stringify(metadataData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בשמירת המטא-דאטה');
      }

      const result = await response.json();
      
      // Call the parent component's update handler if provided
      if (onMetadataUpdate) {
        onMetadataUpdate(mediaItem.id, result);
      }

      // Close the form
      setShowMetadataForm(false);
      
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw error; // Re-throw to let the form handle the error display
    }
  };

  // Play media file directly if no onPlay handler is provided
  const playMediaFile = () => {
    const itemType = mediaItem.mediaType || mediaItem.type || mediaType;
    const fileUrl = mediaItem.url || mediaItem.filePath || mediaItem.src;
    
    console.log('🎵 playMediaFile called:', { 
      itemType, 
      fileUrl,
      mediaItem,
      urlField: mediaItem.url,
      filePathField: mediaItem.filePath,
      srcField: mediaItem.src
    });
    
    if (!fileUrl) {
      console.warn('❌ No file URL available for playback');
      alert('DEBUG: No file URL available for playback');
      return;
    }

    if (itemType === 'audio') {
      console.log('🔊 Creating audio element for:', fileUrl);
      alert(`DEBUG: About to play audio - ${fileUrl}`);
      // Create and play audio element
      const audio = new Audio(fileUrl);
      audio.play().then(() => {
        console.log('✅ Audio playback started successfully');
        alert('DEBUG: Audio playback started!');
      }).catch(error => {
        console.error('❌ Error playing audio:', error);
        alert(`שגיאה בהפעלת הקובץ האודיו: ${error.message}`);
      });
    } else if (itemType === 'video') {
      // For video, open in a new window/tab or create a video element
      const video = document.createElement('video');
      video.src = fileUrl;
      video.controls = true;
      video.autoplay = true;
      video.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        max-width: 90vw;
        max-height: 90vh;
        background: black;
        border-radius: 8px;
      `;
      
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
      
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(overlay);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      overlay.appendChild(video);
      document.body.appendChild(overlay);
      
      video.play().catch(error => {
        console.error('Error playing video:', error);
        alert('שגיאה בהפעלת הקובץ הווידאו');
        document.body.removeChild(overlay);
      });
    }
  };

  // Generate waveform bars for audio preview
  const generateWaveformBars = () => {
    return Array.from({ length: 20 }, (_, index) => (
      <WaveformBar
        key={index}
        height={Math.random() * 80 + 20}
        delay={index * 0.1}
      />
    ));
  };

  // Render thumbnail/preview area
  const renderThumbnailArea = () => {
    const itemType = mediaItem.mediaType || mediaItem.type || mediaType;
    
    // If there's a thumbnail and no error, show it
    if (mediaItem.thumbnail && !imageError) {
      return (
        <ThumbnailImage
          src={mediaItem.thumbnail}
          alt={mediaItem.name || mediaItem.filename}
          onError={() => setImageError(true)}
        />
      );
    }
    
    // For audio files, show only icon (removed waveform preview)
    if (itemType === 'audio') {
      return (
        <MediaTypeIcon>
          🎵
        </MediaTypeIcon>
      );
    }
    
    // For other types, show icon
    return (
      <MediaTypeIcon>
        {getMediaTypeIcon(itemType, mediaItem.fileType, mediaItem.filename || mediaItem.originalFileName)}
      </MediaTypeIcon>
    );
  };

  // Render action buttons based on media type
  const renderActionButtons = () => {
    const itemType = mediaItem.mediaType || mediaItem.type || mediaType;
    const buttons = [];

    // Primary action button - View Transcription/Extracted Text
    if (itemType === 'audio' || itemType === 'video') {
      buttons.push(
        <ActionButton
          key="view-transcription"
          className="primary"
          onClick={(e) => {
            e.stopPropagation();
            onViewTextOrTranscription && onViewTextOrTranscription();
          }}
          title="צפה בתמלול"
        >
          📝
        </ActionButton>
      );
    } else if (itemType === 'document' || itemType === 'documents') {
      buttons.push(
        <ActionButton
          key="view-text"
          className="primary"
          onClick={(e) => {
            e.stopPropagation();
            onViewTextOrTranscription && onViewTextOrTranscription();
          }}
          title="צפה בטקסט מחולץ"
        >
          📝
        </ActionButton>
      );
    } else if (itemType === 'image' || itemType === 'images') {
      buttons.push(
        <ActionButton
          key="view-text"
          className="primary"
          onClick={(e) => {
            e.stopPropagation();
            onViewTextOrTranscription && onViewTextOrTranscription();
          }}
          title="צפה בטקסט מחולץ"
        >
          📝
        </ActionButton>
      );
    }

    // Secondary actions
    buttons.push(
      <ActionButton
        key="edit"
        onClick={(e) => {
          e.stopPropagation();
          if (onEdit) {
            onEdit();
          } else {
            // Default behavior: open metadata form
            setShowMetadataForm(true);
          }
        }}
        title="ערוך מטא-דאטה"
      >
        ✏️
      </ActionButton>
    );

    buttons.push(
      <ActionButton
        key="share"
        onClick={(e) => {
          e.stopPropagation();
          onShare && onShare();
        }}
        title="שתף"
      >
        📤
      </ActionButton>
    );

    if (onDownload) {
      buttons.push(
        <ActionButton
          key="download"
          onClick={(e) => {
            e.stopPropagation();
            onDownload && onDownload();
          }}
          title="הורד"
        >
          💾
        </ActionButton>
      );
    }

    buttons.push(
      <ActionButton
        key="delete"
        className="danger"
        onClick={(e) => {
          e.stopPropagation();
          onDelete && onDelete();
        }}
        title="מחק"
      >
        🗑️
      </ActionButton>
    );

    return buttons;
  };

  const status = getProcessingStatus();
  const duration = formatDuration(mediaItem.duration);
  const size = formatFileSize(mediaItem.size || mediaItem.file_size);
  const uploadDate = formatRelativeDate(mediaItem.createdAt || mediaItem.created_at || mediaItem.uploadedAt);
  const tags = mediaItem.tags || [];

  return (
    <RectangleContainer
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleMainClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`מדיה: ${mediaItem.name || mediaItem.filename}`}
    >
      <ThumbnailArea>
        {renderThumbnailArea()}
        {status && status !== 'completed' && (
          <StatusIndicator className={status}>
            {getStatusText(status)}
          </StatusIndicator>
        )}
      </ThumbnailArea>

      <InfoArea>
        <MediaTitle title={mediaItem.title || mediaItem.name || mediaItem.filename || mediaItem.originalFileName}>
          {mediaItem.title || mediaItem.name || mediaItem.filename || mediaItem.originalFileName || 'ללא שם'}
        </MediaTitle>

        <MediaMeta>
          {duration && (
            <MetaItem icon="🕐">
              {duration}
            </MetaItem>
          )}
          {size && (
            <MetaItem icon="📊">
              {size}
            </MetaItem>
          )}
          {uploadDate && (
            <MetaItem icon="📅">
              {uploadDate}
            </MetaItem>
          )}
        </MediaMeta>

        {tags.length > 0 && (
          <TagsList>
            {tags.slice(0, 3).map((tag, index) => (
              <Tag key={index} title={tag}>
                {tag}
              </Tag>
            ))}
            {tags.length > 3 && (
              <MoreTags title={tags.slice(3).join(', ')}>
                +{tags.length - 3}
              </MoreTags>
            )}
          </TagsList>
        )}
      </InfoArea>

      <ActionButtons>
        {renderActionButtons()}
      </ActionButtons>

      {/* Media Popup */}
      <MediaPopup
        isOpen={showPopup}
        onClose={handlePopupClose}
        mediaItem={mediaItem}
        mediaType={mediaItem.mediaType || mediaItem.type || mediaType}
        t={t}
      />

      {/* Media Metadata Form */}
      {showMetadataForm && (
        <MediaMetadataForm
          isOpen={showMetadataForm}
          onClose={handleMetadataFormClose}
          mediaItem={mediaItem}
          mediaType={mediaItem.mediaType || mediaItem.type || mediaType}
          onSave={handleMetadataSave}
          t={t}
        />
      )}
    </RectangleContainer>
  );
};

export default MediaRectangle;
