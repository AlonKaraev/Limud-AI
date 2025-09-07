import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import MediaFilteringHeader from './MediaFilteringHeader';
import CompressionControls from './CompressionControls';
import ProgressBar from './ProgressBar';
import BulkTranscriptionStatusManager from './BulkTranscriptionStatusManager';
import MediaViewModal from './MediaViewModal';
import TranscriptionModal from './TranscriptionModal';
import TagInput from './TagInput';
import MetadataForm from './MetadataForm';
import EditMediaModal from './EditMediaModal';
import MediaGrid from './MediaGrid';
import { compressFile, supportsCompression, getCompressionRatio, shouldCompress } from '../utils/mediaCompression';

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

const AudioManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedAudioFiles, setSavedAudioFiles] = useState([]);
  const [uploadedRecordings, setUploadedRecordings] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(0.7);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState({});
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [transcriptionModalOpen, setTranscriptionModalOpen] = useState(false);
  const [selectedRecordingForTranscription, setSelectedRecordingForTranscription] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMediaItemForEdit, setSelectedMediaItemForEdit] = useState(null);
  const [globalTags, setGlobalTags] = useState([]);
  
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // Recording timer effect
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // Collect all available tags from all audio files
  useEffect(() => {
    const allTags = new Set();
    
    // Tags from uploaded recordings
    uploadedRecordings.forEach(recording => {
      if (recording.tags && Array.isArray(recording.tags)) {
        recording.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Tags from saved audio files
    savedAudioFiles.forEach(audioFile => {
      if (audioFile.tags && Array.isArray(audioFile.tags)) {
        audioFile.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Tags from selected files
    selectedFiles.forEach(fileData => {
      if (fileData.tags && Array.isArray(fileData.tags)) {
        fileData.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    setGlobalTags(Array.from(allTags).sort());
  }, [uploadedRecordings, savedAudioFiles, selectedFiles]);


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

  // Load uploaded recordings from server on component mount
  useEffect(() => {
    const loadUploadedRecordings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No auth token found, skipping server recordings load');
          return;
        }

        const response = await fetch('/api/recordings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log('Authentication failed, skipping server recordings load');
            return;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.recordings) {
          // Filter only audio recordings and transform to expected format
          const audioRecordings = data.recordings
            .filter(recording => recording.media_type === 'audio')
            .map(recording => ({
              id: recording.id,
              filename: recording.filename,
              originalFileName: recording.metadata?.originalFileName || recording.filename,
              size: recording.file_size,
              mediaType: recording.media_type || 'audio',
              createdAt: recording.created_at,
              transcriptionStatus: 'completed', // Assume completed for existing recordings
              processingStatus: recording.processing_status || 'completed',
              tags: recording.tags || []
            }));
          
          setUploadedRecordings(audioRecordings);
          console.log(`Loaded ${audioRecordings.length} audio recordings from server`);
        } else {
          console.log('No recordings found or invalid response format');
          setUploadedRecordings([]);
        }
      } catch (error) {
        console.error('Error loading uploaded recordings from server:', error);
        // Set empty array to show that loading was attempted
        setUploadedRecordings([]);
      }
    };

    loadUploadedRecordings();
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

  // Save selected files to localStorage with progress tracking and silent saving
  const saveSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין קבצי אודיו לשמירה');
      return;
    }

    try {
      setIsCompressing(true);
      setError('');
      setSuccess('');
      setFileProgress({});
      setCurrentProcessingFile(null);


      const audioFilesToSave = [];
      
      // Process files sequentially to show individual progress
      for (let index = 0; index < selectedFiles.length; index++) {
        const fileData = selectedFiles[index];
        setCurrentProcessingFile(fileData.name);
        
        let fileToProcess = fileData.file;
        let processedName = fileData.name;
        let processedSize = fileData.size;
        let processedType = fileData.type;
        let compressionInfo = null;

        // Initialize progress for this file
        setFileProgress(prev => ({
          ...prev,
          [fileData.id]: { progress: 0, status: 'idle', message: 'מתחיל עיבוד...' }
        }));

        try {
          // Apply compression if enabled and file supports it
          if (compressionEnabled && supportsCompression(fileData.type)) {
            setFileProgress(prev => ({
              ...prev,
              [fileData.id]: { progress: 10, status: 'compressing', message: 'מתחיל דחיסה...' }
            }));

            const compressedFile = await compressFile(
              fileData.file, 
              compressionQuality,
              (progress, message) => {
                setFileProgress(prev => ({
                  ...prev,
                  [fileData.id]: { 
                    progress: Math.round(10 + (progress * 0.7)), // 10-80% for compression
                    status: 'compressing', 
                    message: message || 'דוחס...' 
                  }
                }));
              }
            );

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
          } else {
            // Skip compression, go directly to saving
            setFileProgress(prev => ({
              ...prev,
              [fileData.id]: { progress: 80, status: 'saving', message: 'מתחיל שמירה...' }
            }));
          }

          // Convert file to base64 for storage
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 85, status: 'saving', message: 'ממיר לפורמט שמירה...' }
          }));

          const base64Data = await fileToBase64(fileToProcess);
          
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 95, status: 'saving', message: 'שומר קובץ...' }
          }));

          const savedFile = {
            id: fileData.id,
            name: processedName,
            title: fileData.metadata?.title || fileData.metadata?.fileName || processedName,
            size: processedSize,
            type: processedType,
            duration: fileData.duration || null,
            base64Data: base64Data,
            compressionInfo,
            metadata: fileData.metadata || {},
            tags: fileData.tags || [],
            savedAt: new Date().toISOString()
          };

          audioFilesToSave.push(savedFile);

          // Mark as complete
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 100, status: 'complete', message: 'הושלם בהצלחה' }
          }));

        } catch (fileError) {
          console.error(`Failed to process ${fileData.name}:`, fileError);
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 0, status: 'error', message: `שגיאה: ${fileError.message}` }
          }));
          setError(prev => prev + `\nשגיאה בעיבוד ${fileData.name}: ${fileError.message}`);
        }
      }

      // Save all processed files
      if (audioFilesToSave.length > 0) {
        const updatedSavedAudioFiles = [...savedAudioFiles, ...audioFilesToSave];
        setSavedAudioFiles(updatedSavedAudioFiles);
        saveAudioFilesToStorage(updatedSavedAudioFiles);
        
        // Calculate total compression savings
        const totalOriginalSize = audioFilesToSave.reduce((sum, file) => 
          sum + (file.compressionInfo?.originalSize || file.size), 0
        );
        const totalCompressedSize = audioFilesToSave.reduce((sum, file) => file.size, 0);
        const totalSavings = totalOriginalSize - totalCompressedSize;
        
        let successMessage = `נשמרו ${audioFilesToSave.length} מתוך ${selectedFiles.length} קבצי אודיו בהצלחה`;
        if (compressionEnabled && totalSavings > 0) {
          const savingsRatio = getCompressionRatio(totalOriginalSize, totalCompressedSize);
          successMessage += `\nחיסכון בדחיסה: ${formatFileSize(totalSavings)} (${savingsRatio}%)`;
        }
        
        setSuccess(successMessage);
        
        // Clear selected files after successful save
        setSelectedFiles([]);
      } else {
        setError('לא הצליח לשמור אף קובץ אודיו');
      }


    } catch (error) {
      console.error('Error saving audio files:', error);
      setError('שגיאה כללית בשמירת קבצי האודיו. אנא נסה שוב.');
    } finally {
      setIsCompressing(false);
      setCurrentProcessingFile(null);
      
      // Clear progress after a delay
      setTimeout(() => {
        setFileProgress({});
      }, 3000);
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

  // Upload selected files to server with automatic transcription
  const uploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין קבצי אודיו להעלאה');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      setSuccess('');
      setFileProgress({});
      setCurrentProcessingFile(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      const uploadedFiles = [];

      // Upload files sequentially to show individual progress
      for (let index = 0; index < selectedFiles.length; index++) {
        const fileData = selectedFiles[index];
        setCurrentProcessingFile(fileData.name);

        // Initialize progress for this file
        setFileProgress(prev => ({
          ...prev,
          [fileData.id]: { progress: 0, status: 'uploading', message: 'מתחיל העלאה...' }
        }));

        try {
          let fileToUpload = fileData.file;

          // Apply compression if enabled
          if (compressionEnabled && supportsCompression(fileData.type)) {
            setFileProgress(prev => ({
              ...prev,
              [fileData.id]: { progress: 10, status: 'compressing', message: 'דוחס קובץ...' }
            }));

            fileToUpload = await compressFile(
              fileData.file,
              compressionQuality,
              (progress, message) => {
                setFileProgress(prev => ({
                  ...prev,
                  [fileData.id]: {
                    progress: Math.round(10 + (progress * 0.3)), // 10-40% for compression
                    status: 'compressing',
                    message: message || 'דוחס...'
                  }
                }));
              }
            );
          }

          // Upload to server
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 50, status: 'uploading', message: 'מעלה לשרת...' }
          }));

          const formData = new FormData();
          formData.append('media', fileToUpload);
          formData.append('recordingId', `audio_${Date.now()}_${index}`);
          formData.append('tags', JSON.stringify(fileData.tags || []));
          formData.append('metadata', JSON.stringify({
            originalName: fileData.metadata?.fileName || fileData.name,
            duration: fileData.duration,
            uploadedAt: new Date().toISOString(),
            compressed: compressionEnabled && supportsCompression(fileData.type),
            domain: fileData.metadata?.domain || '',
            subject: fileData.metadata?.subject || '',
            topic: fileData.metadata?.topic || '',
            gradeLevel: fileData.metadata?.gradeLevel || '',
            description: fileData.metadata?.description || '',
            keywords: fileData.metadata?.keywords || '',
            language: fileData.metadata?.language || 'עברית',
            difficulty: fileData.metadata?.difficulty || 'בינוני',
            author: fileData.metadata?.author || ''
          }));

          const response = await fetch('/api/recordings/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בהעלאת הקובץ');
          }

          const result = await response.json();

          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 100, status: 'complete', message: 'הועלה בהצלחה' }
          }));

          uploadedFiles.push({
            ...result.recording,
            originalFileId: fileData.id,
            originalFileName: fileData.name
          });

        } catch (fileError) {
          console.error(`Failed to upload ${fileData.name}:`, fileError);
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 0, status: 'error', message: `שגיאה: ${fileError.message}` }
          }));
          setError(prev => (prev ? prev + '\n' : '') + `שגיאה בהעלאת ${fileData.name}: ${fileError.message}`);
        }
      }

      if (uploadedFiles.length > 0) {
        setUploadedRecordings(prev => [...prev, ...uploadedFiles]);
        setSuccess(`הועלו ${uploadedFiles.length} מתוך ${selectedFiles.length} קבצי אודיו בהצלחה. התמלול האוטומטי החל.`);
        
        // Clear selected files after successful upload
        setSelectedFiles([]);
      } else {
        setError('לא הצליח להעלות אף קובץ אודיו');
      }

    } catch (error) {
      console.error('Error uploading audio files:', error);
      setError('שגיאה כללית בהעלאת קבצי האודיו. אנא נסה שוב.');
    } finally {
      setIsUploading(false);
      setCurrentProcessingFile(null);

      // Clear progress after a delay
      setTimeout(() => {
        setFileProgress({});
      }, 3000);
    }
  };

  // Remove saved audio file
  const removeSavedAudioFile = (audioFileId) => {
    const updatedAudioFiles = savedAudioFiles.filter(audio => audio.id !== audioFileId);
    setSavedAudioFiles(updatedAudioFiles);
    saveAudioFilesToStorage(updatedAudioFiles);
    setSuccess('קובץ האודיו נמחק בהצלחה');
    setError('');
  };

  // Remove uploaded recording from server
  const removeUploadedRecording = async (recordingId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('לא נמצא טוקן אימות. אנא התחבר מחדש.');
        return;
      }

      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה במחיקת ההקלטה');
      }

      // Remove from local state
      const updatedRecordings = uploadedRecordings.filter(recording => recording.id !== recordingId);
      setUploadedRecordings(updatedRecordings);
      setSuccess('הקלטה נמחקה בהצלחה מהשרת');
      setError('');
    } catch (error) {
      console.error('Error deleting uploaded recording:', error);
      setError(`שגיאה במחיקת ההקלטה: ${error.message}`);
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      setRecordingError(null);
      setError('');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setMediaStream(stream);
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert to File object
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording-${timestamp}.webm`;
        const file = new File([blob], filename, { type: 'audio/webm' });
        
        try {
          // Get duration if possible
          const duration = await getAudioDuration(file);
          
          // Add to selected files
          const recordedFile = {
            file,
            id: Date.now() + Math.random(),
            name: filename,
            size: file.size,
            type: file.type,
            duration: duration,
            url: URL.createObjectURL(file),
            isRecorded: true
          };
          
          setSelectedFiles(prev => [...prev, recordedFile]);
          setSuccess(`הקלטה הושלמה בהצלחה! משך: ${formatDuration(duration || recordingTime)}`);
          
        } catch (error) {
          console.error('Error processing recorded file:', error);
          setError('שגיאה בעיבוד ההקלטה');
        }
        
        // Cleanup
        setRecordedChunks([]);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
        }
      };
      
      recorder.onerror = (event) => {
        console.error('Recording error:', event.error);
        setRecordingError('שגיאה בהקלטה: ' + event.error.message);
        stopRecording();
      };
      
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      
      // Start recording
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      let errorMessage = 'שגיאה בהתחלת ההקלטה';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'נדרשת הרשאה לגישה למיקרופון. אנא אפשר גישה ונסה שוב.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'לא נמצא מיקרופון. אנא וודא שמיקרופון מחובר ונסה שוב.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'הקלטת אודיו אינה נתמכת בדפדפן זה.';
      }
      
      setRecordingError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  // Handle transcription completion
  const handleTranscriptionComplete = (transcription) => {
    console.log('Transcription completed:', transcription);
    // You can add additional logic here when transcription completes
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


  // Handle view media item - unified for both local and server-uploaded media
  const handleViewMedia = (mediaItem) => {
    // For server-uploaded media, ensure we have a proper streaming URL
    let processedMediaItem = { ...mediaItem };
    
    if (mediaItem.id && typeof mediaItem.id === 'number') {
      // This is a server-uploaded recording
      processedMediaItem.url = `/api/recordings/${mediaItem.id}/stream`;
      // Ensure we have the right media type
      processedMediaItem.mediaType = 'audio';
    }
    
    setSelectedMediaItem(processedMediaItem);
    setViewModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setSelectedMediaItem(null);
  };

  // Handle view transcription
  const handleViewTranscription = (recording) => {
    setSelectedRecordingForTranscription(recording);
    setTranscriptionModalOpen(true);
  };

  // Handle close transcription modal
  const handleCloseTranscriptionModal = () => {
    setTranscriptionModalOpen(false);
    setSelectedRecordingForTranscription(null);
  };

  // Handle edit media item
  const handleEditMedia = (mediaItem) => {
    setSelectedMediaItemForEdit(mediaItem);
    setEditModalOpen(true);
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedMediaItemForEdit(null);
  };

  // Handle save edited media
  const handleSaveEditedMedia = async (updatedMediaItem) => {
    try {
      // Check if this is a server file (has id) or local file
      if (updatedMediaItem.id && typeof updatedMediaItem.id === 'number') {
        // Server file - update via API
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
        }

        const response = await fetch(`/api/recordings/${updatedMediaItem.id}/tags-metadata`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: updatedMediaItem.tags || [],
            metadata: updatedMediaItem.metadata || {}
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'שגיאה בעדכון התגיות והמטא-דאטה');
        }

        // Update local state for uploaded recordings
        setUploadedRecordings(prev => prev.map(recording => 
          recording.id === updatedMediaItem.id 
            ? { ...recording, tags: updatedMediaItem.tags, metadata: updatedMediaItem.metadata }
            : recording
        ));

        setSuccess('התגיות והמטא-דאטה עודכנו בהצלחה בשרת');
      } else {
        // Local file - update in localStorage
        const updatedSavedFiles = savedAudioFiles.map(audioFile => 
          audioFile.id === updatedMediaItem.id 
            ? { ...audioFile, tags: updatedMediaItem.tags, metadata: updatedMediaItem.metadata }
            : audioFile
        );
        
        setSavedAudioFiles(updatedSavedFiles);
        saveAudioFilesToStorage(updatedSavedFiles);
        setSuccess('התגיות והמטא-דאטה עודכנו בהצלחה במקומי');
      }

      setError('');
      handleCloseEditModal();
    } catch (error) {
      console.error('Error saving edited media:', error);
      setError(`שגיאה בשמירת השינויים: ${error.message}`);
    }
  };

  // Filter audio files based on search query
  const filterAudioFiles = (audioFiles, query) => {
    if (!query || query.trim() === '') {
      return audioFiles;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return audioFiles.filter(audio => {
      // Search in name/filename
      const name = (audio.name || audio.filename || audio.originalFileName || '').toLowerCase();
      if (name.includes(searchTerm)) return true;

      // Search in tags
      if (audio.tags && Array.isArray(audio.tags)) {
        const tagsMatch = audio.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        );
        if (tagsMatch) return true;
      }

      // Search in metadata
      if (audio.metadata) {
        const metadataFields = [
          audio.metadata.originalName,
          audio.metadata.subject,
          audio.metadata.description,
          audio.metadata.domain,
          audio.metadata.topic,
          audio.metadata.keywords,
          audio.metadata.author
        ];
        
        const metadataMatch = metadataFields.some(field => 
          field && field.toLowerCase().includes(searchTerm)
        );
        if (metadataMatch) return true;
      }

      return false;
    });
  };

  // Get filtered audio files for display
  const getFilteredUploadedRecordings = () => {
    return filterAudioFiles(uploadedRecordings, searchQuery);
  };

  const getFilteredSavedAudioFiles = () => {
    return filterAudioFiles(savedAudioFiles, searchQuery);
  };

  return (
    <Container>
      <MediaFilteringHeader
        mediaType="audio"
        onUpload={handleFileSelect}
        onRecordStart={startRecording}
        onRecordStop={stopRecording}
        isRecording={isRecording}
        recordingTime={recordingTime}
        recordingError={recordingError}
        onSearch={(query) => {
          setSearchQuery(query);
        }}
        isExpanded={isHeaderExpanded}
        onToggleExpanded={() => setIsHeaderExpanded(!isHeaderExpanded)}
      />

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
                {fileData.url && !isCompressing && (
                  <AudioPreview>
                    <AudioPlayer controls>
                      <source src={fileData.url} type={fileData.type} />
                      הדפדפן שלך לא תומך בנגן האודיו.
                    </AudioPlayer>
                  </AudioPreview>
                )}
                {fileProgress[fileData.id] && (
                  <ProgressBar
                    progress={fileProgress[fileData.id].progress}
                    status={fileProgress[fileData.id].status}
                    title={fileData.name}
                    message={fileProgress[fileData.id].message}
                    animated={fileProgress[fileData.id].status === 'compressing' || fileProgress[fileData.id].status === 'saving'}
                  />
                )}
                <MetadataForm
                  fileData={fileData}
                  onChange={(metadata) => {
                    setSelectedFiles(prev => prev.map(f => 
                      f.id === fileData.id ? { ...f, metadata } : f
                    ));
                  }}
                  disabled={isCompressing || isUploading}
                  mediaType="audio"
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <TagInput
                    tags={fileData.tags || []}
                    onChange={(newTags) => {
                      setSelectedFiles(prev => prev.map(f => 
                        f.id === fileData.id ? { ...f, tags: newTags } : f
                      ));
                      // Update global tags list
                      const allTags = new Set(globalTags);
                      newTags.forEach(tag => allTags.add(tag));
                      setGlobalTags(Array.from(allTags));
                    }}
                    placeholder="הוסף תגיות לקובץ האודיו..."
                    disabled={isCompressing || isUploading}
                  />
                </div>
              </FileInfo>
              <ButtonGroup>
                <ViewButton onClick={() => handleViewMedia(fileData)} disabled={isCompressing}>
                  👁️ צפה
                </ViewButton>
                <RemoveButton onClick={() => removeFile(fileData.id)} disabled={isCompressing}>
                  הסר
                </RemoveButton>
              </ButtonGroup>
            </FilePreview>
          ))}
          <SaveButton 
            onClick={uploadSelectedFiles} 
            disabled={isUploading || isCompressing}
          >
            {isUploading ? '📤 מעלה קבצים...' : '💾 שמור אודיו עם תמלול'}
          </SaveButton>
        </div>
      )}

      {uploadedRecordings.length > 0 && (
        <SavedAudioSection>
          <SavedAudioTitle>
            📤 קבצי אודיו שהועלו לשרת ({getFilteredUploadedRecordings().length}{searchQuery ? ` מתוך ${uploadedRecordings.length}` : ''})
          </SavedAudioTitle>
          <MediaGrid
            mediaItems={getFilteredUploadedRecordings().map(recording => ({
              ...recording,
              name: recording.originalFileName || recording.filename,
              mediaType: 'audio',
              file_size: recording.size,
              created_at: recording.createdAt
            }))}
            mediaType="audio"
            loading={false}
            onItemClick={handleViewMedia}
            onItemEdit={handleEditMedia}
            onItemDelete={removeUploadedRecording}
            onItemPreview={handleViewMedia}
            emptyStateConfig={{
              icon: '🎵',
              title: 'אין קבצי אודיו שהועלו',
              description: 'העלה קבצי אודיו כדי לראות אותם כאן'
            }}
          />
          <BulkTranscriptionStatusManager
            recordings={uploadedRecordings}
            onTranscriptionComplete={handleTranscriptionComplete}
          />
        </SavedAudioSection>
      )}

      {savedAudioFiles.length > 0 && (
        <SavedAudioSection>
          <SavedAudioTitle>
            🎵 קבצי אודיו שמורים מקומית ({getFilteredSavedAudioFiles().length}{searchQuery ? ` מתוך ${savedAudioFiles.length}` : ''})
          </SavedAudioTitle>
          <MediaGrid
            mediaItems={getFilteredSavedAudioFiles().map(audioFile => ({
              ...audioFile,
              mediaType: 'audio',
              file_size: audioFile.size,
              created_at: audioFile.savedAt,
              duration: audioFile.duration
            }))}
            mediaType="audio"
            loading={false}
            onItemClick={handleViewMedia}
            onItemEdit={handleEditMedia}
            onItemDelete={removeSavedAudioFile}
            onItemPreview={handleViewMedia}
            emptyStateConfig={{
              icon: '🎵',
              title: 'אין קבצי אודיו שמורים',
              description: 'שמור קבצי אודיו מקומית כדי לראות אותם כאן'
            }}
          />
        </SavedAudioSection>
      )}

      <MediaViewModal
        isOpen={viewModalOpen}
        onClose={handleCloseModal}
        mediaItem={selectedMediaItem}
        mediaType="audio"
      />

      <TranscriptionModal
        isOpen={transcriptionModalOpen}
        onClose={handleCloseTranscriptionModal}
        recordingId={selectedRecordingForTranscription?.id}
        mediaName={selectedRecordingForTranscription?.originalFileName || selectedRecordingForTranscription?.filename}
        mediaType={selectedRecordingForTranscription?.mediaType || 'audio'}
      />

      <EditMediaModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        mediaItem={selectedMediaItemForEdit}
        onSave={handleSaveEditedMedia}
        availableTags={globalTags}
        mediaType="audio"
      />
    </Container>
  );
};

export default AudioManager;
