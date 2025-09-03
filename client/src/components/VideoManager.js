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

const VideoPreview = styled.div`
  margin-top: 0.5rem;
`;

const VideoPlayer = styled.video`
  width: 100%;
  max-width: 400px;
  height: auto;
  border-radius: var(--radius-sm);
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

const SavedVideoSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
`;

const SavedVideoTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SavedVideoItem = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SavedVideoInfo = styled.div`
  flex: 1;
`;

const SavedVideoName = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.25rem;
`;

const SavedVideoMeta = styled.div`
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

const VideoManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedVideoFiles, setSavedVideoFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load saved video files from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('limud-ai-video-files');
      if (saved) {
        const parsedVideoFiles = JSON.parse(saved);
        setSavedVideoFiles(parsedVideoFiles);
      }
    } catch (error) {
      console.error('Error loading saved video files:', error);
    }
  }, []);

  // Save video files to localStorage
  const saveVideoFilesToStorage = (videoFiles) => {
    try {
      localStorage.setItem('limud-ai-video-files', JSON.stringify(videoFiles));
    } catch (error) {
      console.error('Error saving video files to localStorage:', error);
      setError('שגיאה בשמירת קבצי הווידאו. אנא נסה שוב.');
    }
  };

  // Save selected files to localStorage
  const saveSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין קבצי ווידאו לשמירה');
      return;
    }

    try {
      const videoFilesToSave = await Promise.all(
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

      const updatedSavedVideoFiles = [...savedVideoFiles, ...videoFilesToSave];
      setSavedVideoFiles(updatedSavedVideoFiles);
      saveVideoFilesToStorage(updatedSavedVideoFiles);
      
      setSelectedFiles([]);
      setSuccess(`נשמרו ${videoFilesToSave.length} קבצי ווידאו בהצלחה`);
      setError('');
    } catch (error) {
      console.error('Error saving video files:', error);
      setError('שגיאה בשמירת קבצי הווידאו. אנא נסה שוב.');
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

  // Remove saved video file
  const removeSavedVideoFile = (videoFileId) => {
    const updatedVideoFiles = savedVideoFiles.filter(video => video.id !== videoFileId);
    setSavedVideoFiles(updatedVideoFiles);
    saveVideoFilesToStorage(updatedVideoFiles);
    setSuccess('קובץ הווידאו נמחק בהצלחה');
    setError('');
  };

  // Supported video file types
  const supportedTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/m4v',
    'video/3gp',
    'video/quicktime'
  ];

  const supportedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp'];

  const validateFile = (file) => {
    // Check file type
    if (!supportedTypes.includes(file.type)) {
      // Also check by extension as a fallback
      const fileName = file.name.toLowerCase();
      const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        return `סוג קובץ ווידאו לא נתמך: ${file.name}. אנא בחר קובץ מהסוגים הנתמכים.`;
      }
    }

    // Check file size (500MB limit for video files)
    if (file.size > 500 * 1024 * 1024) {
      return `קובץ הווידאו ${file.name} גדול מדי. גודל מקסימלי: 500MB`;
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
          // Get video duration if possible
          const duration = await getVideoDuration(file);
          
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
          console.error('Error processing video file:', error);
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
      setSuccess(`נבחרו ${validFiles.length} קבצי ווידאו בהצלחה`);
    }
  };

  // Get video duration
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
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

  // Create blob URL for saved video files
  const createBlobUrl = (base64Data) => {
    try {
      const byteCharacters = atob(base64Data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/mp4' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return null;
    }
  };

  return (
    <Container>
      <Header>
        <Title>🎬 ווידאו</Title>
      </Header>

      <UploadSection
        className={dragOver ? 'dragover' : ''}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadButton
          onClick={() => document.getElementById('video-file-input').click()}
        >
          🎬 בחר קבצי ווידאו
        </UploadButton>
        
        <FileInput
          id="video-file-input"
          type="file"
          multiple
          accept=".mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.m4v,.3gp,video/*"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <UploadText>
          או גרור קבצי ווידאו לכאן
        </UploadText>

        <SupportedFormats>
          קבצי ווידאו נתמכים: MP4, AVI, MOV, WMV, FLV, WebM, MKV, M4V, 3GP
          <br />
          גודל מקסימלי: 500MB לכל קובץ
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
            קבצי ווידאו נבחרים ({selectedFiles.length})
          </h3>
          {selectedFiles.map(fileData => (
            <FilePreview key={fileData.id}>
              <FileIcon>
                🎬
              </FileIcon>
              <FileInfo>
                <FileName>{fileData.name}</FileName>
                <FileSize>
                  {formatFileSize(fileData.size)}
                  {fileData.duration && ` • ${formatDuration(fileData.duration)}`}
                </FileSize>
                {fileData.url && (
                  <VideoPreview>
                    <VideoPlayer controls>
                      <source src={fileData.url} type={fileData.type} />
                      הדפדפן שלך לא תומך בנגן הווידאו.
                    </VideoPlayer>
                  </VideoPreview>
                )}
              </FileInfo>
              <RemoveButton onClick={() => removeFile(fileData.id)}>
                הסר
              </RemoveButton>
            </FilePreview>
          ))}
          <SaveButton onClick={saveSelectedFiles}>
            💾 שמור קבצי ווידאו
          </SaveButton>
        </div>
      )}

      {savedVideoFiles.length > 0 && (
        <SavedVideoSection>
          <SavedVideoTitle>
            🎬 קבצי ווידאו שמורים ({savedVideoFiles.length})
          </SavedVideoTitle>
          {savedVideoFiles.map(videoFile => {
            const blobUrl = createBlobUrl(videoFile.base64Data);
            return (
              <SavedVideoItem key={videoFile.id}>
                <FileIcon>
                  🎬
                </FileIcon>
                <SavedVideoInfo>
                  <SavedVideoName>{videoFile.name}</SavedVideoName>
                  <SavedVideoMeta>
                    <span>{formatFileSize(videoFile.size)}</span>
                    {videoFile.duration && <span>משך: {formatDuration(videoFile.duration)}</span>}
                    <span>נשמר: {new Date(videoFile.savedAt).toLocaleDateString('he-IL')}</span>
                  </SavedVideoMeta>
                  {blobUrl && (
                    <VideoPreview>
                      <VideoPlayer controls>
                        <source src={blobUrl} type={videoFile.type} />
                        הדפדפן שלך לא תומך בנגן הווידאו.
                      </VideoPlayer>
                    </VideoPreview>
                  )}
                </SavedVideoInfo>
                <RemoveButton onClick={() => removeSavedVideoFile(videoFile.id)}>
                  מחק
                </RemoveButton>
              </SavedVideoItem>
            );
          })}
        </SavedVideoSection>
      )}
    </Container>
  );
};

export default VideoManager;
