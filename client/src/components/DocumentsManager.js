import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CompressionControls from './CompressionControls';
import MediaViewModal from './MediaViewModal';
import { compressFile, supportsCompression, getCompressionRatio } from '../utils/mediaCompression';

const Container = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2rem;
  box-shadow: 0 2px 8px var(--color-shadowLight);
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const Title = styled.h2`
  color: var(--color-text);
  margin: 0;
`;

const UploadSection = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  transition: var(--transition-fast);

  &.dragover {
    border-color: var(--color-primary);
    background: var(--color-primaryLight, rgba(52, 152, 219, 0.1));
  }
`;

const UploadButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  transition: var(--transition-fast);
  margin-bottom: 1rem;

  &:hover {
    background-color: var(--color-primaryHover);
  }

  &:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const UploadText = styled.p`
  color: var(--color-textSecondary);
  margin: 0.5rem 0;
  font-size: 0.9rem;
`;

const SupportedFormats = styled.div`
  color: var(--color-textTertiary, #95a5a6);
  font-size: 0.8rem;
  margin-top: 0.5rem;
`;

const ErrorMessage = styled.div`
  background-color: var(--color-dangerLight, #fadbd8);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin: 1rem 0;
  border: 1px solid var(--color-dangerBorder, #f5b7b1);
`;

const SuccessMessage = styled.div`
  background-color: var(--color-successLight, #d5f4e6);
  color: var(--color-success);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin: 1rem 0;
  border: 1px solid var(--color-successBorder, #a9dfbf);
`;

const FilePreview = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FileIcon = styled.div`
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
`;

const FileInfo = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.25rem;
`;

const FileSize = styled.div`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
`;

const RemoveButton = styled.button`
  background: var(--color-danger);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-dangerHover);
  }
`;

const SavedDocumentsSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
`;

const SavedDocumentsTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SavedDocumentItem = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SavedDocumentInfo = styled.div`
  flex: 1;
`;

const SavedDocumentName = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.25rem;
`;

const SavedDocumentMeta = styled.div`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  display: flex;
  gap: 1rem;
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: var(--color-success);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  transition: var(--transition-fast);
  margin-top: 1rem;

  &:hover {
    background-color: var(--color-successHover);
  }

  &:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const ViewButton = styled.button`
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
  gap: 0.25rem;
  margin-left: 0.5rem;

  &:hover {
    background: var(--color-primaryHover);
  }

  &:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DocumentsManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(0.7);
  const [isCompressing, setIsCompressing] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);

  // Load saved documents from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('limud-ai-documents');
      if (saved) {
        const parsedDocuments = JSON.parse(saved);
        setSavedDocuments(parsedDocuments);
      }
    } catch (error) {
      console.error('Error loading saved documents:', error);
    }
  }, []);

  // Save documents to localStorage
  const saveDocumentsToStorage = (documents) => {
    try {
      localStorage.setItem('limud-ai-documents', JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving documents to localStorage:', error);
      setError('שגיאה בשמירת המסמכים. אנא נסה שוב.');
    }
  };

  // Save selected files to localStorage
  const saveSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין קבצים לשמירה');
      return;
    }

    try {
      setIsCompressing(true);
      setSuccess('מעבד קבצים...');
      
      const documentsToSave = await Promise.all(
        selectedFiles.map(async (fileData, index) => {
          let fileToProcess = fileData.file;
          let processedName = fileData.name;
          let processedSize = fileData.size;
          let processedType = fileData.type;
          let compressionInfo = null;

          // Apply compression if enabled and file supports it
          if (compressionEnabled && supportsCompression(fileData.type)) {
            try {
              setSuccess(`דוחס קובץ ${index + 1} מתוך ${selectedFiles.length}: ${fileData.name}...`);
              
              const compressedFile = await compressFile(fileData.file, compressionQuality);
              const originalSize = fileData.size;
              const compressedSize = compressedFile.size;
              const compressionRatio = getCompressionRatio(originalSize, compressedSize);
              
              fileToProcess = compressedFile;
              processedName = compressedFile.name;
              processedSize = compressedFile.size;
              processedType = compressedFile.type;
              
              compressionInfo = {
                originalSize,
                compressedSize,
                compressionRatio,
                quality: compressionQuality
              };
              
              console.log(`Compressed ${fileData.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio}% reduction)`);
            } catch (compressionError) {
              console.error(`Failed to compress ${fileData.name}:`, compressionError);
              setError(prev => prev + `\nשגיאה בדחיסת ${fileData.name}: ${compressionError.message}`);
              // Continue with original file if compression fails
            }
          }

          return {
            id: fileData.id,
            name: processedName,
            size: processedSize,
            type: processedType,
            compressionInfo,
            savedAt: new Date().toISOString()
          };
        })
      );

      const updatedSavedDocuments = [...savedDocuments, ...documentsToSave];
      setSavedDocuments(updatedSavedDocuments);
      saveDocumentsToStorage(updatedSavedDocuments);
      
      setSelectedFiles([]);
      
      // Calculate total compression savings
      const totalOriginalSize = documentsToSave.reduce((sum, file) => 
        sum + (file.compressionInfo?.originalSize || file.size), 0
      );
      const totalCompressedSize = documentsToSave.reduce((sum, file) => file.size, 0);
      const totalSavings = totalOriginalSize - totalCompressedSize;
      
      let successMessage = `נשמרו ${documentsToSave.length} מסמכים בהצלחה`;
      if (compressionEnabled && totalSavings > 0) {
        const savingsRatio = getCompressionRatio(totalOriginalSize, totalCompressedSize);
        successMessage += `\nחיסכון בדחיסה: ${formatFileSize(totalSavings)} (${savingsRatio}%)`;
      }
      
      setSuccess(successMessage);
      setError('');
    } catch (error) {
      console.error('Error saving documents:', error);
      setError('שגיאה בשמירת המסמכים. אנא נסה שוב.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Remove saved document
  const removeSavedDocument = (documentId) => {
    const updatedDocuments = savedDocuments.filter(doc => doc.id !== documentId);
    setSavedDocuments(updatedDocuments);
    saveDocumentsToStorage(updatedDocuments);
    setSuccess('המסמך נמחק בהצלחה');
    setError('');
  };

  // Supported file types
  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  const supportedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];

  const validateFile = (file) => {
    // Check file type
    if (!supportedTypes.includes(file.type)) {
      // Also check by extension as a fallback
      const fileName = file.name.toLowerCase();
      const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        return `סוג קובץ לא נתמך: ${file.name}. אנא בחר קובץ מהסוגים הנתמכים.`;
      }
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return `הקובץ ${file.name} גדול מדי. גודל מקסימלי: 10MB`;
    }

    return null;
  };

  const handleFileSelect = (files) => {
    setError('');
    setSuccess('');
    
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push({
          file,
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setSuccess(`נבחרו ${validFiles.length} קבצים בהצלחה`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    setError('');
    setSuccess('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  // Handle view media item
  const handleViewMedia = (mediaItem) => {
    setSelectedMediaItem(mediaItem);
    setViewModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setSelectedMediaItem(null);
  };

  return (
    <Container>
      <Header>
        <Title>מסמכים</Title>
      </Header>

      <UploadSection
        className={dragOver ? 'dragover' : ''}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadButton
          onClick={() => document.getElementById('file-input').click()}
        >
          📁 בחר קבצים
        </UploadButton>
        
        <FileInput
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <UploadText>
          או גרור קבצים לכאן
        </UploadText>

        <SupportedFormats>
          קבצים נתמכים: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, GIF
          <br />
          גודל מקסימלי: 10MB לכל קובץ
        </SupportedFormats>
      </UploadSection>

      {error && (
        <ErrorMessage>
          <strong>שגיאה:</strong>
          <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>{error}</pre>
        </ErrorMessage>
      )}

      {success && (
        <SuccessMessage>
          <strong>הצלחה:</strong> {success}
        </SuccessMessage>
      )}

      {selectedFiles.length > 0 && (
        <div>
          <CompressionControls
            files={selectedFiles}
            compressionEnabled={compressionEnabled}
            onCompressionToggle={setCompressionEnabled}
            compressionQuality={compressionQuality}
            onQualityChange={setCompressionQuality}
          />
          
          <h3 style={{ color: 'var(--color-text)', marginBottom: '1rem' }}>
            קבצים נבחרים ({selectedFiles.length})
          </h3>
          {selectedFiles.map(fileData => (
            <FilePreview key={fileData.id}>
              <FileIcon>
                {getFileExtension(fileData.name)}
              </FileIcon>
              <FileInfo>
                <FileName>{fileData.name}</FileName>
                <FileSize>{formatFileSize(fileData.size)}</FileSize>
              </FileInfo>
              <ButtonGroup>
                <ViewButton onClick={() => handleViewMedia(fileData)} disabled={isCompressing}>
                  👁️ צפה
                </ViewButton>
                <RemoveButton onClick={() => removeFile(fileData.id)}>
                  הסר
                </RemoveButton>
              </ButtonGroup>
            </FilePreview>
          ))}
          <SaveButton onClick={saveSelectedFiles} disabled={isCompressing}>
            {isCompressing ? '🗜️ דוחס קבצים...' : '💾 שמור מסמכים'}
          </SaveButton>
        </div>
      )}

      {savedDocuments.length > 0 && (
        <SavedDocumentsSection>
          <SavedDocumentsTitle>
            📚 מסמכים שמורים ({savedDocuments.length})
          </SavedDocumentsTitle>
          {savedDocuments.map(document => (
            <SavedDocumentItem key={document.id}>
              <FileIcon>
                {getFileExtension(document.name)}
              </FileIcon>
              <SavedDocumentInfo>
                <SavedDocumentName>{document.name}</SavedDocumentName>
                <SavedDocumentMeta>
                  <span>{formatFileSize(document.size)}</span>
                  <span>נשמר: {new Date(document.savedAt).toLocaleDateString('he-IL')}</span>
                </SavedDocumentMeta>
              </SavedDocumentInfo>
              <ButtonGroup>
                <ViewButton onClick={() => handleViewMedia(document)}>
                  👁️ צפה
                </ViewButton>
                <RemoveButton onClick={() => removeSavedDocument(document.id)}>
                  מחק
                </RemoveButton>
              </ButtonGroup>
            </SavedDocumentItem>
          ))}
        </SavedDocumentsSection>
      )}

      <MediaViewModal
        isOpen={viewModalOpen}
        onClose={handleCloseModal}
        mediaItem={selectedMediaItem}
        mediaType="document"
      />
    </Container>
  );
};

export default DocumentsManager;
