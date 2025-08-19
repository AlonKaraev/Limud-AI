/**
 * FileStorageService - Handles audio file storage, upload, and management
 * Implements Stage 2 requirements for file storage and management system
 */

class FileStorageService {
  constructor() {
    this.uploadQueue = [];
    this.isUploading = false;
    this.chunkSize = 1024 * 1024; // 1MB chunks
    this.maxRetries = 3;
    this.compressionEnabled = true;
    
    // Event listeners
    this.eventListeners = {
      onUploadStart: [],
      onUploadProgress: [],
      onUploadComplete: [],
      onUploadError: [],
      onCompressionStart: [],
      onCompressionComplete: []
    };
  }

  /**
   * Save recording with metadata and optional compression
   */
  async saveRecording(recordingData) {
    try {
      const { audioBlob, metadata, qualityReport } = recordingData;
      
      // Generate unique filename
      const filename = this.generateFilename(metadata);
      
      // Compress audio if enabled and file is large
      let processedBlob = audioBlob;
      if (this.compressionEnabled && audioBlob.size > 10 * 1024 * 1024) { // 10MB
        this.emitEvent('onCompressionStart', { originalSize: audioBlob.size });
        processedBlob = await this.compressAudio(audioBlob);
        this.emitEvent('onCompressionComplete', { 
          originalSize: audioBlob.size,
          compressedSize: processedBlob.size,
          compressionRatio: (1 - processedBlob.size / audioBlob.size) * 100
        });
      }

      // Create recording object
      const recording = {
        id: this.generateId(),
        filename,
        blob: processedBlob,
        metadata: {
          ...metadata,
          originalFilename: filename,
          fileSize: processedBlob.size,
          mimeType: audioBlob.type,
          createdAt: new Date().toISOString(),
          duration: qualityReport.duration,
          qualityReport
        }
      };

      // Store locally first
      await this.storeLocally(recording);
      
      // Add to upload queue
      this.addToUploadQueue(recording);
      
      return {
        success: true,
        recordingId: recording.id,
        filename: recording.filename,
        size: processedBlob.size
      };
    } catch (error) {
      this.emitEvent('onUploadError', {
        type: 'SAVE_ERROR',
        message: 'שגיאה בשמירת ההקלטה',
        error
      });
      throw error;
    }
  }

  /**
   * Generate unique filename based on metadata and timestamp
   */
  generateFilename(metadata) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    let filename = `lesson_${dateStr}_${timeStr}`;
    
