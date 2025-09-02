const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { openaiClient, AI_PROVIDERS, MODEL_CONFIGS, calculateEstimatedCost } = require('../config/ai-services');
const { run, query } = require('../config/database-sqlite');
const AudioProcessingService = require('./AudioProcessingService');
const VideoProcessingService = require('./VideoProcessingService');
const apiRateLimiter = require('../utils/APIRateLimiter');

/**
 * Multi-Language Transcription Service
 * Handles audio-to-text conversion with automatic language detection (Hebrew/English)
 */
class TranscriptionService {
  constructor() {
    this.supportedAudioFormats = ['.webm', '.mp3', '.wav', '.m4a', '.ogg'];
    this.supportedVideoFormats = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.3gp'];
    this.maxFileSize = 25 * 1024 * 1024; // 25MB OpenAI limit for audio
    this.maxVideoFileSize = 200 * 1024 * 1024; // 200MB limit for video files
    this.videoProcessingService = new VideoProcessingService();
  }

  /**
   * Transcribe audio file with automatic language detection (Hebrew/English)
   * @param {Object} options - Transcription options
   * @param {string} options.filePath - Path to audio file
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {number} options.jobId - Processing job ID
   * @param {string} options.provider - AI provider (default: openai)
   * @param {boolean} options.useEnhancedProcessing - Use compression and segmentation (default: true)
   * @returns {Promise<Object>} Transcription result with detected language
   */
  async transcribeAudio(options) {
    const {
      filePath,
      recordingId,
      userId,
      jobId,
      provider = AI_PROVIDERS.OPENAI,
      useEnhancedProcessing = true
    } = options;

    const startTime = Date.now();
    let extractedAudioPath = null;

    try {
      // Validate file and check if it's a video
      const validation = await this.validateAudioFile(filePath);
      let actualFilePath = filePath;

      // If it's a video file, extract audio first
      if (validation.isVideoFile) {
        console.log(`Video file detected: ${path.basename(filePath)}. Extracting audio for transcription...`);
        
        if (!this.videoProcessingService.isFFmpegAvailable()) {
          throw new Error('FFmpeg לא זמין - לא ניתן לחלץ אודיו מקובץ וידאו. אנא התקן FFmpeg או העלה קובץ אודיו ישירות.');
        }

        // Create temp directory for audio extraction
        const tempDir = path.join(__dirname, '../uploads/temp/audio-extraction');
        await fs.promises.mkdir(tempDir, { recursive: true });

        // Generate unique filename for extracted audio
        const audioFilename = `extracted_audio_${recordingId}_${Date.now()}.mp3`;
        extractedAudioPath = path.join(tempDir, audioFilename);

        // Extract audio from video
        await this.videoProcessingService.extractAudioFromVideo(filePath, extractedAudioPath);
        
        console.log(`Audio extracted successfully: ${audioFilename}`);
        actualFilePath = extractedAudioPath;
      }

      let transcriptionResult;
      
      if (useEnhancedProcessing) {
        // Use enhanced processing with compression and segmentation
        transcriptionResult = await this.transcribeWithEnhancedProcessing(actualFilePath, provider);
      } else {
        // Use original single-file transcription with rate limiter
        switch (provider) {
          case AI_PROVIDERS.OPENAI:
            transcriptionResult = await apiRateLimiter.queueRequest('openai', async () => {
              return await this.transcribeWithOpenAIRateLimited(actualFilePath);
            }, {
              maxRetries: 3,
              priority: 'high' // Single files get higher priority than segments
            });
            break;
          default:
            throw new Error(`Unsupported AI provider: ${provider}`);
        }
      }

      // Add video processing info to metadata if audio was extracted
      if (validation.isVideoFile && extractedAudioPath) {
        transcriptionResult.videoProcessing = {
          originalVideoFile: path.basename(filePath),
          audioExtracted: true,
          extractedAudioPath: path.basename(extractedAudioPath)
        };
      }

      const processingDuration = Date.now() - startTime;

      // Calculate confidence score from segments if available
      const confidenceScore = this.calculateConfidenceScore(transcriptionResult);

      // Save transcription to database
      const transcription = await this.saveTranscription({
        recordingId,
        userId,
        jobId,
        transcriptionText: transcriptionResult.text,
        confidenceScore,
        languageDetected: transcriptionResult.language || 'he',
        processingDuration,
        aiProvider: provider,
        modelVersion: transcriptionResult.model || MODEL_CONFIGS.transcription[provider].model,
        segments: transcriptionResult.segments || [],
        metadata: {
          duration: transcriptionResult.duration,
          words: transcriptionResult.words || null,
          task: transcriptionResult.task || 'transcribe',
          enhancedProcessing: useEnhancedProcessing,
          audioProcessing: transcriptionResult.audioProcessing || null
        }
      });

      // Track usage
      await this.trackUsage({
        userId,
        provider,
        serviceType: 'transcription',
        processingTime: processingDuration,
        audioMinutes: transcriptionResult.duration ? transcriptionResult.duration / 60 : 0,
        metadata: {
          model: transcriptionResult.model,
          file_size: await this.getFileSize(filePath),
          language: transcriptionResult.language,
          enhanced_processing: useEnhancedProcessing
        }
      });

      return {
        success: true,
        transcription,
        processingTime: processingDuration,
        confidenceScore,
        provider,
        enhancedProcessing: useEnhancedProcessing
      };

    } catch (error) {
      console.error('Transcription error:', error);
      
      // Save error to job if jobId provided
      if (jobId) {
        await this.updateJobStatus(jobId, 'failed', error.message);
      }

      throw new Error(`Transcription failed: ${error.message}`);
    } finally {
      // Cleanup extracted audio file if it was created
      if (extractedAudioPath) {
        try {
          await fs.promises.unlink(extractedAudioPath);
          console.log(`Cleaned up extracted audio file: ${path.basename(extractedAudioPath)}`);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup extracted audio file: ${cleanupError.message}`);
        }
      }
    }
  }

  /**
   * Transcribe audio with enhanced processing (compression + segmentation)
   * @param {string} filePath - Path to audio file
   * @param {string} provider - AI provider
   * @returns {Promise<Object>} Enhanced transcription result
   */
  async transcribeWithEnhancedProcessing(filePath, provider = AI_PROVIDERS.OPENAI) {
    console.log('Starting enhanced audio transcription with compression and segmentation');
    
    try {
      // Step 1: Process audio (compress and segment)
      const audioProcessingResult = await AudioProcessingService.processAudioFile(filePath, {
        enableCompression: true,
        enableSegmentation: true,
        segmentDuration: 30,
        overlapDuration: 2
      });

      if (!audioProcessingResult.success) {
        throw new Error('Audio processing failed');
      }

      console.log(`Audio processing completed: ${audioProcessingResult.segments.length} segments created`);

      // Step 2: Transcribe segments
      const segmentTranscriptions = await this.transcribeSegments(audioProcessingResult.segments, provider);

      // Step 3: Merge transcriptions with overlap handling
      const mergedTranscription = await this.mergeSegmentTranscriptions(segmentTranscriptions, audioProcessingResult.segments);

      // Step 4: Cleanup processing files
      await AudioProcessingService.cleanupProcessingFiles(audioProcessingResult.processingId);

      return {
        text: mergedTranscription.text,
        language: mergedTranscription.language,
        duration: mergedTranscription.duration,
        segments: mergedTranscription.segments,
        words: mergedTranscription.words,
        model: mergedTranscription.model,
        task: 'transcribe',
        audioProcessing: {
          compression: audioProcessingResult.compression,
          segmentCount: audioProcessingResult.segments.length,
          processingTime: audioProcessingResult.processingTime
        }
      };

    } catch (error) {
      console.error('Enhanced transcription error:', error);
      throw new Error(`Enhanced transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe multiple audio segments using rate limiter
   * @param {Array} segments - Array of segment objects
   * @param {string} provider - AI provider
   * @returns {Promise<Array>} Array of transcription results
   */
  async transcribeSegments(segments, provider = AI_PROVIDERS.OPENAI) {
    const transcriptions = [];
    
    console.log(`Transcribing ${segments.length} segments sequentially using rate limiter`);

    // Process segments one by one to avoid overwhelming the rate limiter
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      try {
        console.log(`Transcribing segment ${segment.index + 1}/${segments.length}: ${segment.filename}`);
        
        let segmentResult;
        switch (provider) {
          case AI_PROVIDERS.OPENAI:
            // Use rate limiter for OpenAI requests
            segmentResult = await apiRateLimiter.queueRequest('openai', async () => {
              return await this.transcribeWithOpenAIRateLimited(segment.path);
            }, {
              maxRetries: 3,
              priority: 'normal'
            });
            break;
          default:
            throw new Error(`Unsupported AI provider: ${provider}`);
        }

        transcriptions.push({
          segmentIndex: segment.index,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.duration,
          transcription: segmentResult,
          filename: segment.filename
        });

        console.log(`Successfully transcribed segment ${segment.index + 1}/${segments.length}`);

      } catch (error) {
        console.error(`Error transcribing segment ${segment.index}:`, error);
        transcriptions.push({
          segmentIndex: segment.index,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.duration,
          transcription: null,
          error: error.message,
          filename: segment.filename
        });
      }
    }

    console.log(`Segment transcription completed: ${transcriptions.filter(t => t.transcription).length}/${transcriptions.length} successful`);
    return transcriptions;
  }

  /**
   * Merge segment transcriptions with overlap handling
   * @param {Array} segmentTranscriptions - Array of segment transcription results
   * @param {Array} segments - Original segment information
   * @returns {Promise<Object>} Merged transcription result
   */
  async mergeSegmentTranscriptions(segmentTranscriptions, segments) {
    console.log('Merging segment transcriptions with overlap handling');

    // Filter successful transcriptions and sort by segment index
    const validTranscriptions = segmentTranscriptions
      .filter(st => st.transcription && st.transcription.text)
      .sort((a, b) => a.segmentIndex - b.segmentIndex);

    if (validTranscriptions.length === 0) {
      throw new Error('No valid segment transcriptions found');
    }

    let mergedText = '';
    let totalDuration = 0;
    let allSegments = [];
    let allWords = [];
    let language = validTranscriptions[0].transcription.language || 'he';
    let model = validTranscriptions[0].transcription.model;

    for (let i = 0; i < validTranscriptions.length; i++) {
      const current = validTranscriptions[i];
      const transcription = current.transcription;
      
      if (!transcription.text.trim()) {
        continue;
      }

      let segmentText = transcription.text.trim();

      // Handle overlap with previous segment
      if (i > 0 && segments.length > 1) {
        const previous = validTranscriptions[i - 1];
        const overlapDuration = 2; // 2 seconds overlap
        
        // Remove overlapping content by comparing with previous segment
        segmentText = this.removeOverlapFromText(segmentText, previous.transcription.text, overlapDuration);
      }

      // Add segment text
      if (segmentText) {
        if (mergedText && !mergedText.endsWith(' ') && !segmentText.startsWith(' ')) {
          mergedText += ' ';
        }
        mergedText += segmentText;
      }

      // Adjust segment timestamps to global timeline
      if (transcription.segments) {
        const adjustedSegments = transcription.segments.map(seg => ({
          ...seg,
          start: seg.start + current.startTime,
          end: seg.end + current.startTime
        }));
        allSegments.push(...adjustedSegments);
      }

      // Adjust word timestamps to global timeline
      if (transcription.words) {
        const adjustedWords = transcription.words.map(word => ({
          ...word,
          start: word.start + current.startTime,
          end: word.end + current.startTime
        }));
        allWords.push(...adjustedWords);
      }

      totalDuration = Math.max(totalDuration, current.endTime);
    }

    // Clean up merged text
    mergedText = this.cleanupMergedText(mergedText);

    console.log(`Transcription merging completed: ${mergedText.length} characters, ${totalDuration}s duration`);

    return {
      text: mergedText,
      language,
      duration: totalDuration,
      segments: allSegments,
      words: allWords.length > 0 ? allWords : null,
      model
    };
  }

  /**
   * Remove overlapping content from segment text
   * @param {string} currentText - Current segment text
   * @param {string} previousText - Previous segment text
   * @param {number} overlapDuration - Overlap duration in seconds
   * @returns {string} Text with overlap removed
   */
  removeOverlapFromText(currentText, previousText, overlapDuration) {
    if (!previousText || !currentText) {
      return currentText;
    }

    // Simple approach: remove first few words that might be overlapping
    // This is a heuristic approach - in a production system, you might want
    // to use more sophisticated text similarity algorithms
    const currentWords = currentText.split(' ');
    const previousWords = previousText.split(' ');
    
    if (currentWords.length < 3 || previousWords.length < 3) {
      return currentText;
    }

    // Check if first few words of current segment match last few words of previous segment
    const wordsToCheck = Math.min(5, Math.floor(currentWords.length / 3));
    const currentStart = currentWords.slice(0, wordsToCheck).join(' ').toLowerCase();
    const previousEnd = previousWords.slice(-wordsToCheck).join(' ').toLowerCase();

    // If there's significant overlap, remove the overlapping words from current segment
    if (this.calculateTextSimilarity(currentStart, previousEnd) > 0.6) {
      console.log(`Detected overlap, removing ${wordsToCheck} words from segment start`);
      return currentWords.slice(wordsToCheck).join(' ');
    }

    return currentText;
  }

  /**
   * Calculate text similarity between two strings
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Clean up merged transcription text
   * @param {string} text - Text to clean up
   * @returns {string} Cleaned text
   */
  cleanupMergedText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s+([.,!?;:])/g, '$1') // Remove spaces before punctuation
      .replace(/([.!?])\s*([a-zA-Zא-ת])/g, '$1 $2') // Ensure space after sentence endings
      .trim();
  }

  /**
   * Transcribe using OpenAI Whisper with rate limiter (for segments)
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} OpenAI transcription result
   */
  async transcribeWithOpenAIRateLimited(filePath) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const config = MODEL_CONFIGS.transcription.openai;
    
    console.log(`OpenAI transcription (rate limited) for file: ${path.basename(filePath)}`);
    
    // Create file stream
    const audioFile = fs.createReadStream(filePath);
    
    try {
      // Set up timeout promise - shorter timeout for segments
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const timeoutMs = Math.min(300000, 60000 + (fileSizeMB * 15000)); // 1 min base + 15s per MB, max 5 minutes
      
      console.log(`Setting timeout to ${Math.round(timeoutMs/1000)}s for ${fileSizeMB.toFixed(1)}MB segment`);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
      });
      
