class ErrorLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format timestamp for logging
   */
  getTimestamp() {
    return new Date().toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Log authentication errors on client side
   */
  logAuthError(errorType, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`🔐 [CLIENT AUTH ERROR] ${timestamp}`);
    console.error(`Type: ${errorType}`);
    
    if (details.endpoint) {
      console.error(`Endpoint: ${details.method || 'POST'} ${details.endpoint}`);
    }
    
    if (details.status) {
      console.error(`Status: ${details.status}`);
    }
    
    if (details.message) {
      console.error(`Message: ${details.message}`);
    }
    
    if (details.response) {
      console.error(`Server Response:`, details.response);
    }
    
    if (details.validationErrors) {
      console.error(`Validation Errors:`, details.validationErrors);
    }
    
    if (details.error && details.error.stack) {
      console.error(`Stack:`, details.error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Log authentication success events on client side
   */
  logAuthSuccess(eventType, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`✅ [CLIENT AUTH SUCCESS] ${timestamp}`);
    console.log(`Type: ${eventType}`);
    
    if (details.user) {
      console.log(`User: ${details.user.email} (${details.user.role})`);
    }
    
    if (details.endpoint) {
      console.log(`Endpoint: ${details.method || 'POST'} ${details.endpoint}`);
    }
    
    console.groupEnd();
  }

  /**
   * Log content sharing errors on client side
   */
  logSharingError(errorType, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`📤 [CLIENT SHARING ERROR] ${timestamp}`);
    console.error(`Type: ${errorType}`);
    
    if (details.recordingId) {
      console.error(`Recording ID: ${details.recordingId}`);
    }
    
    if (details.contentTypes) {
      console.error(`Content Types: [${details.contentTypes.join(', ')}]`);
    }
    
    if (details.selectedClasses) {
      console.error(`Selected Classes: [${details.selectedClasses.join(', ')}]`);
    }
    
    if (details.status) {
      console.error(`HTTP Status: ${details.status}`);
    }
    
    if (details.message) {
      console.error(`Message: ${details.message}`);
    }
    
    if (details.serverResponse) {
      console.error(`Server Response:`, details.serverResponse);
    }
    
    if (details.networkError) {
      console.error(`Network Error: ${details.networkError}`);
    }
    
    if (details.error && details.error.stack) {
      console.error(`Stack:`, details.error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Log content sharing success events on client side
   */
  logSharingSuccess(details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`🎯 [CLIENT SHARING SUCCESS] ${timestamp}`);
    
    if (details.recordingId) {
      console.log(`Recording ID: ${details.recordingId}`);
    }
    
    if (details.contentTypes) {
      console.log(`Shared Content: [${details.contentTypes.join(', ')}]`);
    }
    
    if (details.classCount) {
      console.log(`Classes: ${details.classCount}`);
    }
    
    if (details.studentCount) {
      console.log(`Students Reached: ${details.studentCount}`);
    }
    
    if (details.serverResponse) {
      console.log(`Server Response:`, details.serverResponse);
    }
    
    console.groupEnd();
  }

  /**
   * Log upload errors with detailed context
   */
  logUploadError(errorType, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`📁 [CLIENT UPLOAD ERROR] ${timestamp}`);
    console.error(`Type: ${errorType}`);
    
    if (details.fileName) {
      console.error(`File: ${details.fileName}`);
    }
    
    if (details.fileSize) {
      console.error(`File Size: ${(details.fileSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    if (details.fileType) {
      console.error(`File Type: ${details.fileType}`);
    }
    
    if (details.status) {
      console.error(`HTTP Status: ${details.status}`);
    }
    
    if (details.message) {
      console.error(`Message: ${details.message}`);
    }
    
    if (details.progress) {
      console.error(`Upload Progress: ${details.progress}%`);
    }
    
    if (details.error && details.error.stack) {
      console.error(`Stack:`, details.error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Log audio player errors
   */
  logAudioError(errorType, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`🔊 [CLIENT AUDIO ERROR] ${timestamp}`);
    console.error(`Type: ${errorType}`);
    
    if (details.audioSrc) {
      console.error(`Audio Source: ${details.audioSrc}`);
    }
    
    if (details.mediaError) {
      console.error(`Media Error Code: ${details.mediaError.code}`);
      console.error(`Media Error Message: ${details.mediaError.message}`);
    }
    
    if (details.message) {
      console.error(`Message: ${details.message}`);
    }
    
    if (details.error && details.error.stack) {
      console.error(`Stack:`, details.error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Log recording errors
   */
  logRecordingError(errorType, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`🎙️ [CLIENT RECORDING ERROR] ${timestamp}`);
    console.error(`Type: ${errorType}`);
    
    if (details.deviceId) {
      console.error(`Device ID: ${details.deviceId}`);
    }
    
    if (details.constraints) {
      console.error(`Media Constraints:`, details.constraints);
    }
    
    if (details.message) {
      console.error(`Message: ${details.message}`);
    }
    
    if (details.error && details.error.name) {
      console.error(`Error Name: ${details.error.name}`);
    }
    
    if (details.error && details.error.stack) {
      console.error(`Stack:`, details.error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Log general client errors
   */
  logError(category, error, details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`❌ [CLIENT ${category.toUpperCase()} ERROR] ${timestamp}`);
    console.error(`Message: ${error.message || error}`);
    
    Object.keys(details).forEach(key => {
      if (details[key] !== undefined && details[key] !== null) {
        console.error(`${key}:`, details[key]);
      }
    });
    
    if (error.stack) {
      console.error(`Stack:`, error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Log network errors with request details
   */
  logNetworkError(details = {}) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getTimestamp();
    
    console.group(`🌐 [CLIENT NETWORK ERROR] ${timestamp}`);
    
    if (details.url) {
      console.error(`URL: ${details.url}`);
    }
    
    if (details.method) {
      console.error(`Method: ${details.method}`);
    }
    
    if (details.status) {
      console.error(`Status: ${details.status}`);
    }
    
    if (details.statusText) {
      console.error(`Status Text: ${details.statusText}`);
    }
    
    if (details.timeout) {
      console.error(`Timeout: ${details.timeout}ms`);
    }
    
    if (details.error) {
      console.error(`Error:`, details.error);
    }
    
    console.groupEnd();
  }
}

// Export singleton instance
export default new ErrorLogger();
