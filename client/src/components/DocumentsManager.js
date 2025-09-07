import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import MediaFilteringHeader from './MediaFilteringHeader';
import MediaViewModal from './MediaViewModal';
import EditMediaModal from './EditMediaModal';
import ExtractedTextModal from './ExtractedTextModal';
import TagInput from './TagInput';
import MetadataForm from './MetadataForm';
import MediaGrid from './MediaGrid';

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

const ProgressMessage = styled.div`
  font-size: 0.75rem;
  color: var(--color-textSecondary);
  margin-top: 0.25rem;
  font-style: italic;
`;

const ExtractionDetails = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-primary);
`;

const ExtractionMetadata = styled.div`
  font-size: 0.75rem;
  color: var(--color-textTertiary);
  margin-top: 0.25rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ConfidenceScore = styled.span`
  background: ${props => {
    const confidence = props.confidence || 0;
    if (confidence >= 0.9) return 'var(--color-successLight, #d5f4e6)';
    if (confidence >= 0.7) return 'var(--color-warningLight, #fff3cd)';
    return 'var(--color-dangerLight, #fadbd8)';
  }};
  color: ${props => {
    const confidence = props.confidence || 0;
    if (confidence >= 0.9) return 'var(--color-success, #155724)';
    if (confidence >= 0.7) return 'var(--color-warning, #856404)';
    return 'var(--color-danger, #721c24)';
  }};
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 500;
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

const ExtractButton = styled.button`
  background: var(--color-info, #17a2b8);
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

const TextPreview = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-top: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-wrap;
  color: var(--color-textSecondary);
`;

const DocumentsManager = ({ t }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMediaItemForEdit, setSelectedMediaItemForEdit] = useState(null);
  const [globalTags, setGlobalTags] = useState([]);
  const [extractionStatuses, setExtractionStatuses] = useState({});
  const [extractedTextModalOpen, setExtractedTextModalOpen] = useState(false);
  const [selectedDocumentForText, setSelectedDocumentForText] = useState(null);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved documents from server on component mount
  useEffect(() => {
    loadDocumentsFromServer();
  }, []);


  // Update global tags when documents change
  useEffect(() => {
    const allTags = new Set();
    
    // Collect tags from selected files
    selectedFiles.forEach(file => {
      if (file.tags && Array.isArray(file.tags)) {
        file.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Collect tags from saved documents
    savedDocuments.forEach(doc => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    setGlobalTags(Array.from(allTags));
  }, [selectedFiles, savedDocuments]);

  // Poll extraction statuses for documents that are being processed
  useEffect(() => {
    const documentsBeingProcessed = savedDocuments.filter(doc => 
      doc.extractionStatus && ['pending', 'processing'].includes(doc.extractionStatus)
    );

    if (documentsBeingProcessed.length > 0) {
      const interval = setInterval(() => {
        documentsBeingProcessed.forEach(doc => {
          checkExtractionStatus(doc.id);
        });
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [savedDocuments]);

  // Load documents from server
  const loadDocumentsFromServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        setError('נדרש להתחבר מחדש');
        return;
      }

      console.log('Loading documents from server...');
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Documents API response status:', response.status);
      const data = await response.json();
      console.log('Documents API response data:', data);

      if (response.ok) {
        if (data.success) {
          const documentsWithExtraction = await Promise.all(
            (data.documents || []).map(async (document) => {
              // Fetch extracted text for completed extractions
              if (document.extractionStatus === 'completed') {
                try {
                  const textResponse = await fetch(`/api/documents/${document.id}/text`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (textResponse.ok) {
                    const textData = await textResponse.json();
                    return {
                      ...document,
                      extraction: textData.extraction
                    };
                  }
                } catch (error) {
                  console.error(`Error fetching text for document ${document.id}:`, error);
                }
              }
              return document;
            })
          );
          
          setSavedDocuments(documentsWithExtraction);
          console.log(`Loaded ${documentsWithExtraction.length} documents with extraction data`);
        } else {
          console.error('API returned success=false:', data);
          setError(data.error || 'שגיאה בטעינת המסמכים');
        }
      } else {
        console.error('API request failed:', response.status, data);
        if (response.status === 401) {
          setError('נדרש להתחבר מחדש');
          localStorage.removeItem('token');
        } else {
          setError(data.error || 'שגיאה בטעינת המסמכים');
        }
      }
    } catch (error) {
      console.error('Error loading documents from server:', error);
      setError('שגיאה בחיבור לשרת');
    }
  };

  // Check extraction status for a document
  const checkExtractionStatus = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/documents/${documentId}/extraction-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        setExtractionStatuses(prev => ({
          ...prev,
          [documentId]: {
            status: data.extractionStatus,
            progress: data.job?.progress || 0,
            progressMessage: data.job?.progressMessage,
            errorMessage: data.job?.errorMessage,
            extraction: data.extraction
          }
        }));

        // Update document in saved documents if status changed
        if (data.extractionStatus === 'completed' || data.extractionStatus === 'failed') {
          setSavedDocuments(prev => prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, extractionStatus: data.extractionStatus, extraction: data.extraction }
              : doc
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
      setError('אין קבצים להעלאה');
      return;
    }

    try {
      setIsUploading(true);
      setSuccess('מעלה קבצים...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('נדרש להתחבר מחדש');
        return;
      }

      const uploadPromises = selectedFiles.map(async (fileData, index) => {
        setSuccess(`מעלה קובץ ${index + 1} מתוך ${selectedFiles.length}: ${fileData.name}...`);
        
        const formData = new FormData();
        formData.append('document', fileData.file);
        formData.append('metadata', JSON.stringify(fileData.metadata || {}));
        formData.append('tags', JSON.stringify(fileData.tags || []));

        const response = await fetch('/api/documents/upload', {
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

        return await response.json();
      });

      const results = await Promise.all(uploadPromises);
      
      // Add uploaded documents to saved documents list
      const newDocuments = results.map(result => ({
        ...result.document,
        extractionStatus: 'pending'
      }));
      
      setSavedDocuments(prev => [...prev, ...newDocuments]);
      setSelectedFiles([]);
      
      setSuccess(`הועלו ${results.length} מסמכים בהצלחה. חילוץ הטקסט החל...`);
      setError('');
    } catch (error) {
      console.error('Error uploading documents:', error);
      setError(`שגיאה בהעלאת המסמכים: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove saved document
  const removeSavedDocument = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('נדרש להתחבר מחדש');
        return;
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSavedDocuments(prev => prev.filter(doc => doc.id !== documentId));
        setSuccess('המסמך נמחק בהצלחה');
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'שגיאה במחיקת המסמך');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('שגיאה במחיקת המסמך');
    }
  };

  // Manually trigger text extraction
  const triggerTextExtraction = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('נדרש להתחבר מחדש');
        return;
      }

      const response = await fetch(`/api/documents/${documentId}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method: 'auto' })
      });

      if (response.ok) {
        setSuccess('חילוץ טקסט החל בהצלחה');
        setError('');
        
        // Update document status
        setSavedDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, extractionStatus: 'pending' }
            : doc
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

  const getExtractionStatusText = (status) => {
    switch (status) {
      case 'pending': return 'ממתין לחילוץ';
      case 'processing': return 'מחלץ טקסט...';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      default: return 'לא החל';
    }
  };

  // Handle view media item
  const handleViewMedia = async (mediaItem) => {
    // If it's a saved document with extracted text, fetch the text
    if (mediaItem.id && mediaItem.extractionStatus === 'completed') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${mediaItem.id}/text`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          mediaItem.extractedText = data.extraction.text;
        }
      } catch (error) {
        console.error('Error fetching extracted text:', error);
      }
    }

    setSelectedMediaItem(mediaItem);
    setViewModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setSelectedMediaItem(null);
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
      if (updatedMediaItem.id) {
        // Server-side document - update via API
        const token = localStorage.getItem('token');
        // Note: We would need to implement an update endpoint for tags/metadata
        // For now, just update locally
        setSavedDocuments(prev => prev.map(document => 
          document.id === updatedMediaItem.id 
            ? { ...document, tags: updatedMediaItem.tags, metadata: updatedMediaItem.metadata }
            : document
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
  const handleViewExtractedText = (document) => {
    setSelectedDocumentForText(document);
    setExtractedTextModalOpen(true);
  };

  // Handle close extracted text modal
  const handleCloseExtractedTextModal = () => {
    setExtractedTextModalOpen(false);
    setSelectedDocumentForText(null);
  };

  return (
    <Container>
      <MediaFilteringHeader
        mediaType="documents"
        onUpload={handleFileSelect}
        onRecord={() => {
          // Documents don't have recording functionality
          alert('Recording is not available for documents');
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          // TODO: Implement search functionality across all documents
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
                <MetadataForm
                  fileData={fileData}
                  onChange={(metadata) => {
                    setSelectedFiles(prev => prev.map(f => 
                      f.id === fileData.id ? { ...f, metadata } : f
                    ));
                  }}
                  disabled={isUploading}
                  mediaType="document"
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
                  placeholder="הוסף תגיות למסמך..."
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
            {isUploading ? '📤 מעלה קבצים...' : '📤 העלה מסמכים'}
          </SaveButton>
        </div>
      )}

      {savedDocuments.length > 0 && (
        <SavedDocumentsSection>
          <SavedDocumentsTitle>
            📚 מסמכים שמורים ({savedDocuments.length})
          </SavedDocumentsTitle>
          <MediaGrid
            mediaItems={savedDocuments.map(document => {
              const status = extractionStatuses[document.id] || { status: document.extractionStatus || 'not_started', progress: 0 };
              return {
                ...document,
                name: document.filename || document.original_filename || document.name,
                mediaType: 'document',
                file_size: document.size || document.file_size,
                created_at: document.createdAt || document.created_at,
                processingStatus: status.status,
                processingProgress: status.progress,
                processingMessage: status.progressMessage,
                errorMessage: status.errorMessage,
                extraction: status.extraction
              };
            })}
            mediaType="document"
            loading={false}
            onItemClick={handleViewMedia}
            onItemEdit={handleEditMedia}
            onItemDelete={removeSavedDocument}
            onItemPreview={(item) => {
              const status = extractionStatuses[item.id] || { status: item.extractionStatus || 'not_started', progress: 0 };
              if (status.status === 'completed' && status.extraction && status.extraction.text) {
                handleViewExtractedText(item);
              } else {
                handleViewMedia(item);
              }
            }}
            customActions={(item) => {
              const status = extractionStatuses[item.id] || { status: item.extractionStatus || 'not_started', progress: 0 };
              const actions = [];
              
              if (status.status === 'failed') {
                actions.push({
                  label: '🔄 נסה שוב',
                  onClick: () => triggerTextExtraction(item.id),
                  style: { background: 'var(--color-info, #17a2b8)' }
                });
              }
              
              if (status.status === 'not_started') {
                actions.push({
                  label: '🔍 חלץ טקסט',
                  onClick: () => triggerTextExtraction(item.id),
                  style: { background: 'var(--color-info, #17a2b8)' }
                });
              }
              
              if (status.status === 'completed' && status.extraction && status.extraction.text) {
                actions.push({
                  label: '📄 צפה בטקסט',
                  onClick: () => handleViewExtractedText(item),
                  style: { background: 'var(--color-success)' }
                });
              }
              
              return actions;
            }}
          />
        </SavedDocumentsSection>
      )}

      <MediaViewModal
        isOpen={viewModalOpen}
        onClose={handleCloseModal}
        mediaItem={selectedMediaItem}
        mediaType="document"
      />

      <EditMediaModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        mediaItem={selectedMediaItemForEdit}
        onSave={handleSaveEditedMedia}
        availableTags={globalTags}
        mediaType="document"
      />

      <ExtractedTextModal
        isOpen={extractedTextModalOpen}
        onClose={handleCloseExtractedTextModal}
        documentId={selectedDocumentForText?.id}
        documentName={selectedDocumentForText?.filename || selectedDocumentForText?.original_filename || selectedDocumentForText?.name}
        mediaType="document"
      />
    </Container>
  );
};

export default DocumentsManager;
