const TranscriptionService = require('./TranscriptionService');
const SummaryService = require('./SummaryService');
const QuestionService = require('./QuestionService');
const { run, query } = require('../config/database-sqlite');
const { AI_PROVIDERS } = require('../config/ai-services');

/**
 * AI Processing Service
 * Orchestrates the complete AI content generation pipeline
 */
class AIProcessingService {
  constructor() {
    this.processingQueue = new Map(); // In-memory queue for processing jobs
    this.maxConcurrentJobs = 3; // Maximum concurrent processing jobs
    this.currentJobs = 0;
  }

  /**
   * Process recording with full AI pipeline
   * @param {Object} options - Processing options
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {string} options.filePath - Path to audio file
   * @param {Object} options.config - Processing configuration
   * @returns {Promise<Object>} Processing result
   */
  async processRecording(options) {
    const {
      recordingId,
      userId,
      filePath,
      config = {}
    } = options;

    try {
      // Create processing job
      const job = await this.createProcessingJob({
        recordingId,
        userId,
        jobType: 'full_processing',
        processingConfig: config
      });

      // Add to queue
      this.addToQueue(job.id, {
        recordingId,
        userId,
        filePath,
        config,
        jobId: job.id
      });

      // Start processing if capacity allows
      this.processQueue();

      return {
        success: true,
        jobId: job.id,
        status: 'queued',
        message: 'עיבוד התחיל. תקבל התראה כשהעיבוד יסתיים.'
      };

    } catch (error) {
      console.error('Error starting AI processing:', error);
      throw new Error(`Failed to start processing: ${error.message}`);
    }
  }

  /**
   * Enhanced processing with custom guidance and language selection
   * @param {Object} options - Enhanced processing options
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {string} options.filePath - Path to audio file
   * @param {Object} options.config - Enhanced processing configuration
   * @returns {Promise<Object>} Processing result
   */
  async processRecordingEnhanced(options) {
    const {
      recordingId,
      userId,
      filePath,
      config = {}
    } = options;

    try {
      console.log('Starting enhanced AI processing:', {
        recordingId,
        userId,
        contentTypes: config.contentTypes,
        language: config.language,
        hasCustomGuidance: !!config.customGuidance
      });

      // Create processing job with enhanced config
      const job = await this.createProcessingJob({
        recordingId,
        userId,
        jobType: 'enhanced_processing',
        processingConfig: config
      });

      // Add to queue with enhanced processing flag
      this.addToQueue(job.id, {
        recordingId,
        userId,
        filePath,
        config,
        jobId: job.id,
        enhanced: true
      });

      // Start processing if capacity allows
      this.processQueue();

      return {
        success: true,
        jobId: job.id,
        status: 'queued',
        message: 'יצירת תוכן AI החלה בהצלחה',
        contentTypes: config.contentTypes,
        language: config.language,
        customGuidance: config.customGuidance
      };

    } catch (error) {
      console.error('Error starting enhanced AI processing:', error);
      throw new Error(`Failed to start enhanced processing: ${error.message}`);
    }
  }

  /**
   * Process individual AI service
   * @param {Object} options - Service processing options
   * @param {string} options.serviceType - Type of service (transcription, summary, questions)
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {Object} options.config - Service configuration
   * @returns {Promise<Object>} Processing result
   */
  async processService(options) {
    const {
      serviceType,
      recordingId,
      userId,
      config = {}
    } = options;

    try {
      // Create processing job
      const job = await this.createProcessingJob({
        recordingId,
        userId,
        jobType: serviceType,
        processingConfig: config
      });

      let result;

      switch (serviceType) {
        case 'transcription':
          result = await this.processTranscription({
            recordingId,
            userId,
            jobId: job.id,
            config
          });
          break;

        case 'summary':
          result = await this.processSummary({
            recordingId,
            userId,
            jobId: job.id,
            config
          });
          break;

        case 'questions':
          result = await this.processQuestions({
            recordingId,
            userId,
            jobId: job.id,
            config
          });
          break;

        default:
          throw new Error(`Unsupported service type: ${serviceType}`);
      }

      // Update job status
      await this.updateJobStatus(job.id, 'completed');

      return {
        success: true,
        jobId: job.id,
        result,
        serviceType
      };

    } catch (error) {
      console.error(`Error processing ${serviceType}:`, error);
      
      if (options.jobId) {
        await this.updateJobStatus(options.jobId, 'failed', error.message);
      }

      throw new Error(`${serviceType} processing failed: ${error.message}`);
    }
  }

