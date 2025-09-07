import React, { useState } from 'react';
import styled from 'styled-components';
import MediaGrid from './MediaGrid';

const TestContainer = styled.div`
  padding: 2rem;
  background: var(--color-background, #f5f6fa);
  min-height: 100vh;
`;

const TestHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const TestTitle = styled.h1`
  color: var(--color-text, #2c3e50);
  margin-bottom: 1rem;
`;

const TestControls = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const TestButton = styled.button`
  padding: 0.5rem 1rem;
  background: var(--color-primary, #3498db);
  color: var(--color-textOnPrimary, #ffffff);
  border: none;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background var(--transition-fast, 0.2s ease);
  
  &:hover {
    background: var(--color-primaryHover, #2980b9);
  }
  
  &.active {
    background: var(--color-success, #27ae60);
  }
`;

const TestSection = styled.div`
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 8px);
  padding: 2rem;
  box-shadow: 0 2px 8px var(--color-shadowLight, rgba(0, 0, 0, 0.1));
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  color: var(--color-text, #2c3e50);
  margin-bottom: 1rem;
  font-size: 1.2rem;
`;

const MediaGridTest = () => {
  const [currentTest, setCurrentTest] = useState('audio');
  const [loading, setLoading] = useState(false);

  // Generate sample media items for testing
  const generateSampleItems = (type, count = 12) => {
    const items = [];
    
    for (let i = 1; i <= count; i++) {
      const baseItem = {
        id: `${type}_${i}`,
        name: `${type === 'audio' ? 'הקלטה' : type === 'video' ? 'סרטון' : type === 'documents' ? 'מסמך' : 'תמונה'} ${i}`,
        size: Math.floor(Math.random() * 50000000) + 1000000, // 1MB to 50MB
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: generateRandomTags(),
        mediaType: type
      };

      if (type === 'audio') {
        baseItem.duration = Math.floor(Math.random() * 3600) + 60; // 1 minute to 1 hour
        baseItem.transcriptionStatus = ['completed', 'processing', 'pending', 'failed'][Math.floor(Math.random() * 4)];
      } else if (type === 'video') {
        baseItem.duration = Math.floor(Math.random() * 7200) + 120; // 2 minutes to 2 hours
        baseItem.processingStatus = ['completed', 'processing', 'pending'][Math.floor(Math.random() * 3)];
        if (Math.random() > 0.5) {
          baseItem.thumbnail = `https://picsum.photos/300/200?random=${i}`;
        }
      } else if (type === 'documents') {
        baseItem.extractionStatus = ['completed', 'processing', 'pending', 'failed'][Math.floor(Math.random() * 4)];
        baseItem.fileType = ['pdf', 'docx', 'txt', 'pptx'][Math.floor(Math.random() * 4)];
      } else if (type === 'images') {
        baseItem.thumbnail = `https://picsum.photos/300/200?random=${i}`;
        baseItem.fileType = 'image';
      }

      items.push(baseItem);
    }
    
    return items;
  };

  const generateRandomTags = () => {
    const allTags = ['חשוב', 'לימודים', 'עבודה', 'פרויקט', 'מחקר', 'הרצאה', 'פגישה', 'רעיונות', 'טיוטה', 'סופי'];
    const numTags = Math.floor(Math.random() * 5);
    const selectedTags = [];
    
    for (let i = 0; i < numTags; i++) {
      const randomTag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!selectedTags.includes(randomTag)) {
        selectedTags.push(randomTag);
      }
    }
    
    return selectedTags;
  };

  const handleTestChange = (testType) => {
    setCurrentTest(testType);
  };

  const handleLoadingTest = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
    alert(`נלחץ על: ${item.name}`);
  };

  const handleItemEdit = (item) => {
    console.log('Edit item:', item);
    alert(`עריכת: ${item.name}`);
  };

  const handleItemDelete = (item) => {
    console.log('Delete item:', item);
    if (window.confirm(`האם למחוק את ${item.name}?`)) {
      alert(`נמחק: ${item.name}`);
    }
  };

  const handleItemShare = (item) => {
    console.log('Share item:', item);
    alert(`שיתוף: ${item.name}`);
  };

  const handleItemPlay = (item) => {
    console.log('Play item:', item);
    alert(`נגינת: ${item.name}`);
  };

  const handleItemPreview = (item) => {
    console.log('Preview item:', item);
    alert(`תצוגה מקדימה: ${item.name}`);
  };

  const getEmptyStateConfig = (type) => {
    switch (type) {
      case 'audio':
        return {
          icon: '🎵',
          title: 'אין קבצי אודיו',
          description: 'העלה קבצי אודיו או הקלט תוכן חדש'
        };
      case 'video':
        return {
          icon: '🎥',
          title: 'אין קבצי וידאו',
          description: 'העלה קבצי וידאו או הקלט סרטון חדש'
        };
      case 'documents':
        return {
          icon: '📄',
          title: 'אין מסמכים',
          description: 'העלה מסמכים או צור תוכן חדש'
        };
      case 'images':
        return {
          icon: '🖼️',
          title: 'אין תמונות',
          description: 'העלה תמונות או צור גלריה חדשה'
        };
      default:
        return {};
    }
  };

  const currentItems = generateSampleItems(currentTest);

  return (
    <TestContainer>
      <TestHeader>
        <TestTitle>בדיקת רשת מדיה - Media Grid Test</TestTitle>
        <TestControls>
          <TestButton
            className={currentTest === 'audio' ? 'active' : ''}
            onClick={() => handleTestChange('audio')}
          >
            🎵 אודיו
          </TestButton>
          <TestButton
            className={currentTest === 'video' ? 'active' : ''}
            onClick={() => handleTestChange('video')}
          >
            🎥 וידאו
          </TestButton>
          <TestButton
            className={currentTest === 'documents' ? 'active' : ''}
            onClick={() => handleTestChange('documents')}
          >
            📄 מסמכים
          </TestButton>
          <TestButton
            className={currentTest === 'images' ? 'active' : ''}
            onClick={() => handleTestChange('images')}
          >
            🖼️ תמונות
          </TestButton>
          <TestButton onClick={handleLoadingTest}>
            ⏳ בדיקת טעינה
          </TestButton>
        </TestControls>
      </TestHeader>

      <TestSection>
        <SectionTitle>
          רשת {currentTest === 'audio' ? 'אודיו' : currentTest === 'video' ? 'וידאו' : currentTest === 'documents' ? 'מסמכים' : 'תמונות'}
          {loading && ' - טוען...'}
        </SectionTitle>
        
        <MediaGrid
          mediaItems={loading ? [] : currentItems}
          mediaType={currentTest}
          loading={loading}
          onItemClick={handleItemClick}
          onItemEdit={handleItemEdit}
          onItemDelete={handleItemDelete}
          onItemShare={handleItemShare}
          onItemPlay={handleItemPlay}
          onItemPreview={handleItemPreview}
          emptyStateConfig={getEmptyStateConfig(currentTest)}
        />
      </TestSection>

      <TestSection>
        <SectionTitle>מצב ריק - Empty State</SectionTitle>
        <MediaGrid
          mediaItems={[]}
          mediaType={currentTest}
          loading={false}
          emptyStateConfig={getEmptyStateConfig(currentTest)}
        />
      </TestSection>
    </TestContainer>
  );
};

export default MediaGridTest;
