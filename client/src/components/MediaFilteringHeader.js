import React, { useState, useRef } from 'react';
import './MediaFilteringHeader.css';
import ExpandedMediaFilters from './ExpandedMediaFilters';

const MediaFilteringHeader = ({ 
  mediaType = 'all', 
  onUpload, 
  onRecord, 
  onSearch, 
  isExpanded = false, 
  onToggleExpanded,
  onFiltersChange,
  availableTags = [],
  onCreateTag,
  initialFilters = {},
  // Recording props
  isRecording = false,
  recordingTime = 0,
  onRecordStart,
  onRecordStop,
  recordingError = null
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);

  // File type validation based on media type
  const getAcceptedFileTypes = () => {
    switch (mediaType) {
      case 'audio':
        return '.mp3,.wav,.m4a,.aac,.ogg';
      case 'video':
        return '.mp4,.avi,.mov,.wmv,.flv,.webm';
      case 'documents':
        return '.pdf,.doc,.docx,.txt,.rtf';
      case 'images':
        return '.jpg,.jpeg,.png,.gif,.bmp,.webp';
      default:
        return '.mp3,.wav,.m4a,.aac,.ogg,.mp4,.avi,.mov,.wmv,.flv,.webm,.pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp';
    }
  };

  const validateFileType = (file) => {
    const acceptedTypes = getAcceptedFileTypes().split(',');
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    return acceptedTypes.includes(fileExtension);
  };

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    // Clear previous errors
    setUploadErrors([]);

    fileArray.forEach(file => {
      if (!validateFileType(file)) {
        const mediaTypeText = mediaType === 'all' ? 'מדיה' : mediaType;
        errors.push(`קובץ "${file.name}" אינו נתמך עבור ${mediaTypeText}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      setUploadErrors(errors);
      // Clear errors after 5 seconds
      setTimeout(() => setUploadErrors([]), 5000);
    }

    if (validFiles.length > 0) {
      handleUpload(validFiles);
    }
  };

  const handleUpload = async (files) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Call the upload handler
      if (onUpload) {
        await onUpload(files);
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Show upload error to user
      const errorMessage = error.message || 'שגיאה כללית בהעלאת הקבצים';
      setUploadErrors([errorMessage]);
      // Clear errors after 5 seconds
      setTimeout(() => setUploadErrors([]), 5000);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  };

  // Format recording time as MM:SS
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="media-filtering-header">
        <div className="filter-top-row">
          {/* Upload Button */}
          <div className={`upload-section ${dragActive ? 'drag-active' : ''}`}>
            <button
              className={`btn btn-primary upload-btn ${isUploading ? 'uploading' : ''}`}
              onClick={handleUploadClick}
              disabled={isUploading}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              aria-label={`העלה קבצי ${mediaType === 'all' ? 'מדיה' : mediaType}`}
            >
              <span className="upload-icon">
                {isUploading ? (
                  <div className="loading-spinner loading-spinner-small"></div>
                ) : (
                  '📁'
                )}
              </span>
              <span className="upload-text">
                {isUploading ? `מעלה... ${uploadProgress}%` : 'העלה קבצים'}
              </span>
            </button>

            {/* Progress Bar */}
            {isUploading && (
              <div className="upload-progress">
                <div 
                  className="upload-progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptedFileTypes()}
              onChange={handleFileInputChange}
              className="file-input-hidden"
              aria-hidden="true"
            />

            {/* Drag & Drop Overlay */}
            {dragActive && (
              <div className="drag-overlay">
                <div className="drag-content">
                  <span className="drag-icon">📁</span>
                  <span className="drag-text">שחרר כדי להעלות</span>
                </div>
              </div>
            )}
          </div>

          {/* Record Button - Only for Audio/Video */}
          {(mediaType === 'audio' || mediaType === 'video') && (
            <div className="record-section">
              <button
                className={`btn btn-error record-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? onRecordStop : onRecordStart}
                aria-label={`${isRecording ? 'עצור הקלטה' : `הקלט ${mediaType}`}`}
                disabled={!!recordingError}
              >
                <span className="record-icon">
                  {isRecording ? '⏹️' : '🔴'}
                </span>
                <span className="record-text">
                  {isRecording ? 'עצור' : 'הקלט'}
                </span>
              </button>
              
              {/* Recording Timer */}
              {isRecording && (
                <div className="recording-timer">
                  <span className="timer-icon">⏱️</span>
                  <span className="timer-text">
                    {formatRecordingTime(recordingTime)}
                  </span>
                </div>
              )}
              
              {/* Recording Error */}
              {recordingError && (
                <div className="recording-error" role="alert">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{recordingError}</span>
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="search-section">
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="חפש בשם, תגיות, תיאור או תמלול..."
                onChange={(e) => onSearch && onSearch(e.target.value)}
                dir="rtl"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          {/* Status Filter */}
          <div className="status-filter-section">
            <select
              className="status-filter-select"
              onChange={(e) => onFiltersChange && onFiltersChange({ processingStatus: e.target.value })}
              defaultValue="all"
              title="סנן לפי סטטוס עיבוד"
            >
              <option value="all">📋 הכל</option>
              <option value="processing">⏳ מעבד</option>
              <option value="completed">✅ הושלם</option>
              <option value="failed">❌ נכשל</option>
              <option value="pending">⏸️ ממתין</option>
            </select>
          </div>

          {/* Expand Button */}
          <button
            className={`btn btn-outline expand-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={onToggleExpanded}
            aria-label={isExpanded ? 'כווץ מסננים' : 'הרחב מסננים'}
            aria-expanded={isExpanded}
          >
            <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
              ⌄
            </span>
          </button>
        </div>

        {/* Error Display */}
        {uploadErrors.length > 0 && (
          <div className="upload-errors" role="alert" aria-live="polite">
            {uploadErrors.map((error, index) => (
              <div key={index} className="upload-error-item">
                <span className="error-icon">⚠️</span>
                <span className="error-message">{error}</span>
                <button 
                  className="error-dismiss"
                  onClick={() => setUploadErrors(prev => prev.filter((_, i) => i !== index))}
                  aria-label="סגור הודעת שגיאה"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Media Filters */}
      <ExpandedMediaFilters
        isVisible={isExpanded}
        mediaType={mediaType}
        onFiltersChange={onFiltersChange}
        availableTags={availableTags}
        onCreateTag={onCreateTag}
        initialFilters={initialFilters}
      />
    </>
  );
};

export default MediaFilteringHeader;
