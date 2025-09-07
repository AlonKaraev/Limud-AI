import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import MediaFilteringHeader from './MediaFilteringHeader';
import MediaViewModal from './MediaViewModal';
import EditMediaModal from './EditMediaModal';
import ExtractedTextModal from './ExtractedTextModal';
import TagInput from './TagInput';
import MetadataForm from './MetadataForm';
import MediaGrid from './MediaGrid';
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
  align-items: flex-start;
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
  flex-shrink: 0;
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

const ImagePreview = styled.div`
  margin-top: 0.5rem;
`;

const PreviewImage = styled.img`
  max-width: 300px;
  max-height: 200px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  object-fit: cover;
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ImageCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--color-shadowLight);
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`;

const CardContent = styled.div`
  padding: 1rem;
`;

const CardTitle = styled.div`
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const CardMeta = styled.div`
  font-size: 0.75rem;
  color: var(--color-textSecondary);
  margin-bottom: 0.5rem;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
`;

const ExtractionStatus = styled.div`
  font-size: 0.8rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  display: inline-block;
  
  &.pending {
    background: var(--color-warningLight, #fff3cd);
    color: var(--color-warning, #856404);
  }
  
  &.processing {
    background: var(--color-infoLight, #d1ecf1);
    color: var(--color-info, #0c5460);
  }
  
  &.completed {
    background: var(--color-successLight, #d5f4e6);
    color: var(--color-success, #155724);
  }
  
  &.failed {
    background: var(--color-dangerLight, #fadbd8);
    color: var(--color-danger, #721c24);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
  width: ${props => props.progress || 0}%;
`;

const CompressionControls = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 1rem 0;
`;

const CompressionToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  font-weight: 500;
`;

const QualitySlider = styled.input`
  width: 100%;
  margin: 0.5rem 0;
`;

const RemoveButton = styled.button`
  background: var(--color-danger);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-dangerHover);
  }
`;

const SavedImagesSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
`;

const SavedImagesTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--color-primaryHover);
  }

  &:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const ExtractButton = styled.button`
  background: var(--color-info, #17a2b8);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: var(--color-infoHover, #138496);
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
  flex-wrap: wrap;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--color-textSecondary);
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  margin-top: 2rem;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyStateTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 0.5rem;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 0.9rem;
`;

const ImagesManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedImages, setSavedImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMediaItemForEdit, setSelectedMediaItemForEdit] = useState(null);
  const [globalTags, setGlobalTags] = useState([]);
  const [extractionStatuses, setExtractionStatuses] = useState({});
  const [extractedTextModalOpen, setExtractedTextModalOpen] = useState(false);
  const [selectedImageForText, setSelectedImageForText] = useState(null);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add refs for performance optimization
  const loadingRef = useRef(false);
  const refreshTimeoutRef = useRef(null);

  // Load saved images from server on component mount
  useEffect(() => {
    loadImagesFromServer();
  }, []);


  // Update global tags when images change
  useEffect(() => {
    const allTags = new Set();
    
    // Collect tags from selected files
    selectedFiles.forEach(file => {
      if (file.tags && Array.isArray(file.tags)) {
        file.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Collect tags from saved images
    savedImages.forEach(image => {
      if (image.tags && Array.isArray(image.tags)) {
        image.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    setGlobalTags(Array.from(allTags));
  }, [selectedFiles, savedImages]);

  // Poll extraction statuses for images that are being processed
  useEffect(() => {
    const imagesBeingProcessed = savedImages.filter(image => 
      image.extractionStatus && ['pending', 'processing'].includes(image.extractionStatus)
    );

    if (imagesBeingProcessed.length > 0) {
      const interval = setInterval(() => {
        imagesBeingProcessed.forEach(image => {
          checkExtractionStatus(image.id);
        });
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [savedImages]);

  // Optimized image loading with timeout and error handling
  const loadImagesFromServer = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        setError('נדרש להתחבר מחדש');
        return;
      }

      console.log('Loading images from server...');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/images', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'max-age=60' // 1 minute cache
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Images API response status:', response.status);
      const data = await response.json();
      console.log('Images API response data:', data);

      if (response.ok) {
        if (data.success) {
          setSavedImages(data.images || []);
          console.log(`Loaded ${data.images?.length || 0} images`);
          setError('');
        } else {
          console.error('API returned success=false:', data);
          if (data.error && !data.error.includes('no images found')) {
            setError(data.error || 'שגיאה בטעינת התמונות');
          }
        }
      } else {
        console.error('API request failed:', response.status, data);
        if (response.status === 401) {
          setError('נדרש להתחבר מחדש');
          localStorage.removeItem('token');
        } else {
          setError(data.error || 'שגיאה בטעינת התמונות');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timed out');
        setError('הבקשה נכשלה - זמן המתנה פג');
      } else {
        console.error('Error loading images from server:', error);
        setError('שגיאה בחיבור לשרת');
      }
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Check extraction status for an image
  const checkExtractionStatus = async (imageId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/images/${imageId}/extraction-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        setExtractionStatuses(prev => ({
          ...prev,
          [imageId]: {
            status: data.extractionStatus,
            progress: data.job?.progress || 0,
            progressMessage: data.job?.progressMessage,
            errorMessage: data.job?.errorMessage,
            extraction: data.extraction
          }
        }));

        // Update image in saved images if status changed
        if (data.extractionStatus === 'completed' || data.extractionStatus === 'failed') {
          setSavedImages(prev => prev.map(image => 
            image.id === imageId 
              ? { ...image, extractionStatus: data.extractionStatus, extraction: data.extraction }
              : image
          ));
        }
      }
    } catch (error) {
      console.error('Error checking extraction status:', error);
    }
  };


  // Upload selected files to server
  const uploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('אין תמונות להעלאה');
      return;
    }

    try {
      setIsUploading(true);
      setIsCompressing(true);
      setSuccess('מעלה תמונות...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('נדרש להתחבר מחדש');
        return;
      }

      const uploadPromises = selectedFiles.map(async (fileData, index) => {
        setSuccess(`מעבד תמונה ${index + 1} מתוך ${selectedFiles.length}: ${fileData.name}...`);
        
        let fileToUpload = fileData.file;

        // Apply compression if enabled
        if (compressionEnabled && supportsCompression(fileData.type)) {
          try {
            fileToUpload = await compressFile(fileData.file, compressionQuality);
            console.log(`Compressed ${fileData.name}: ${formatFileSize(fileData.size)} → ${formatFileSize(fileToUpload.size)}`);
          } catch (compressionError) {
            console.warn('Compression failed, using original file:', compressionError);
            fileToUpload = fileData.file;
          }
        }

        const formData = new FormData();
        formData.append('image', fileToUpload);
        formData.append('metadata', JSON.stringify(fileData.metadata || {}));
        formData.append('tags', JSON.stringify(fileData.tags || []));

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'שגיאה בהעלאת התמונה');
        }

        return await response.json();
      });

      const results = await Promise.all(uploadPromises);
      
      // Add uploaded images to saved images list
      const newImages = results.map(result => ({
        ...result.image,
        extractionStatus: 'pending'
      }));
      
      setSavedImages(prev => [...prev, ...newImages]);
      setSelectedFiles([]);
      
      setSuccess(`הועלו ${results.length} תמונות בהצלחה. חילוץ הטקסט החל...`);
      setError('');
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(`שגיאה בהעלאת התמונות: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
    }
  };

  // Remove saved image
  const removeSavedImage = async (imageId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('נדרש להתחבר מחדש');
        return;
      }

      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSavedImages(prev => prev.filter(image => image.id !== imageId));
        setSuccess('התמונה נמחקה בהצלחה');
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה במחיקת התמונה');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('שגיאה במחיקת התמונה');
    }
  };

  // Manually trigger text extraction (OCR)
  const triggerTextExtraction = async (imageId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('נדרש להתחבר מחדש');
        return;
      }

      const response = await fetch(`/api/images/${imageId}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method: 'ocr' })
      });

      if (response.ok) {
        setSuccess('חילוץ טקסט החל בהצלחה');
        setError('');
        
        // Update image status
        setSavedImages(prev => prev.map(image => 
          image.id === imageId 
            ? { ...image, extractionStatus: 'pending' }
            : image
        ));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה בהתחלת חילוץ הטקסט');
      }
    } catch (error) {
      console.error('Error triggering text extraction:', error);
      setError('שגיאה בהתחלת חילוץ הטקסט');
    }
  };

  // Supported file types
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml'
  ];

  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];

  const validateFile = (file) => {
    // Check file type
    if (!supportedTypes.includes(file.type)) {
      // Also check by extension as a fallback
      const fileName = file.name.toLowerCase();
      const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        return `סוג קובץ תמונה לא נתמך: ${file.name}. אנא בחר קובץ מהסוגים הנתמכים.`;
      }
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return `התמונה ${file.name} גדולה מדי. גודל מקסימלי: 10MB`;
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
          // Get image dimensions if possible
          const dimensions = await getImageDimensions(file);
          
          validFiles.push({
            file,
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            dimensions: dimensions,
            url: URL.createObjectURL(file)
          });
        } catch (error) {
          console.error('Error processing image file:', error);
          validFiles.push({
            file,
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            dimensions: null,
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
      setSuccess(`נבחרו ${validFiles.length} תמונות בהצלחה`);
    }
  };

  // Get image dimensions
  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
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

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  const getExtractionStatusText = (status) => {
    switch (status) {
      case 'pending': return 'ממתין לחילוץ';
      case 'processing': return 'מחלץ טקסט...';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      default: return 'לא החל';
    }
  };

  // Optimized modal handling with proper cleanup and timeout
  const handleViewMedia = useCallback(async (mediaItem) => {
    try {
      setViewModalOpen(true);
      
      // Create a copy to avoid mutating original
      const mediaItemCopy = { ...mediaItem };
      
      // Only fetch text if needed and not already loading
      if (mediaItemCopy.id && mediaItemCopy.extractionStatus === 'completed' && !mediaItemCopy.extractedText) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`/api/images/${mediaItemCopy.id}/text`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'max-age=300' // 5 minute cache
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.extraction) {
                mediaItemCopy.extractedText = data.extraction.text;
              }
            } else {
              console.warn('Failed to fetch extracted text:', response.status);
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error fetching extracted text:', error);
          }
        }
      }

      setSelectedMediaItem(mediaItemCopy);
    } catch (error) {
      console.error('Error in handleViewMedia:', error);
      setSelectedMediaItem(mediaItem);
    }
  }, []);

  // Optimized modal close with proper state cleanup and debounced refresh
  const handleCloseModal = useCallback(() => {
    setViewModalOpen(false);
    setSelectedMediaItem(null);
    
    // Debounced refresh to prevent rapid API calls
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      loadImagesFromServer();
    }, 500);
  }, [loadImagesFromServer]);

  // Handle edit media item
  const handleEditMedia = useCallback((mediaItem) => {
    setSelectedMediaItemForEdit(mediaItem);
    setEditModalOpen(true);
  }, []);

  // Handle close edit modal
  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setSelectedMediaItemForEdit(null);
  }, []);

  // Handle save edited media
  const handleSaveEditedMedia = async (updatedMediaItem) => {
    try {
      if (updatedMediaItem.id) {
        // Server-side image - update via API
        const token = localStorage.getItem('token');
        // Note: We would need to implement an update endpoint for tags/metadata
        // For now, just update locally
        setSavedImages(prev => prev.map(image => 
          image.id === updatedMediaItem.id 
            ? { ...image, tags: updatedMediaItem.tags, metadata: updatedMediaItem.metadata }
            : image
        ));
      } else {
        // Local file - update in selectedFiles
        setSelectedFiles(prev => prev.map(file => 
          file.id === updatedMediaItem.id 
            ? { ...file, tags: updatedMediaItem.tags, metadata: updatedMediaItem.metadata }
            : file
        ));
      }
      
      setSuccess('התגיות והמטא-דאטה עודכנו בהצלחה');
      setError('');
      handleCloseEditModal();
    } catch (error) {
      console.error('Error saving edited media:', error);
      setError(`שגיאה בשמירת השינויים: ${error.message}`);
    }
  };

  // Handle view extracted text
  const handleViewExtractedText = useCallback((image) => {
    setSelectedImageForText(image);
    setExtractedTextModalOpen(true);
  }, []);

  // Handle close extracted text modal
  const handleCloseExtractedTextModal = useCallback(() => {
    setExtractedTextModalOpen(false);
    setSelectedImageForText(null);
  }, []);

  return (
    <Container>
      <MediaFilteringHeader
        mediaType="images"
        onUpload={handleFileSelect}
        onRecord={() => {
          // Images don't have recording functionality
          alert('Recording is not available for images');
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          // TODO: Implement search functionality across all images
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
          {/* Compression controls */}
          <CompressionControls>
            <CompressionToggle>
              <input
                type="checkbox"
                checked={compressionEnabled}
                onChange={(e) => setCompressionEnabled(e.target.checked)}
                disabled={isUploading}
              />
              🗜️ דחיסת תמונות (מומלץ להעלאה מהירה יותר)
            </CompressionToggle>
            {compressionEnabled && (
              <div>
                <label>איכות דחיסה: {Math.round(compressionQuality * 100)}%</label>
                <QualitySlider
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={compressionQuality}
                  onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                  disabled={isUploading}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-textSecondary)' }}>
                  איכות נמוכה יותר = קובץ קטן יותר, העלאה מהירה יותר
                </div>
              </div>
            )}
          </CompressionControls>

          <h3 style={{ color: 'var(--color-text)', marginBottom: '1rem' }}>
            תמונות נבחרות ({selectedFiles.length})
          </h3>
          
          {selectedFiles.map(fileData => (
            <FilePreview key={fileData.id}>
              <FileIcon>
                🖼️
              </FileIcon>
              <FileInfo>
                <FileName>{fileData.name}</FileName>
                <FileSize>
                  {formatFileSize(fileData.size)}
                  {fileData.dimensions && ` • ${fileData.dimensions.width}×${fileData.dimensions.height}px`}
                </FileSize>
                {fileData.url && !isCompressing && (
                  <ImagePreview>
                    <PreviewImage src={fileData.url} alt={fileData.name} />
                  </ImagePreview>
                )}
                <MetadataForm
                  fileData={fileData}
                  onChange={(metadata) => {
                    setSelectedFiles(prev => prev.map(f => 
                      f.id === fileData.id ? { ...f, metadata } : f
                    ));
                  }}
                  disabled={isUploading}
                  mediaType="image"
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
                  placeholder="הוסף תגיות לתמונה..."
                  suggestions={globalTags}
                />
              </FileInfo>
              <ButtonGroup>
                <ViewButton onClick={() => handleViewMedia(fileData)} disabled={isUploading}>
                  👁️ צפה
                </ViewButton>
                <RemoveButton onClick={() => removeFile(fileData.id)}>
                  הסר
                </RemoveButton>
              </ButtonGroup>
            </FilePreview>
          ))}
          <SaveButton onClick={uploadSelectedFiles} disabled={isUploading}>
            {isUploading ? '📤 מעלה תמונות...' : '📤 העלה תמונות עם OCR'}
          </SaveButton>
        </div>
      )}

      {savedImages.length > 0 ? (
        <SavedImagesSection>
          <SavedImagesTitle>
            🖼️ תמונות שמורות ({savedImages.length})
          </SavedImagesTitle>
          
          <MediaGrid
            mediaItems={savedImages.map(image => ({
              ...image,
              name: image.filename || image.original_filename || image.name,
              mediaType: 'image',
              file_size: image.size || image.file_size,
              created_at: image.createdAt || image.created_at,
              thumbnail: image.url || image.thumbnail_url,
              processingStatus: extractionStatuses[image.id]?.status || image.extractionStatus || 'not_started'
            }))}
            mediaType="image"
            loading={false}
            onItemClick={handleViewMedia}
            onItemEdit={handleEditMedia}
            onItemDelete={removeSavedImage}
            onItemPreview={(item) => {
              const status = extractionStatuses[item.id]?.status || item.extractionStatus || 'not_started';
              if (status === 'completed') {
                handleViewExtractedText(item);
              } else {
                handleViewMedia(item);
              }
            }}
            emptyStateConfig={{
              icon: '🖼️',
              title: 'אין תמונות שמורות',
              description: 'העלה תמונות כדי לראות אותן כאן עם חילוץ טקסט אוטומטי'
            }}
          />
        </SavedImagesSection>
      ) : (
        !error && selectedFiles.length === 0 && (
          <EmptyState>
            <EmptyStateIcon>🖼️</EmptyStateIcon>
            <EmptyStateTitle>אין תמונות שמורות</EmptyStateTitle>
            <EmptyStateText>
              העלה תמונות כדי להתחיל. התמונות שלך יישמרו כאן עם חילוץ טקסט אוטומטי.
            </EmptyStateText>
          </EmptyState>
        )
      )}

      <MediaViewModal
        isOpen={viewModalOpen}
        onClose={handleCloseModal}
        mediaItem={selectedMediaItem}
        mediaType="image"
      />

      <EditMediaModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        mediaItem={selectedMediaItemForEdit}
        onSave={handleSaveEditedMedia}
        availableTags={globalTags}
        mediaType="image"
      />

      <ExtractedTextModal
        isOpen={extractedTextModalOpen}
        onClose={handleCloseExtractedTextModal}
        documentId={selectedImageForText?.id}
        documentName={selectedImageForText?.filename || selectedImageForText?.original_filename || selectedImageForText?.name}
      />
    </Container>
  );
};

export default ImagesManager;
