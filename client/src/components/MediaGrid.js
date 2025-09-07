import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import MediaRectangle from './MediaRectangle';
import ExtractedTextModal from './ExtractedTextModal';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem 0;
  
  /* Tablet: 2 columns */
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  /* Desktop: 4 columns */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
  
  /* Large Desktop: 5 columns */
  @media (min-width: 1440px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 2rem;
  }
  
  /* Extra Large Desktop: 6 columns */
  @media (min-width: 1920px) {
    grid-template-columns: repeat(6, 1fr);
    gap: 2rem;
  }
`;

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem 0;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
  
  @media (min-width: 1440px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 2rem;
  }
  
  @media (min-width: 1920px) {
    grid-template-columns: repeat(6, 1fr);
    gap: 2rem;
  }
`;

const SkeletonRectangle = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-md, 8px);
  height: 280px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: -150%;
    bottom: 0;
    left: -150%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-textSecondary, #7f8c8d);
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
`;

const EmptyTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text, #2c3e50);
`;

const EmptyDescription = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
`;

const MediaGrid = ({
  mediaItems = [],
  mediaType = 'all',
  loading = false,
  onItemClick,
  onItemEdit,
  onItemDelete,
  onItemShare,
  onItemDownload,
  onItemPlay,
  onItemViewTextOrTranscription,
  emptyStateConfig = {}
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showExtractedTextModal, setShowExtractedTextModal] = useState(false);
  const [selectedMediaItemForText, setSelectedMediaItemForText] = useState(null);

  // Default empty state configuration
  const defaultEmptyState = {
    icon: '📁',
    title: 'אין פריטי מדיה',
    description: 'העלה קבצים או הקלט תוכן חדש כדי להתחיל'
  };

  const emptyState = { ...defaultEmptyState, ...emptyStateConfig };

  // Handle item view text or transcription (show extracted text/transcription modal)
  const handleItemViewTextOrTranscription = (item) => {
    setSelectedMediaItemForText(item);
    setShowExtractedTextModal(true);
    
    // Also call the original onItemViewTextOrTranscription if provided
    if (onItemViewTextOrTranscription) {
      onItemViewTextOrTranscription(item);
    }
  };

  // Handle closing the extracted text modal
  const handleCloseExtractedTextModal = () => {
    setShowExtractedTextModal(false);
    setSelectedMediaItemForText(null);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setHoveredItem(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading skeleton
  if (loading) {
    return (
      <LoadingGrid>
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonRectangle key={index} />
        ))}
      </LoadingGrid>
    );
  }

  // Show empty state
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <GridContainer>
        <EmptyState>
          <EmptyIcon>{emptyState.icon}</EmptyIcon>
          <EmptyTitle>{emptyState.title}</EmptyTitle>
          <EmptyDescription>{emptyState.description}</EmptyDescription>
        </EmptyState>
      </GridContainer>
    );
  }

  return (
    <>
      <GridContainer>
        {mediaItems.map((item, index) => (
          <MediaRectangle
            key={item.id || index}
            mediaItem={item}
            mediaType={mediaType}
            isHovered={hoveredItem === item.id}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => onItemClick && onItemClick(item)}
            onEdit={() => onItemEdit && onItemEdit(item)}
            onDelete={() => onItemDelete && onItemDelete(item)}
            onShare={() => onItemShare && onItemShare(item)}
            onDownload={() => onItemDownload && onItemDownload(item)}
            onPlay={() => onItemPlay && onItemPlay(item)}
            onViewTextOrTranscription={() => handleItemViewTextOrTranscription(item)}
          />
        ))}
      </GridContainer>

      {/* Extracted Text / Transcription Modal */}
      {selectedMediaItemForText && (
        <ExtractedTextModal
          isOpen={showExtractedTextModal}
          onClose={handleCloseExtractedTextModal}
          documentId={selectedMediaItemForText.id}
          documentName={
            selectedMediaItemForText.title ||
            selectedMediaItemForText.name ||
            selectedMediaItemForText.filename ||
            selectedMediaItemForText.originalFileName ||
            'קובץ ללא שם'
          }
          mediaType={
            selectedMediaItemForText.mediaType ||
            selectedMediaItemForText.type ||
            mediaType
          }
        />
      )}
    </>
  );
};

export default MediaGrid;
