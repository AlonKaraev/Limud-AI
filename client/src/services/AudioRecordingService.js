/**
 * AudioRecordingService - Comprehensive audio recording system using Web Audio API and MediaRecorder API
 * Implements Stage 2 requirements for browser audio recording architecture
 */

class AudioRecordingService {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedDuration = 0;
    this.pauseStartTime = null;
    
    // Audio configuration optimized for classroom environments
    this.config = {
      sampleRate: 44100, // 44.1kHz for quality preservation
      channelCount: 1, // Mono for speech
      bitRate: 128000, // 128kbps for good quality/size balance
      mimeType: this.getSupportedMimeType(),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };

    // Event listeners
    this.eventListeners = {
      onRecordingStart: [],
      onRecordingStop: [],
      onRecordingPause: [],
      onRecordingResume: [],
      onDataAvailable: [],
      onError: [],
      onAudioLevel: []
    };

    // Quality monitoring
    this.qualityMetrics = {
      peakLevel: 0,
      averageLevel: 0,
      clippingDetected: false,
      silenceDetected: false
    };
  }

  /**
   * Get the best supported MIME type for recording
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // Fallback
  }

  /**
   * Initialize audio recording system
   */
  async initialize() {
    try {
      // Check browser compatibility
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('הדפדפן אינו תומך בהקלטת אודיו');
      }

      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder API אינו נתמך בדפדפן זה');
      }

      // Initialize Web Audio Context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();

      return true;
    } catch (error) {
      this.emitEvent('onError', { 
        type: 'INITIALIZATION_ERROR', 
        message: error.message 
      });
      throw error;
    }
  }

  /**
   * Request microphone access and setup audio stream
   */
  async requestMicrophoneAccess() {
    try {
      const constraints = {
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Setup audio analysis
      await this.setupAudioAnalysis();
      
      return {
        success: true,
        deviceLabel: this.getAudioDeviceLabel(),
        sampleRate: this.audioContext.sampleRate
      };
    } catch (error) {
      let errorMessage = 'שגיאה בגישה למיקרופון';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'הגישה למיקרופון נדחתה. אנא אפשר גישה למיקרופון בהגדרות הדפדפן';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'לא נמצא מיקרופון במכשיר';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'המיקרופון בשימוש על ידי יישום אחר';
      }

      this.emitEvent('onError', { 
        type: 'MICROPHONE_ACCESS_ERROR', 
        message: errorMessage,
        originalError: error
      });
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Setup audio analysis for real-time monitoring
   */
  async setupAudioAnalysis() {
    if (!this.stream || !this.audioContext) {
      throw new Error('Audio stream or context not available');
    }

    // Create audio nodes
    this.microphone = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    
    // Configure analyser
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    // Connect nodes
    this.microphone.connect(this.analyser);
    
    // Start audio level monitoring
    this.startAudioLevelMonitoring();
  }

  /**
   * Start real-time audio level monitoring
   */
  startAudioLevelMonitoring() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateAudioLevel = () => {
      if (!this.isRecording && !this.isPaused) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate audio levels
      let sum = 0;
      let peak = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        sum += value;
        if (value > peak) peak = value;
      }
      
      const average = sum / bufferLength;
      const normalizedPeak = peak / 255;
      const normalizedAverage = average / 255;
      
      // Update quality metrics
      this.qualityMetrics.peakLevel = normalizedPeak;
      this.qualityMetrics.averageLevel = normalizedAverage;
      this.qualityMetrics.clippingDetected = normalizedPeak > 0.95;
      this.qualityMetrics.silenceDetected = normalizedAverage < 0.01;
      
      // Emit audio level event
      this.emitEvent('onAudioLevel', {
        peak: normalizedPeak,
        average: normalizedAverage,
        clipping: this.qualityMetrics.clippingDetected,
        silence: this.qualityMetrics.silenceDetected
      });
      
      // Continue monitoring
      requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
  }

  /**
   * Get audio device label
   */
  getAudioDeviceLabel() {
    if (!this.stream) return 'Unknown Device';
    
    const audioTrack = this.stream.getAudioTracks()[0];
    return audioTrack ? audioTrack.label || 'Default Microphone' : 'Unknown Device';
  }

  /**
   * Start recording
   */
  async startRecording() {
    try {
      if (this.isRecording) {
        throw new Error('הקלטה כבר פעילה');
      }

      if (!this.stream) {
        await this.requestMicrophoneAccess();
      }

      // Reset recording state
      this.recordedChunks = [];
      this.pausedDuration = 0;
      this.startTime = Date.now();
      
      // Create MediaRecorder
      const options = {
        mimeType: this.config.mimeType,
        audioBitsPerSecond: this.config.bitRate
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      // Setup event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.emitEvent('onDataAvailable', { 
            chunk: event.data, 
            totalChunks: this.recordedChunks.length 
          });
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        this.emitEvent('onError', { 
          type: 'RECORDING_ERROR', 
          message: 'שגיאה בהקלטה',
          error: event.error 
        });
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.isPaused = false;

      this.emitEvent('onRecordingStart', {
        startTime: this.startTime,
        mimeType: this.config.mimeType,
        sampleRate: this.audioContext.sampleRate
      });

      return {
        success: true,
        startTime: this.startTime
      };
    } catch (error) {
      this.emitEvent('onError', { 
        type: 'START_RECORDING_ERROR', 
        message: error.message 
      });
      throw error;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (!this.isRecording || this.isPaused) {
      throw new Error('אין הקלטה פעילה לעצירה זמנית');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.pauseStartTime = Date.now();
      
      this.emitEvent('onRecordingPause', {
        pauseTime: this.pauseStartTime,
        recordedDuration: this.getRecordedDuration()
      });
    }
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (!this.isRecording || !this.isPaused) {
      throw new Error('אין הקלטה מושהית לחידוש');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      // Add paused duration to total
      if (this.pauseStartTime) {
        this.pausedDuration += Date.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      
      this.mediaRecorder.resume();
      this.isPaused = false;
      
      this.emitEvent('onRecordingResume', {
        resumeTime: Date.now(),
        totalPausedDuration: this.pausedDuration
      });
    }
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    if (!this.isRecording) {
      throw new Error('אין הקלטה פעילה לעצירה');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for recording to stop'));
      }, 5000);

      this.mediaRecorder.onstop = () => {
        clearTimeout(timeout);
        const result = this.handleRecordingStop();
        resolve(result);
      };

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  /**
   * Handle recording stop
   */
  handleRecordingStop() {
    const endTime = Date.now();
    
    // Calculate duration BEFORE resetting state
    const totalDuration = this.getRecordedDuration();
    
    console.log('Recording stop details:', {
      startTime: this.startTime,
      endTime: endTime,
      totalDuration: totalDuration,
      pausedDuration: this.pausedDuration,
      chunksCount: this.recordedChunks.length
    });
    
    // Create final audio blob
    const audioBlob = new Blob(this.recordedChunks, { 
      type: this.config.mimeType 
    });

    // Generate quality report with the calculated duration
    const qualityReport = this.generateQualityReport(audioBlob, totalDuration);

    const result = {
      audioBlob,
      duration: totalDuration,
      size: audioBlob.size,
      mimeType: this.config.mimeType,
      qualityReport,
      endTime
    };

    // Reset state AFTER creating result
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedDuration = 0;
    this.pauseStartTime = null;

    this.emitEvent('onRecordingStop', result);
    
    return result;
  }

  /**
   * Get current recorded duration in milliseconds
   */
  getRecordedDuration() {
    if (!this.startTime) {
      console.log('getRecordedDuration: No startTime, returning 0');
      return 0;
    }
    
    const currentTime = Date.now();
    const totalElapsed = currentTime - this.startTime;
    const currentPausedDuration = this.isPaused && this.pauseStartTime 
      ? currentTime - this.pauseStartTime 
      : 0;
    
    const duration = totalElapsed - this.pausedDuration - currentPausedDuration;
    
    console.log('getRecordedDuration calculation:', {
      startTime: this.startTime,
      currentTime,
      totalElapsed,
      pausedDuration: this.pausedDuration,
      currentPausedDuration,
      finalDuration: duration
    });
    
    return Math.max(0, duration); // Ensure non-negative duration
  }

  /**
   * Generate quality assessment report
   */
  generateQualityReport(audioBlob, duration) {
    console.log('generateQualityReport called with:', { 
      blobSize: audioBlob.size, 
      duration: duration,
      durationInSeconds: duration / 1000
    });
    
    // Ensure duration is valid
    const validDuration = Math.max(duration || 0, 0);
    const sizeInMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
    
    // Avoid division by zero
    const bitrate = validDuration > 0 ? Math.round((audioBlob.size * 8) / (validDuration / 1000)) : 0;
    
    const issues = [];
    const recommendations = [];

    // Check for quality issues
    if (this.qualityMetrics.clippingDetected) {
      issues.push('זוהה חיתוך אודיו (clipping) - הקול חזק מדי');
      recommendations.push('הנמך את רמת המיקרופון או התרחק ממקור הקול');
    }

    if (this.qualityMetrics.silenceDetected) {
      issues.push('זוהו תקופות שקט ארוכות');
      recommendations.push('בדוק את חיבור המיקרופון ורמת הקול');
    }

    if (audioBlob.size > 50 * 1024 * 1024) { // 50MB
      issues.push('קובץ גדול מהרגיל');
      recommendations.push('שקול דחיסה נוספת או הקלטה באיכות נמוכה יותר');
    }

    const report = {
      duration: validDuration,
      size: audioBlob.size,
      sizeInMB,
      bitrate,
      mimeType: this.config.mimeType,
      sampleRate: this.audioContext?.sampleRate || this.config.sampleRate,
      peakLevel: this.qualityMetrics.peakLevel,
      averageLevel: this.qualityMetrics.averageLevel,
      issues,
      recommendations,
      overallQuality: this.calculateOverallQuality()
    };
    
    console.log('Generated quality report:', report);
    return report;
  }

  /**
   * Calculate overall quality score
   */
  calculateOverallQuality() {
    let score = 100;
    
    if (this.qualityMetrics.clippingDetected) score -= 30;
    if (this.qualityMetrics.silenceDetected) score -= 20;
    if (this.qualityMetrics.averageLevel < 0.1) score -= 25;
    if (this.qualityMetrics.averageLevel > 0.8) score -= 15;
    
    if (score >= 90) return 'מצוינת';
    if (score >= 75) return 'טובה';
    if (score >= 60) return 'בינונית';
    return 'נמוכה';
  }

  /**
   * Get available audio input devices
   */
  async getAudioInputDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `מיקרופון ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
    } catch (error) {
      this.emitEvent('onError', { 
        type: 'DEVICE_ENUMERATION_ERROR', 
        message: 'שגיאה בקבלת רשימת מכשירי אודיו' 
      });
      return [];
    }
  }

  /**
   * Switch to different audio input device
   */
  async switchAudioDevice(deviceId) {
    try {
      // Stop current stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      // Request new stream with specific device
      const constraints = {
        audio: {
          deviceId: { exact: deviceId },
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      await this.setupAudioAnalysis();

      return {
        success: true,
        deviceLabel: this.getAudioDeviceLabel()
      };
    } catch (error) {
      this.emitEvent('onError', { 
        type: 'DEVICE_SWITCH_ERROR', 
        message: 'שגיאה במעבר למכשיר אודיו אחר' 
      });
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop recording if active
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
    }

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    // Reset state
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
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
   * Get current recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.getRecordedDuration(),
      hasStream: !!this.stream,
      deviceLabel: this.getAudioDeviceLabel(),
      qualityMetrics: { ...this.qualityMetrics }
    };
  }
}

export default AudioRecordingService;
