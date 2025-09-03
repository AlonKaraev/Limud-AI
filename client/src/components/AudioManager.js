import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

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
  font-size: 1.2rem;
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

const AudioPreview = styled.div`
  margin-top: 0.5rem;
`;

const AudioPlayer = styled.audio`
  width: 100%;
  max-width: 300px;
  height: 32px;
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

const SavedAudioSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
`;

const SavedAudioTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SavedAudioItem = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SavedAudioInfo = styled.div`
  flex: 1;
`;

const SavedAudioName = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.25rem;
`;

const SavedAudioMeta = styled.div`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
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

const AudioManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedAudioFiles, setSavedAudioFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load saved audio files from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('limud-ai-audio-files');
      if (saved) {
        const parsedAudioFiles = JSON.parse(saved);
        setSavedAudioFiles(parsedAudioFiles);
      }
    } catch (error) {
      console.error('Error loading saved audio files:', error);
    }
  }, []);

  // Save audio files to localStorage
  const saveAudioFilesToStorage = (audioFiles) => {
    try {
      localStorage.setItem('limud-ai-audio-files', JSON.stringify(audioFiles));
    } catch (error) {
      console.error('Error saving audio files to localStorage:', error);
      setError('שגיאה בשמירת קבצי האודיו. אנא נסה שוב.');
    }
  };

  // Save selected files to localStorage
  const saveSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין קבצי אודיו לשמירה');
      return;
    }

    try {
      const audioFilesToSave = await Promise.all(
        selectedFiles.map(async (fileData) => {
          // Convert file to base64 for storage
          const base64Data = await fileToBase64(fileData.file);
          
          return {
            id: fileData.id,
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            duration: fileData.duration || null,
            base64Data: base64Data,
            savedAt: new Date().toISOString()
          };
        })
      );

      const updatedSavedAudioFiles = [...savedAudioFiles, ...audioFilesToSave];
      setSavedAudioFiles(updatedSavedAudioFiles);
      saveAudioFilesToStorage(updatedSavedAudioFiles);
      
      setSelectedFiles([]);
      setSuccess(`נשמרו ${audioFilesToSave.length} קבצי אודיו בהצלחה`);
      setError('');
    } catch (error) {
      console.error('Error saving audio files:', error);
      setError('שגיאה בשמירת קבצי האודיו. אנא נסה שוב.');
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Remove saved audio file
  const removeSavedAudioFile = (audioFileId) => {
    const updatedAudioFiles = savedAudioFiles.filter(audio => audio.id !== audioFileId);
    setSavedAudioFiles(updatedAudioFiles);
    saveAudioFilesToStorage(updatedAudioFiles);
    setSuccess('קובץ האודיו נמחק בהצלחה');
    setError('');
  };

  // Supported audio file types
  const supportedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/aac',
    'audio/m4a',
    'audio/mp4',
    'audio/x-m4a'
  ];

  const supportedExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.m4a'];

  const validateFile = (file) => {
    // Check file type
    if (!supportedTypes.includes(file.type)) {
      // Also check by extension as a fallback
      const fileName = file.name.toLowerCase();
      const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        return `סוג קובץ אודיו לא נתמך: ${file.name}. אנא בחר קובץ מהסוגים הנתמכים.`;
      }
    }

    // Check file size (50MB limit for audio files)
    if (file.size > 50 * 1024 * 1024) {
      return `קובץ האודיו ${file.name} גדול מדי. גודל מקסימלי: 50MB`;
    }

    return null;
  };

  const handleFileSelect = async (files) => {
    setError('');
    setSuccess('');
    
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
      } else {
        try {
          // Get audio duration if possible
          const duration = await getAudioDuration(file);
          
          validFiles.push({
            file,
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            duration: duration,
            url: URL.createObjectURL(file)
          });
        } catch (error) {
          console.error('Error processing audio file:', error);
          validFiles.push({
            file,
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            duration: null,
            url: URL.createObjectURL(file)
          });
        }
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setSuccess(`נבחרו ${validFiles.length} קבצי אודיו בהצלחה`);
    }
  };

  // Get audio duration
  const getAudioDuration = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
      
      audio.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(audio.src);
      };
      
      audio.src = URL.createObjectURL(file);
    });
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
    // Clean up object URLs
    const fileToRemove = selectedFiles.find(f => f.id === fileId);
    if (fileToRemove && fileToRemove.url) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    
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

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return 'לא ידוע';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  // Create blob URL for saved audio files
  const createBlobUrl = (base64Data) => {
    try {
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return null;
    }
  };

  return (
    <Container>
      <Header>
        <Title>🎵 אודיו</Title>
      </Header>

      <UploadSection
        className={dragOver ? 'dragover' : ''}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadButton
          onClick={() => document.getElementById('audio-file-input').click()}
        >
          🎵 בחר קבצי אודיו
        </UploadButton>
        
        <FileInput
          id="audio-file-input"
          type="file"
          multiple
          accept=".mp3,.wav,.ogg,.aac,.m4a,audio/*"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <UploadText>
          או גרור קבצי אודיו לכאן
        </UploadText>

        <SupportedFormats>
          קבצי אודיו נתמכים: MP3, WAV, OGG, AAC, M4A
          <br />
          גודל מקסימלי: 50MB לכל קובץ
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
          <h3 style={{ color: 'var(--color-text)', marginBottom: '1rem' }}>
            קבצי אודיו נבחרים ({selectedFiles.length})
          </h3>
          {selectedFiles.map(fileData => (
            <FilePreview key={fileData.id}>
              <FileIcon>
                🎵
              </FileIcon>
              <FileInfo>
                <FileName>{fileData.name}</FileName>
                <FileSize>
                  {formatFileSize(fileData.size)}
                  {fileData.duration && ` • ${formatDuration(fileData.duration)}`}
                </FileSize>
                {fileData.url && (
                  <AudioPreview>
                    <AudioPlayer controls>
                      <source src={fileData.url} type={fileData.type} />
                      הדפדפן שלך לא תומך בנגן האודיו.
                    </AudioPlayer>
                  </AudioPreview>
                )}
              </FileInfo>
              <RemoveButton onClick={() => removeFile(fileData.id)}>
                הסר
              </RemoveButton>
            </FilePreview>
          ))}
          <SaveButton onClick={saveSelectedFiles}>
            💾 שמור קבצי אודיו
          </SaveButton>
        </div>
      )}

      {savedAudioFiles.length > 0 && (
        <SavedAudioSection>
          <SavedAudioTitle>
            🎵 קבצי אודיו שמורים ({savedAudioFiles.length})
          </SavedAudioTitle>
          {savedAudioFiles.map(audioFile => {
            const blobUrl = createBlobUrl(audioFile.base64Data);
            return (
              <SavedAudioItem key={audioFile.id}>
                <FileIcon>
                  🎵
                </FileIcon>
                <SavedAudioInfo>
                  <SavedAudioName>{audioFile.name}</SavedAudioName>
                  <SavedAudioMeta>
                    <span>{formatFileSize(audioFile.size)}</span>
                    {audioFile.duration && <span>משך: {formatDuration(audioFile.duration)}</span>}
                    <span>נשמר: {new Date(audioFile.savedAt).toLocaleDateString('he-IL')}</span>
                  </SavedAudioMeta>
                  {blobUrl && (
                    <AudioPreview>
                      <AudioPlayer controls>
                        <source src={blobUrl} type={audioFile.type} />
                        הדפדפן שלך לא תומך בנגן האודיו.
                      </AudioPlayer>
                    </AudioPreview>
                  )}
                </SavedAudioInfo>
                <RemoveButton onClick={() => removeSavedAudioFile(audioFile.id)}>
                  מחק
                </RemoveButton>
              </SavedAudioItem>
            );
          })}
        </SavedAudioSection>
      )}
    </Container>
  );
};

export default AudioManager;