      // Call OpenAI transcription API with timeout
      const transcriptionPromise = openaiClient.audio.transcriptions.create({
        file: audioFile,
        model: config.model,
        response_format: config.response_format,
        temperature: config.temperature
      });

      const response = await Promise.race([transcriptionPromise, timeoutPromise]);

      console.log(`OpenAI transcription successful (rate limited)`);
      return {
        text: response.text,
        language: response.language,
        duration: response.duration,
        segments: response.segments || [],
        words: response.words || null,
        model: config.model,
        task: response.task || 'transcribe',
        usage: response.usage || {} // Include usage for rate limiter tracking
      };

    } catch (error) {
      console.error(`OpenAI transcription (rate limited) failed:`, error.message);
      throw error;
    } finally {
      // Always close file stream
      if (audioFile) {
        audioFile.destroy();
      }
    }
  }

  /**
   * Transcribe using OpenAI Whisper with retry logic (for single files)
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} OpenAI transcription result
   */
  async transcribeWithOpenAI(filePath) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const config = MODEL_CONFIGS.transcription.openai;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let audioFile = null;
      
      try {
        console.log(`OpenAI transcription attempt ${attempt}/${maxRetries} for file: ${path.basename(filePath)}`);
        
        // Create file stream
        audioFile = fs.createReadStream(filePath);
        
        // Set up timeout promise - longer timeout for larger files
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        const baseTimeout = 120000; // 2 minutes base
        const timeoutMs = Math.min(600000, baseTimeout + (fileSizeMB * 30000)); // Add 30s per MB, max 10 minutes
        
        console.log(`Setting timeout to ${Math.round(timeoutMs/1000)}s for ${fileSizeMB.toFixed(1)}MB file`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
        });
        
        // Call OpenAI transcription API with timeout using Whisper model
        // Language parameter removed to enable automatic language detection
        const transcriptionPromise = openaiClient.audio.transcriptions.create({
          file: audioFile,
          model: config.model, // Uses 'whisper-1'
          response_format: config.response_format,
          temperature: config.temperature
        });

        const response = await Promise.race([transcriptionPromise, timeoutPromise]);

        // Close file stream
        if (audioFile) {
          audioFile.destroy();
        }

        console.log(`OpenAI transcription successful on attempt ${attempt}`);
        return {
          text: response.text,
          language: response.language,
          duration: response.duration,
          segments: response.segments || [],
          words: response.words || null,
          model: config.model,
          task: response.task || 'transcribe'
        };

      } catch (error) {
        // Close file stream if it exists
        if (audioFile) {
          audioFile.destroy();
        }

        console.error(`OpenAI transcription attempt ${attempt} failed:`, error.message);
        
        // Check if this is a retryable error
        const isRetryable = this.isRetryableError(error);
        
        if (attempt === maxRetries || !isRetryable) {
          // Last attempt or non-retryable error
          let errorMessage = error.message;
          
          if (error.message.includes('Request timed out')) {
            errorMessage = 'Request timed out - the audio file may be too long or the service is overloaded';
          } else if (error.status === 429 || error.message.includes('429')) {
            errorMessage = 'Rate limit exceeded - too many requests. Please try again later';
          } else if (error.status === 413 || error.message.includes('413')) {
            errorMessage = 'File too large for transcription service';
          } else if (error.status === 400 || error.message.includes('400')) {
            errorMessage = 'Invalid audio file format or corrupted file';
          } else if (error.status >= 500) {
            errorMessage = 'OpenAI service temporarily unavailable';
          }
          
          throw new Error(`OpenAI transcription failed: ${errorMessage}`);
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  isRetryableError(error) {
    // Rate limiting (429)
    if (error.status === 429 || error.message.includes('429')) {
      return true;
    }
    
    // Server errors (5xx)
    if (error.status >= 500) {
      return true;
    }
    
    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return true;
    }
    
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return true;
    }
    
    // OpenAI specific retryable errors
    if (error.message.includes('overloaded') || error.message.includes('temporarily unavailable')) {
      return true;
    }
    
    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate audio or video file for transcription
   * @param {string} filePath - Path to audio or video file
   */
  async validateAudioFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('Media file not found');
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const isVideoFile = this.supportedVideoFormats.includes(ext);
      const isAudioFile = this.supportedAudioFormats.includes(ext);
      
      if (!isVideoFile && !isAudioFile) {
        const allSupportedFormats = [...this.supportedAudioFormats, ...this.supportedVideoFormats];
        throw new Error(`Unsupported media format: ${ext}. Supported formats: ${allSupportedFormats.join(', ')}`);
      }

      // Check file size based on file type
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const maxSize = isVideoFile ? this.maxVideoFileSize : this.maxFileSize;
      const maxSizeMB = maxSize / (1024 * 1024);
      
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB. Maximum size for ${isVideoFile ? 'video' : 'audio'}: ${maxSizeMB}MB`);
      }
      
      // Warn about large files that might timeout
      const warnSize = isVideoFile ? 100 : 15; // 100MB for video, 15MB for audio
      if (fileSizeMB > warnSize) {
        console.warn(`Large ${isVideoFile ? 'video' : 'audio'} file detected (${fileSizeMB.toFixed(1)}MB). Transcription may take longer and could timeout.`);
      }

      // Additional validation for MP3 files
      if (ext === '.mp3') {
        // Check if file is actually readable
        try {
          const buffer = fs.readFileSync(filePath, { start: 0, end: 10 });
          // Check for MP3 header (ID3 tag or MPEG frame sync)
          const hasId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33; // "ID3"
          const hasMpegSync = (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0); // MPEG frame sync
          
          if (!hasId3 && !hasMpegSync) {
            console.warn(`MP3 file may be corrupted or invalid: ${filePath}`);
            // Don't throw error, let OpenAI handle it
          }
        } catch (readError) {
          console.warn(`Could not validate MP3 file structure: ${readError.message}`);
        }
      }

      console.log(`File validation passed: ${path.basename(filePath)} (${ext}, ${Math.round(stats.size / 1024 / 1024)}MB, ${isVideoFile ? 'video' : 'audio'})`);
      return { isVideoFile, isAudioFile };
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  /**
   * Calculate confidence score from transcription segments
   * @param {Object} transcriptionResult - Transcription result
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidenceScore(transcriptionResult) {
    try {
      if (!transcriptionResult.segments || transcriptionResult.segments.length === 0) {
        return 0.8; // Default confidence for basic transcriptions
      }

      // Calculate average confidence from segments
      const totalConfidence = transcriptionResult.segments.reduce((sum, segment) => {
        return sum + (segment.avg_logprob || 0);
      }, 0);

      const avgLogProb = totalConfidence / transcriptionResult.segments.length;
      
      // Convert log probability to confidence score (0-1)
      // Log probabilities are typically negative, closer to 0 means higher confidence
      const confidence = Math.exp(avgLogProb);
      
      return Math.min(Math.max(confidence, 0), 1);
    } catch (error) {
      console.error('Error calculating confidence score:', error);
      return 0.5; // Default confidence
    }
  }

  /**
   * Save transcription to database
   * @param {Object} transcriptionData - Transcription data
   * @returns {Promise<Object>} Saved transcription
   */
  async saveTranscription(transcriptionData) {
    const {
      recordingId,
      userId,
      jobId,
      transcriptionText,
      confidenceScore,
      languageDetected,
      processingDuration,
      aiProvider,
      modelVersion,
      segments,
      metadata
    } = transcriptionData;

    try {
      const result = await run(`
        INSERT INTO transcriptions (
          recording_id, user_id, job_id, transcription_text, confidence_score,
          language_detected, processing_duration, ai_provider, model_version,
          segments, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        recordingId,
        userId,
        jobId,
        transcriptionText,
        confidenceScore,
        languageDetected,
        processingDuration,
        aiProvider,
        modelVersion,
        JSON.stringify(segments),
        JSON.stringify(metadata)
      ]);

      return {
        id: result.lastID,
        recording_id: recordingId,
        user_id: userId,
        job_id: jobId,
        transcription_text: transcriptionText,
        confidence_score: confidenceScore,
        language_detected: languageDetected,
        processing_duration: processingDuration,
        ai_provider: aiProvider,
        model_version: modelVersion,
        segments,
        metadata,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving transcription:', error);
      throw new Error(`Failed to save transcription: ${error.message}`);
    }
  }

  /**
   * Get transcription by recording ID
   * @param {number} recordingId - Recording ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Transcription or null
   */
  async getTranscriptionByRecordingId(recordingId, userId) {
    try {
      const result = await query(`
        SELECT * FROM transcriptions 
        WHERE recording_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [recordingId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const transcription = result.rows[0];
      return {
        ...transcription,
        segments: JSON.parse(transcription.segments || '[]'),
        metadata: JSON.parse(transcription.metadata || '{}')
      };
    } catch (error) {
      console.error('Error fetching transcription:', error);
      throw new Error(`Failed to fetch transcription: ${error.message}`);
    }
  }

  /**
   * Track AI service usage
   * @param {Object} usageData - Usage data
   */
  async trackUsage(usageData) {
    const {
      userId,
      provider,
      serviceType,
      processingTime,
      audioMinutes,
      metadata
    } = usageData;

    try {
      // Calculate estimated cost
      const cost = calculateEstimatedCost(provider, MODEL_CONFIGS.transcription[provider].model, {
        audio_minutes: audioMinutes
      });

      await run(`
        INSERT INTO ai_service_usage (
          user_id, service_provider, service_type, tokens_used,
          cost_usd, processing_time, request_timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `, [
        userId,
        provider,
        serviceType,
        0, // No token usage for transcription
        cost,
        processingTime,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Update job status
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message if failed
   */
  async updateJobStatus(jobId, status, errorMessage = null) {
    try {
      const updateFields = ['status = ?', 'updated_at = datetime(\'now\')'];
      const params = [status];

      if (status === 'processing') {
        updateFields.push('started_at = datetime(\'now\')');
      } else if (status === 'completed' || status === 'failed') {
        updateFields.push('completed_at = datetime(\'now\')');
      }

      if (errorMessage) {
        updateFields.push('error_message = ?');
        params.push(errorMessage);
      }

      params.push(jobId);

      await run(`
        UPDATE ai_processing_jobs 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, params);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Get file size
   * @param {string} filePath - File path
   * @returns {Promise<number>} File size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get transcription statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getTranscriptionStats(userId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_transcriptions,
          AVG(confidence_score) as avg_confidence,
          AVG(processing_duration) as avg_processing_time,
          SUM(CASE WHEN confidence_score >= 0.8 THEN 1 ELSE 0 END) as high_confidence_count
        FROM transcriptions 
        WHERE user_id = ?
      `, [userId]);

      return result.rows[0] || {
        total_transcriptions: 0,
        avg_confidence: 0,
        avg_processing_time: 0,
        high_confidence_count: 0
      };
    } catch (error) {
      console.error('Error fetching transcription stats:', error);
      throw new Error(`Failed to fetch transcription stats: ${error.message}`);
    }
  }
}

module.exports = new TranscriptionService();