    if (metadata.lessonName) {
      const cleanName = metadata.lessonName
        .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, '') // Keep Hebrew, English, numbers, spaces
        .replace(/\s+/g, '_')
        .substring(0, 50);
      filename = `${cleanName}_${dateStr}_${timeStr}`;
    }
    
    return `${filename}.webm`;
  }

  /**
   * Generate unique ID for recording
   */
  generateId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store recording locally using IndexedDB
   */
  async storeLocally(recording) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LimudAI_Recordings', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('recordings')) {
          const store = db.createObjectStore('recordings', { keyPath: 'id' });
          store.createIndex('createdAt', 'metadata.createdAt');
          store.createIndex('filename', 'filename');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        
        const addRequest = store.add(recording);
        
        addRequest.onsuccess = () => resolve(recording.id);
        addRequest.onerror = () => reject(addRequest.error);
      };
    });
  }

  /**
   * Get locally stored recordings
   */
  async getLocalRecordings() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LimudAI_Recordings', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['recordings'], 'readonly');
        const store = transaction.objectStore('recordings');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const recordings = getAllRequest.result.map(recording => ({
            ...recording,
            // Don't include blob in list view for performance
            blob: undefined,
            hasLocalBlob: true
          }));
          resolve(recordings);
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  /**
   * Get specific recording by ID
   */
  async getRecording(recordingId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LimudAI_Recordings', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['recordings'], 'readonly');
        const store = transaction.objectStore('recordings');
        const getRequest = store.get(recordingId);
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  /**
   * Delete recording locally
   */
  async deleteLocalRecording(recordingId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LimudAI_Recordings', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        const deleteRequest = store.delete(recordingId);
        
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  /**
   * Compress audio blob (basic implementation)
   */
  async compressAudio(audioBlob) {
    // For now, return original blob
    // In a full implementation, this would use Web Audio API to reduce quality/bitrate
    return audioBlob;
  }

  /**
   * Add recording to upload queue
   */
  addToUploadQueue(recording) {
    this.uploadQueue.push(recording);
    
    // Start upload process if not already running
    if (!this.isUploading) {
      this.processUploadQueue();
    }
  }

  /**
   * Process upload queue
   */
  async processUploadQueue() {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }

    this.isUploading = true;

    while (this.uploadQueue.length > 0) {
      const recording = this.uploadQueue.shift();
      
      try {
        await this.uploadRecording(recording);
      } catch (error) {
        console.error('Upload failed for recording:', recording.id, error);
        
        // Re-queue for retry if under retry limit
        if (!recording.retryCount) recording.retryCount = 0;
        if (recording.retryCount < this.maxRetries) {
          recording.retryCount++;
          this.uploadQueue.push(recording);
        } else {
          this.emitEvent('onUploadError', {
            type: 'UPLOAD_FAILED',
            recordingId: recording.id,
            message: 'העלאה נכשלה לאחר מספר ניסיונות',
            error
          });
        }
      }
    }

    this.isUploading = false;
  }

  /**
   * Upload recording to server in chunks
   */
  async uploadRecording(recording) {
    const { id, filename, blob, metadata } = recording;
    
    this.emitEvent('onUploadStart', {
      recordingId: id,
      filename,
      size: blob.size
    });

    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('לא נמצא טוקן אימות');
    }

    try {
      // Upload in chunks for large files
      if (blob.size > this.chunkSize) {
        await this.uploadInChunks(id, filename, blob, metadata, token);
      } else {
        await this.uploadComplete(id, filename, blob, metadata, token);
      }

      this.emitEvent('onUploadComplete', {
        recordingId: id,
        filename,
        size: blob.size
      });

    } catch (error) {
      this.emitEvent('onUploadError', {
        type: 'UPLOAD_ERROR',
        recordingId: id,
        message: 'שגיאה בהעלאת הקובץ לשרת',
        error
      });
      throw error;
    }
  }

  /**
   * Upload file in chunks
   */
  async uploadInChunks(recordingId, filename, blob, metadata, token) {
    const totalChunks = Math.ceil(blob.size / this.chunkSize);
    let uploadedChunks = 0;

    // Initialize upload session
    const initResponse = await fetch('/api/recordings/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recordingId,
        filename,
        fileSize: blob.size,
        totalChunks,
        metadata
      })
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize upload');
    }

    const { uploadId } = await initResponse.json();

    // Upload chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, blob.size);
      const chunk = blob.slice(start, end);

      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('chunk', chunk);

      const chunkResponse = await fetch('/api/recordings/upload/chunk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${chunkIndex}`);
      }

      uploadedChunks++;
      
      this.emitEvent('onUploadProgress', {
        recordingId,
        progress: (uploadedChunks / totalChunks) * 100,
        uploadedChunks,
        totalChunks
      });
    }

    // Finalize upload
    const finalizeResponse = await fetch('/api/recordings/upload/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ uploadId })
    });

    if (!finalizeResponse.ok) {
      throw new Error('Failed to finalize upload');
    }
  }

  /**
   * Upload complete file at once
   */
  async uploadComplete(recordingId, filename, blob, metadata, token) {
    const formData = new FormData();
    formData.append('recordingId', recordingId);
    formData.append('filename', filename);
    formData.append('audio', blob, filename);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/recordings/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Upload failed');
    }

    return await response.json();
  }

  /**
   * Get recordings from server
   */
  async getServerRecordings() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('לא נמצא טוקן אימות');
    }

    try {
      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      return await response.json();
    } catch (error) {
      this.emitEvent('onUploadError', {
        type: 'FETCH_ERROR',
        message: 'שגיאה בטעינת הקלטות מהשרת',
        error
      });
      throw error;
    }
  }

  /**
   * Download recording from server
   */
  async downloadRecording(recordingId) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('לא נמצא טוקן אימות');
    }

    try {
      const response = await fetch(`/api/recordings/${recordingId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download recording');
      }

      return await response.blob();
    } catch (error) {
      this.emitEvent('onUploadError', {
        type: 'DOWNLOAD_ERROR',
        message: 'שגיאה בהורדת ההקלטה',
        error
      });
      throw error;
    }
  }

  /**
   * Delete recording from server
   */
  async deleteServerRecording(recordingId) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('לא נמצא טוקן אימות');
    }

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      return true;
    } catch (error) {
      this.emitEvent('onUploadError', {
        type: 'DELETE_ERROR',
        message: 'שגיאה במחיקת ההקלטה',
        error
      });
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      // Local storage stats
      const localRecordings = await this.getLocalRecordings();
      const localSize = localRecordings.reduce((total, rec) => total + (rec.metadata?.fileSize || 0), 0);

      // Server storage stats
      const token = localStorage.getItem('token');
      let serverStats = { count: 0, size: 0 };
      
      if (token) {
        try {
          const response = await fetch('/api/recordings/stats', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            serverStats = await response.json();
          }
        } catch (error) {
          console.warn('Failed to fetch server stats:', error);
        }
      }

      return {
        local: {
          count: localRecordings.length,
          size: localSize
        },
        server: serverStats,
        total: {
          count: localRecordings.length + serverStats.count,
          size: localSize + serverStats.size
        }
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        local: { count: 0, size: 0 },
        server: { count: 0, size: 0 },
        total: { count: 0, size: 0 }
      };
    }
  }

  /**
   * Clean up old recordings based on retention policy
   */
  async cleanupOldRecordings(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const localRecordings = await this.getLocalRecordings();
      const oldRecordings = localRecordings.filter(rec => 
        new Date(rec.metadata.createdAt) < cutoffDate
      );

      for (const recording of oldRecordings) {
        await this.deleteLocalRecording(recording.id);
      }

      return {
        cleaned: oldRecordings.length,
        remaining: localRecordings.length - oldRecordings.length
      };
    } catch (error) {
      console.error('Error cleaning up old recordings:', error);
      return { cleaned: 0, remaining: 0 };
    }
  }

  /**
   * Event system methods
   */
  addEventListener(eventType, callback) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].push(callback);
    }
  }

  removeEventListener(eventType, callback) {
    if (this.eventListeners[eventType]) {
      const index = this.eventListeners[eventType].indexOf(callback);
      if (index > -1) {
        this.eventListeners[eventType].splice(index, 1);
      }
    }
  }

  emitEvent(eventType, data) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get upload queue status
   */
  getUploadStatus() {
    return {
      isUploading: this.isUploading,
      queueLength: this.uploadQueue.length,
      queue: this.uploadQueue.map(item => ({
        id: item.id,
        filename: item.filename,
        size: item.blob?.size || 0,
        retryCount: item.retryCount || 0
      }))
    };
  }
}

export default FileStorageService;
