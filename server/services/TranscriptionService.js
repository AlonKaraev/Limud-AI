const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { openaiClient, AI_PROVIDERS, MODEL_CONFIGS, calculateEstimatedCost } = require('../config/ai-services');
const { run, query } = require('../config/database-sqlite');

/**
 * Hebrew Transcription Service
 * Handles audio-to-text conversion with Hebrew language support
 */
class TranscriptionService {
  constructor() {
    this.supportedFormats = ['.webm', '.mp3', '.wav', '.m4a', '.ogg'];
    this.maxFileSize = 25 * 1024 * 1024; // 25MB OpenAI limit
  }

  /**
   * Transcribe audio file to Hebrew text
   * @param {Object} options - Transcription options
   * @param {string} options.filePath - Path to audio file
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {number} options.jobId - Processing job ID
   * @param {string} options.provider - AI provider (default: openai)
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(options) {
    const {
      filePath,
      recordingId,
      userId,
      jobId,
      provider = AI_PROVIDERS.OPENAI
    } = options;

    const startTime = Date.now();

    try {
      // Validate file
      await this.validateAudioFile(filePath);

      // Perform transcription based on provider
      let transcriptionResult;
      switch (provider) {
        case AI_PROVIDERS.OPENAI:
          transcriptionResult = await this.transcribeWithOpenAI(filePath);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
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
          task: transcriptionResult.task || 'transcribe'
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
          language: transcriptionResult.language
        }
      });

      return {
        success: true,
        transcription,
        processingTime: processingDuration,
        confidenceScore,
        provider
      };

    } catch (error) {
      console.error('Transcription error:', error);
      
      // Save error to job if jobId provided
      if (jobId) {
        await this.updateJobStatus(jobId, 'failed', error.message);
      }

      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe using OpenAI Whisper
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} OpenAI transcription result
   */
  async transcribeWithOpenAI(filePath) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const config = MODEL_CONFIGS.transcription.openai;
    
    try {
      // Create file stream
      const audioFile = fs.createReadStream(filePath);
      
      // Call OpenAI Whisper API
      const response = await openaiClient.audio.transcriptions.create({
        file: audioFile,
        model: config.model,
        language: config.language,
        response_format: config.response_format,
        temperature: config.temperature
      });

      // Close file stream
      audioFile.destroy();

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
      console.error('OpenAI transcription error:', error);
      throw new Error(`OpenAI transcription failed: ${error.message}`);
    }
  }

  /**
   * Validate audio file
   * @param {string} filePath - Path to audio file
   */
  async validateAudioFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('Audio file not found');
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
      }

      return true;
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