  /**
   * Execute full processing pipeline
   * @param {Object} data - Processing data
   * @returns {Promise<Object>} Complete processing result
   */
  async executeFullProcessing(data) {
    const { recordingId, userId, filePath, config, jobId } = data;
    
    try {
      await this.updateJobStatus(jobId, 'processing');

      const results = {
        transcription: null,
        summary: null,
        questions: null,
        processingTime: 0
      };

      const startTime = Date.now();

      // Step 1: Transcription
      console.log(`Starting transcription for recording ${recordingId}`);
      try {
        const transcriptionResult = await TranscriptionService.transcribeAudio({
          filePath,
          recordingId,
          userId,
          jobId,
          provider: config.aiProvider || AI_PROVIDERS.OPENAI
        });
        
        results.transcription = transcriptionResult.transcription;
        console.log(`Transcription completed for recording ${recordingId}`);
      } catch (error) {
        console.error('Transcription failed:', error);
        throw new Error(`Transcription failed: ${error.message}`);
      }

      // Step 2: Summary (if transcription succeeded)
      if (results.transcription && config.generateSummary !== false) {
        console.log(`Starting summary generation for recording ${recordingId}`);
        try {
          const summaryResult = await SummaryService.generateSummary({
            transcriptionId: results.transcription.id,
            recordingId,
            userId,
            jobId,
            summaryType: config.summaryType || 'educational',
            subjectArea: config.subjectArea,
            gradeLevel: config.gradeLevel,
            language: config.language || 'hebrew',
            customGuidance: config.customGuidance || '',
            provider: config.aiProvider || AI_PROVIDERS.OPENAI
          });
          
          results.summary = summaryResult.summary;
          console.log(`Summary generation completed for recording ${recordingId}`);
        } catch (error) {
          console.error('Summary generation failed:', error);
          // Continue processing even if summary fails
          results.summary = { error: error.message };
        }
      }

      // Step 3: Questions (if summary or transcription available)
      if ((results.summary || results.transcription) && config.generateQuestions !== false) {
        console.log(`Starting question generation for recording ${recordingId}`);
        try {
          const questionsResult = await QuestionService.generateQuestions({
            recordingId,
            transcriptionId: results.transcription?.id,
            summaryId: results.summary?.id,
            userId,
            jobId,
            questionType: config.questionType || 'multiple_choice',
            difficultyLevel: config.difficultyLevel || 'medium',
            questionCount: config.questionCount || 10,
            subjectArea: config.subjectArea,
            gradeLevel: config.gradeLevel,
            language: config.language || 'hebrew',
            customGuidance: config.customGuidance || '',
            provider: config.aiProvider || AI_PROVIDERS.OPENAI
          });
          
          results.questions = questionsResult.questions;
          results.questionSet = questionsResult.questionSet;
          console.log(`Question generation completed for recording ${recordingId}`);
        } catch (error) {
          console.error('Question generation failed:', error);
          // Continue processing even if questions fail
          results.questions = { error: error.message };
        }
      }

      results.processingTime = Date.now() - startTime;

      // Update job status
      await this.updateJobStatus(jobId, 'completed');

      console.log(`Full processing completed for recording ${recordingId} in ${results.processingTime}ms`);

      return results;

    } catch (error) {
      console.error('Full processing failed:', error);
      await this.updateJobStatus(jobId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Process transcription only
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async processTranscription(options) {
    const { recordingId, userId, jobId, config } = options;

    // Get recording file path
    const recording = await this.getRecording(recordingId, userId);
    if (!recording) {
      throw new Error('Recording not found');
    }

    return await TranscriptionService.transcribeAudio({
      filePath: recording.file_path,
      recordingId,
      userId,
      jobId,
      provider: config.aiProvider || AI_PROVIDERS.OPENAI
    });
  }

  /**
   * Process summary only
   * @param {Object} options - Summary options
   * @returns {Promise<Object>} Summary result
   */
  async processSummary(options) {
    const { recordingId, userId, jobId, config } = options;

    // Get transcription
    const transcription = await this.getTranscriptionByRecordingId(recordingId, userId);
    if (!transcription) {
      throw new Error('No transcription found. Please transcribe the recording first.');
    }

    return await SummaryService.generateSummary({
      transcriptionId: transcription.id,
      recordingId,
      userId,
      jobId,
      summaryType: config.summaryType || 'educational',
      subjectArea: config.subjectArea,
      gradeLevel: config.gradeLevel,
      language: config.language || 'hebrew',
      customGuidance: config.customGuidance || '',
      provider: config.aiProvider || AI_PROVIDERS.OPENAI
    });
  }

  /**
   * Process questions only
   * @param {Object} options - Questions options
   * @returns {Promise<Object>} Questions result
   */
  async processQuestions(options) {
    const { recordingId, userId, jobId, config } = options;

    // Get transcription and summary
    const transcription = await this.getTranscriptionByRecordingId(recordingId, userId);
    const summary = await this.getSummaryByRecordingId(recordingId, userId);

    if (!transcription && !summary) {
      throw new Error('No transcription or summary found. Please process the recording first.');
    }

    return await QuestionService.generateQuestions({
      recordingId,
      transcriptionId: transcription?.id,
      summaryId: summary?.id,
      userId,
      jobId,
      questionType: config.questionType || 'multiple_choice',
      difficultyLevel: config.difficultyLevel || 'medium',
      questionCount: config.questionCount || 10,
      subjectArea: config.subjectArea,
      gradeLevel: config.gradeLevel,
      provider: config.aiProvider || AI_PROVIDERS.OPENAI
    });
  }

  /**
   * Add job to processing queue
   * @param {number} jobId - Job ID
   * @param {Object} data - Job data
   */
  addToQueue(jobId, data) {
    this.processingQueue.set(jobId, {
      ...data,
      addedAt: Date.now(),
      status: 'queued'
    });
  }

  /**
   * Process queue
   */
  async processQueue() {
    if (this.currentJobs >= this.maxConcurrentJobs) {
      return; // Already at capacity
    }

    // Get next job from queue
    const nextJob = this.getNextQueuedJob();
    if (!nextJob) {
      return; // No jobs in queue
    }

    this.currentJobs++;
    const [jobId, jobData] = nextJob;

    try {
      // Update job status
      jobData.status = 'processing';
      this.processingQueue.set(jobId, jobData);

      // Execute processing
      await this.executeFullProcessing(jobData);

      // Remove from queue
      this.processingQueue.delete(jobId);

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      // Update job data with error
      jobData.status = 'failed';
      jobData.error = error.message;
      this.processingQueue.set(jobId, jobData);

      // Remove from queue after a delay
      setTimeout(() => {
        this.processingQueue.delete(jobId);
      }, 60000); // Keep failed jobs for 1 minute

    } finally {
      this.currentJobs--;
      
      // Process next job if any
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  /**
   * Get next queued job
   * @returns {Array|null} Next job entry or null
   */
  getNextQueuedJob() {
    for (const [jobId, jobData] of this.processingQueue.entries()) {
      if (jobData.status === 'queued') {
        return [jobId, jobData];
      }
    }
    return null;
  }

  /**
   * Create processing job in database
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job
   */
  async createProcessingJob(jobData) {
    const {
      recordingId,
      userId,
      jobType,
      processingConfig,
      aiProvider = AI_PROVIDERS.OPENAI
    } = jobData;

    try {
      const result = await run(`
        INSERT INTO ai_processing_jobs (
          recording_id, user_id, job_type, status, ai_provider,
          processing_config, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        recordingId,
        userId,
        jobType,
        'pending',
        aiProvider,
        JSON.stringify(processingConfig)
      ]);

      return {
        id: result.lastID,
        recording_id: recordingId,
        user_id: userId,
        job_type: jobType,
        status: 'pending',
        ai_provider: aiProvider,
        processing_config: processingConfig,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating processing job:', error);
      throw new Error(`Failed to create processing job: ${error.message}`);
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
   * Get processing job status
   * @param {number} jobId - Job ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Job status
   */
  async getJobStatus(jobId, userId) {
    try {
      const result = await query(`
        SELECT * FROM ai_processing_jobs 
        WHERE id = ? AND user_id = ?
      `, [jobId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const job = result.rows[0];
      return {
        ...job,
        processing_config: JSON.parse(job.processing_config || '{}')
      };
    } catch (error) {
      console.error('Error fetching job status:', error);
      throw new Error(`Failed to fetch job status: ${error.message}`);
    }
  }

  /**
   * Get user's processing jobs
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Processing jobs
   */
  async getUserJobs(userId, options = {}) {
    const { limit = 20, offset = 0, status } = options;

    try {
      let query_sql = `
        SELECT apj.*, r.filename as recording_filename
        FROM ai_processing_jobs apj
        LEFT JOIN recordings r ON apj.recording_id = r.id
        WHERE apj.user_id = ?
      `;
      const params = [userId];

      if (status) {
        query_sql += ` AND apj.status = ?`;
        params.push(status);
      }

      query_sql += ` ORDER BY apj.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await query(query_sql, params);

      return result.rows.map(job => ({
        ...job,
        processing_config: JSON.parse(job.processing_config || '{}')
      }));
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      throw new Error(`Failed to fetch user jobs: ${error.message}`);
    }
  }

  /**
   * Get complete AI content for recording
   * @param {number} recordingId - Recording ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Complete AI content
   */
  async getRecordingAIContent(recordingId, userId) {
    try {
      const [transcription, summary, questions, questionSet] = await Promise.all([
        this.getTranscriptionByRecordingId(recordingId, userId),
        this.getSummaryByRecordingId(recordingId, userId),
        this.getQuestionsByRecordingId(recordingId, userId),
        this.getQuestionSetByRecordingId(recordingId, userId)
      ]);

      return {
        transcription,
        summary,
        questions,
        questionSet,
        hasContent: !!(transcription || summary || questions?.length > 0)
      };
    } catch (error) {
      console.error('Error fetching AI content:', error);
      throw new Error(`Failed to fetch AI content: ${error.message}`);
    }
  }

  /**
   * Helper methods to get data from individual services
   */
  async getRecording(recordingId, userId) {
    try {
      const result = await query(`
        SELECT * FROM recordings 
        WHERE id = ? AND user_id = ?
      `, [recordingId, userId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching recording:', error);
      return null;
    }
  }

  async getTranscriptionByRecordingId(recordingId, userId) {
    return await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
  }

  async getSummaryByRecordingId(recordingId, userId) {
    return await SummaryService.getSummaryByRecordingId(recordingId, userId);
  }

  async getQuestionsByRecordingId(recordingId, userId) {
    return await QuestionService.getQuestionsByRecordingId(recordingId, userId);
  }

  async getQuestionSetByRecordingId(recordingId, userId) {
    return await QuestionService.getQuestionSetByRecordingId(recordingId, userId);
  }

  /**
   * Get processing statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Processing statistics
   */
  async getProcessingStats(userId) {
    try {
      const [jobStats, transcriptionStats, summaryStats, questionStats] = await Promise.all([
        this.getJobStats(userId),
        TranscriptionService.getTranscriptionStats(userId),
        SummaryService.getSummaryStats(userId),
        QuestionService.getQuestionStats(userId)
      ]);

      return {
        jobs: jobStats,
        transcriptions: transcriptionStats,
        summaries: summaryStats,
        questions: questionStats
      };
    } catch (error) {
      console.error('Error fetching processing stats:', error);
      throw new Error(`Failed to fetch processing stats: ${error.message}`);
    }
  }

  async getJobStats(userId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_jobs,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_jobs
        FROM ai_processing_jobs 
        WHERE user_id = ?
      `, [userId]);

      return result.rows[0] || {
        total_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
        processing_jobs: 0,
        pending_jobs: 0
      };
    } catch (error) {
      console.error('Error fetching job stats:', error);
      throw new Error(`Failed to fetch job stats: ${error.message}`);
    }
  }

  /**
   * Cancel processing job
   * @param {number} jobId - Job ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelJob(jobId, userId) {
    try {
      // Check if job exists and belongs to user
      const job = await this.getJobStatus(jobId, userId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        throw new Error('Cannot cancel job in current status');
      }

      // Remove from queue if present
      if (this.processingQueue.has(jobId)) {
        this.processingQueue.delete(jobId);
      }

      // Update job status
      await this.updateJobStatus(jobId, 'cancelled');

      return true;
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    const queuedJobs = Array.from(this.processingQueue.values())
      .filter(job => job.status === 'queued').length;
    
    const processingJobs = Array.from(this.processingQueue.values())
      .filter(job => job.status === 'processing').length;

    return {
      queued: queuedJobs,
      processing: processingJobs,
      capacity: this.maxConcurrentJobs,
      available: this.maxConcurrentJobs - this.currentJobs
    };
  }
}

module.exports = new AIProcessingService();
