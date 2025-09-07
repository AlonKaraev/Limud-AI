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

const VideoManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedVideoFiles, setSavedVideoFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(0.7);
  const [isCompressing, setIsCompressing] = useState(false);
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

  // Collect all available tags from all video files
  useEffect(() => {
    const allTags = new Set();
    
    // Tags from saved video files
    savedVideoFiles.forEach(videoFile => {
      if (videoFile.tags && Array.isArray(videoFile.tags)) {
        videoFile.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Tags from selected files
    selectedFiles.forEach(fileData => {
      if (fileData.tags && Array.isArray(fileData.tags)) {
        fileData.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    setGlobalTags(Array.from(allTags).sort());
  }, [savedVideoFiles, selectedFiles]);


  // Load saved video files from server on component mount
  useEffect(() => {
    loadSavedVideoFiles();
  }, []);

  // Load saved video files from server
  const loadSavedVideoFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No auth token found, skipping server video files load');
        // Still try to load from localStorage
        loadFromLocalStorage();
        return;
      }

      // Load from server
      const response = await fetch('/api/recordings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication failed, skipping server video files load');
          loadFromLocalStorage();
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.recordings) {
        // Filter only video recordings and transform to expected format
        const videoRecordings = data.recordings
          .filter(recording => recording.media_type === 'video')
          .map(recording => ({
            id: recording.id,
            name: recording.metadata?.originalFileName || recording.filename,
            size: recording.file_size,
            type: recording.metadata?.type || 'video/mp4',
            duration: recording.metadata?.duration || recording.video_metadata?.duration,
            serverRecordingId: recording.id,
            filename: recording.filename,
            mediaType: recording.media_type,
            processingStatus: recording.processing_status || 'completed',
            savedAt: recording.created_at,
            isFromServer: true,
            tags: recording.tags || []
          }));

        // Also load from localStorage for backward compatibility
        const localVideos = loadFromLocalStorage(false);
        
        // Combine and deduplicate (server takes priority)
        const allVideos = [...videoRecordings];
        localVideos.forEach(localVideo => {
          if (!videoRecordings.find(sv => sv.name === localVideo.name)) {
            allVideos.push(localVideo);
          }
        });

        setSavedVideoFiles(allVideos);
        console.log(`Loaded ${videoRecordings.length} video recordings from server`);
      } else {
        console.log('No video recordings found or invalid response format');
        // Still try to load from localStorage
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading saved video files from server:', error);
      // Fallback to localStorage
      loadFromLocalStorage();
    }
  };

  // Load from localStorage (fallback)
  const loadFromLocalStorage = (setState = true) => {
    try {
      const saved = localStorage.getItem('limud-ai-video-files');
      if (saved) {
        const parsedVideoFiles = JSON.parse(saved);
        if (setState) {
          setSavedVideoFiles(parsedVideoFiles);
        }
        return parsedVideoFiles;
      }
    } catch (error) {
      console.error('Error loading saved video files from localStorage:', error);
    }
    
    // Return empty array if no localStorage data
    if (setState) {
      setSavedVideoFiles([]);
    }
    return [];
  };

  // Save video files to localStorage
  const saveVideoFilesToStorage = (videoFiles) => {
    try {
      localStorage.setItem('limud-ai-video-files', JSON.stringify(videoFiles));
    } catch (error) {
      console.error('Error saving video files to localStorage:', error);
      setError('שגיאה בשמירת קבצי הווידאו. אנא נסה שוב.');
    }
  };

  // Upload selected files to server with progress tracking and silent saving
  const saveSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין קבצי ווידאו לשמירה');
      return;
    }

    try {
      setIsCompressing(true);
      setError('');
      setSuccess('');
      setFileProgress({});
      setCurrentProcessingFile(null);


      const uploadedVideos = [];
      
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
                    progress: Math.round(10 + (progress * 0.6)), // 10-70% for compression
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
            // Skip compression, go directly to upload
            setFileProgress(prev => ({
              ...prev,
              [fileData.id]: { progress: 70, status: 'saving', message: 'מתחיל העלאה...' }
            }));
          }

          // Prepare upload
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 75, status: 'saving', message: 'מכין העלאה...' }
          }));

          const formData = new FormData();
          formData.append('media', fileToProcess);
          formData.append('recordingId', `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          formData.append('metadata', JSON.stringify({
            lessonName: fileData.metadata?.fileName || processedName.replace(/\.[^/.]+$/, ""),
            subject: fileData.metadata?.subject || 'ווידאו',
            description: fileData.metadata?.description || `קובץ ווידאו: ${processedName}`,
            duration: fileData.duration,
            originalFileName: fileData.name,
            compressionInfo,
            domain: fileData.metadata?.domain || '',
            topic: fileData.metadata?.topic || '',
            gradeLevel: fileData.metadata?.gradeLevel || '',
            keywords: fileData.metadata?.keywords || '',
            language: fileData.metadata?.language || 'עברית',
            difficulty: fileData.metadata?.difficulty || 'בינוני',
            author: fileData.metadata?.author || ''
          }));
          formData.append('tags', JSON.stringify(fileData.tags || []));

          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
          }

          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 80, status: 'saving', message: 'מעלה לשרת...' }
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
            throw new Error(errorData.error || `שגיאה בהעלאת ${processedName}`);
          }

          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 95, status: 'saving', message: 'מסיים העלאה...' }
          }));

          const result = await response.json();
          uploadedVideos.push({
            id: result.recording.id,
            name: processedName,
            size: processedSize,
            type: processedType,
            duration: fileData.duration,
            serverRecordingId: result.recording.id,
            filename: result.recording.filename,
            mediaType: result.recording.mediaType,
            processingStatus: result.recording.processingStatus,
            compressionInfo,
            savedAt: new Date().toISOString()
          });

          // Mark as complete
          setFileProgress(prev => ({
            ...prev,
            [fileData.id]: { progress: 100, status: 'complete', message: 'הועלה בהצלחה' }
          }));

          // Clean up object URL
          if (fileData.url) {
            URL.revokeObjectURL(fileData.url);
          }

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
      if (uploadedVideos.length > 0) {
        // Save uploaded video info to localStorage for quick access
        const updatedSavedVideoFiles = [...savedVideoFiles, ...uploadedVideos];
        setSavedVideoFiles(updatedSavedVideoFiles);
        saveVideoFilesToStorage(updatedSavedVideoFiles);
        
        // Calculate total compression savings
        const totalOriginalSize = uploadedVideos.reduce((sum, file) => 
          sum + (file.compressionInfo?.originalSize || file.size), 0
        );
        const totalCompressedSize = uploadedVideos.reduce((sum, file) => file.size, 0);
        const totalSavings = totalOriginalSize - totalCompressedSize;
        
        let successMessage = `הועלו בהצלחה ${uploadedVideos.length} מתוך ${selectedFiles.length} קבצי ווידאו לשרת`;
        if (compressionEnabled && totalSavings > 0) {
          const savingsRatio = getCompressionRatio(totalOriginalSize, totalCompressedSize);
          successMessage += `\nחיסכון בדחיסה: ${formatFileSize(totalSavings)} (${savingsRatio}%)`;
        }
        
        setSuccess(successMessage);
        
        // Clear selected files after successful upload
        setSelectedFiles([]);
      } else {
        setError('לא הצליח להעלות אף קובץ ווידאו');
      }


    } catch (error) {
      console.error('Error uploading video files:', error);
      setError('שגיאה כללית בהעלאת קבצי הווידאו לשרת. אנא נסה שוב.');
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

  // Recording functions
  const startRecording = async () => {
    try {
      setRecordingError(null);
      setError('');
      
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setMediaStream(stream);
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        // Convert to File object
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `video-recording-${timestamp}.webm`;
        const file = new File([blob], filename, { type: 'video/webm' });
        
        try {
          // Get duration if possible
          const duration = await getVideoDuration(file);
          
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
          setSuccess(`הקלטת ווידאו הושלמה בהצלחה! משך: ${formatDuration(duration || recordingTime)}`);
          
        } catch (error) {
          console.error('Error processing recorded video file:', error);
          setError('שגיאה בעיבוד הקלטת הווידאו');
        }
        
        // Cleanup
        setRecordedChunks([]);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
        }
      };
      
      recorder.onerror = (event) => {
        console.error('Video recording error:', event.error);
        setRecordingError('שגיאה בהקלטת ווידאו: ' + event.error.message);
        stopRecording();
      };
      
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      
      // Start recording
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error starting video recording:', error);
      let errorMessage = 'שגיאה בהתחלת הקלטת הווידאו';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'נדרשת הרשאה לגישה למצלמה ומיקרופון. אנא אפשר גישה ונסה שוב.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'לא נמצאו מצלמה או מיקרופון. אנא וודא שהם מחוברים ונסה שוב.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'הקלטת ווידאו אינה נתמכת בדפדפן זה.';
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

    // Check file size (1GB limit for video files)
    if (file.size > 1024 * 1024 * 1024) {
      return `קובץ הווידאו ${file.name} גדול מדי. גודל מקסימלי: 1GB`;
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
      video.muted = true;
      video.volume = 0;
      
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


  // Handle view media item - unified for both local and server-uploaded media
  const handleViewMedia = (mediaItem) => {
    // For server-uploaded media, ensure we have a proper streaming URL
    let processedMediaItem = { ...mediaItem };
    
    if (mediaItem.isFromServer && mediaItem.serverRecordingId) {
      // Construct streaming URL for server-uploaded media
      processedMediaItem.url = `/api/recordings/${mediaItem.serverRecordingId}/stream`;
      // Ensure we have the right media type
      processedMediaItem.mediaType = 'video';
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
  const handleViewTranscription = (videoFile) => {
    setSelectedRecordingForTranscription(videoFile);
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
  const handleSaveEditedMedia = (updatedMediaItem) => {
    // Update the saved video files list
    setSavedVideoFiles(prev => prev.map(video => 
      video.id === updatedMediaItem.id ? updatedMediaItem : video
    ));

    // Update localStorage for local files
    if (!updatedMediaItem.isFromServer) {
      const updatedVideoFiles = savedVideoFiles.map(video => 
        video.id === updatedMediaItem.id ? updatedMediaItem : video
      );
      saveVideoFilesToStorage(updatedVideoFiles);
    }

    // Update global tags
    const allTags = new Set(globalTags);
    if (updatedMediaItem.tags) {
      updatedMediaItem.tags.forEach(tag => allTags.add(tag));
    }
    setGlobalTags(Array.from(allTags).sort());

    setSuccess('הנתונים עודכנו בהצלחה');
    setError('');
  };

  // Filter video files based on search query
  const filterVideoFiles = (videoFiles, query) => {
    if (!query || query.trim() === '') {
      return videoFiles;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return videoFiles.filter(video => {
      // Search in name/filename
      const name = (video.name || video.filename || '').toLowerCase();
      if (name.includes(searchTerm)) return true;

      // Search in tags
      if (video.tags && Array.isArray(video.tags)) {
        const tagsMatch = video.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        );
        if (tagsMatch) return true;
      }

      // Search in metadata
      if (video.metadata) {
        const metadataFields = [
          video.metadata.lessonName,
          video.metadata.subject,
          video.metadata.description,
          video.metadata.domain,
          video.metadata.topic,
          video.metadata.keywords,
          video.metadata.author
        ];
        
        const metadataMatch = metadataFields.some(field => 
          field && field.toLowerCase().includes(searchTerm)
        );
        if (metadataMatch) return true;
      }

      return false;
    });
  };

  // Get filtered video files for display
  const getFilteredVideoFiles = () => {
    return filterVideoFiles(savedVideoFiles, searchQuery);
  };

  return (
    <Container>
      <MediaFilteringHeader
        mediaType="video"
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
                {fileData.url && !isCompressing && (
                  <VideoPreview>
                    <VideoPlayer controls>
                      <source src={fileData.url} type={fileData.type} />
                      הדפדפן שלך לא תומך בנגן הווידאו.
                    </VideoPlayer>
                  </VideoPreview>
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
                  disabled={isCompressing}
                  mediaType="video"
                />
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
                  placeholder="הוסף תגיות לווידאו..."
                  suggestions={globalTags}
                />
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
          <SaveButton onClick={saveSelectedFiles} disabled={isCompressing}>
            {isCompressing ? '🗜️ דוחס קבצים...' : '💾 שמור ווידאו עם תמלול'}
          </SaveButton>
        </div>
      )}

      {savedVideoFiles.length > 0 && (
        <SavedVideoSection>
          <SavedVideoTitle>
            🎬 קבצי ווידאו שמורים ({getFilteredVideoFiles().length}{searchQuery ? ` מתוך ${savedVideoFiles.length}` : ''})
          </SavedVideoTitle>
          <MediaGrid
            mediaItems={getFilteredVideoFiles().map(videoFile => ({
              ...videoFile,
              mediaType: 'video',
              file_size: videoFile.size,
              created_at: videoFile.savedAt,
              duration: videoFile.duration
            }))}
            mediaType="video"
            loading={false}
            onItemClick={handleViewMedia}
            onItemEdit={handleEditMedia}
            onItemDelete={removeSavedVideoFile}
            onItemPreview={handleViewMedia}
            onItemPlay={handleViewMedia}
            emptyStateConfig={{
              icon: '🎬',
              title: 'אין קבצי ווידאו שמורים',
              description: 'העלה קבצי ווידאו כדי לראות אותם כאן'
            }}
          />
          <BulkTranscriptionStatusManager
            recordings={savedVideoFiles.filter(video => video.isFromServer && video.serverRecordingId).map(video => ({
              id: video.serverRecordingId
            }))}
            onTranscriptionComplete={(transcription) => {
              console.log('Video transcription completed:', transcription);
            }}
          />
        </SavedVideoSection>
      )}

      <MediaViewModal
        isOpen={viewModalOpen}
        onClose={handleCloseModal}
        mediaItem={selectedMediaItem}
        mediaType="video"
      />

      <TranscriptionModal
        isOpen={transcriptionModalOpen}
        onClose={handleCloseTranscriptionModal}
        recordingId={selectedRecordingForTranscription?.serverRecordingId}
        recordingName={selectedRecordingForTranscription?.name}
      />

      <EditMediaModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        mediaItem={selectedMediaItemForEdit}
        mediaType="video"
        availableTags={globalTags}
        onSave={handleSaveEditedMedia}
      />
    </Container>
  );
};

export default VideoManager;
