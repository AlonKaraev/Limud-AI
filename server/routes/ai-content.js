const express = require('express');
const { authenticate } = require('../middleware/auth');
const AIProcessingService = require('../services/AIProcessingService');
const TranscriptionService = require('../services/TranscriptionService');
const SummaryService = require('../services/SummaryService');
const QuestionService = require('../services/QuestionService');
const { validateServiceConfig } = require('../config/ai-services');

const router = express.Router();

/**
 * Start full AI processing for a recording
 */
router.post('/process/:recordingId', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const userId = req.user.id;
    const config = req.body;

    // Validate AI service configuration
    const configValidation = validateServiceConfig();
    if (!configValidation.valid) {
      return res.status(503).json({
        error: 'שירותי AI אינם זמינים כרגע',
        code: 'AI_SERVICE_UNAVAILABLE',
        issues: configValidation.issues
      });
    }

    // Get recording to validate it exists and get file path
    const recording = await AIProcessingService.getRecording(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Start processing
    const result = await AIProcessingService.processRecording({
      recordingId,
      userId,
      filePath: recording.file_path,
      config
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error starting AI processing:', error);
    res.status(500).json({
      error: 'שגיאה בהתחלת עיבוד AI',
      code: 'AI_PROCESSING_ERROR',
      message: error.message
    });
  }
});

/**
 * Process individual AI service
 */
router.post('/process/:recordingId/:serviceType', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const serviceType = req.params.serviceType;
    const userId = req.user.id;
    const config = req.body;

    // Validate service type
    const validServices = ['transcription', 'summary', 'questions'];
    if (!validServices.includes(serviceType)) {
      return res.status(400).json({
        error: 'סוג שירות לא תקין',
        code: 'INVALID_SERVICE_TYPE',
        validServices
      });
    }

    // Validate AI service configuration
    const configValidation = validateServiceConfig();
    if (!configValidation.valid) {
      return res.status(503).json({
        error: 'שירותי AI אינם זמינים כרגע',
        code: 'AI_SERVICE_UNAVAILABLE',
        issues: configValidation.issues
      });
    }

    // Process service
    const result = await AIProcessingService.processService({
      serviceType,
      recordingId,
      userId,
      config
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error(`Error processing ${req.params.serviceType}:`, error);
    res.status(500).json({
      error: `שגיאה בעיבוד ${req.params.serviceType}`,
      code: 'SERVICE_PROCESSING_ERROR',
      message: error.message
    });
  }
});

/**
 * Get job status
 */
router.get('/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const userId = req.user.id;

    const job = await AIProcessingService.getJobStatus(jobId, userId);
    if (!job) {
      return res.status(404).json({
        error: 'משימה לא נמצאה',
        code: 'JOB_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטוס המשימה',
      code: 'JOB_STATUS_ERROR',
      message: error.message
    });
  }
});

/**
 * Get user's processing jobs
 */
router.get('/jobs', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const jobs = await AIProcessingService.getUserJobs(userId, {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      status
    });

    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user jobs:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת המשימות',
      code: 'JOBS_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Cancel processing job
 */
router.delete('/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const userId = req.user.id;

    const success = await AIProcessingService.cancelJob(jobId, userId);

    res.json({
      success,
      message: 'המשימה בוטלה בהצלחה'
    });

  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      error: 'שגיאה בביטול המשימה',
      code: 'JOB_CANCEL_ERROR',
      message: error.message
    });
  }
});

/**
 * Get complete AI content for recording
 */
router.get('/content/:recordingId', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const userId = req.user.id;

    const content = await AIProcessingService.getRecordingAIContent(recordingId, userId);

    res.json({
      success: true,
      content
    });

  } catch (error) {
    console.error('Error fetching AI content:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת תוכן AI',
      code: 'AI_CONTENT_ERROR',
      message: error.message
    });
  }
});

/**
 * Get transcription for recording
 */
router.get('/transcription/:recordingId', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const userId = req.user.id;

    const transcription = await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
    if (!transcription) {
      return res.status(404).json({
        error: 'תמליל לא נמצא',
        code: 'TRANSCRIPTION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      transcription
    });

  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת התמליל',
      code: 'TRANSCRIPTION_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Get summary for recording
 */
router.get('/summary/:recordingId', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const userId = req.user.id;

    const summary = await SummaryService.getSummaryByRecordingId(recordingId, userId);
    if (!summary) {
      return res.status(404).json({
        error: 'סיכום לא נמצא',
        code: 'SUMMARY_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת הסיכום',
      code: 'SUMMARY_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Get questions for recording
 */
router.get('/questions/:recordingId', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const userId = req.user.id;

    const questions = await QuestionService.getQuestionsByRecordingId(recordingId, userId);

    res.json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת השאלות',
      code: 'QUESTIONS_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Get question set for recording
 */
router.get('/question-set/:recordingId', authenticate, async (req, res) => {
  try {
    const recordingId = parseInt(req.params.recordingId);
    const userId = req.user.id;

    const questionSet = await QuestionService.getQuestionSetByRecordingId(recordingId, userId);
    if (!questionSet) {
      return res.status(404).json({
        error: 'סט שאלות לא נמצא',
        code: 'QUESTION_SET_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      questionSet
    });

  } catch (error) {
    console.error('Error fetching question set:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סט השאלות',
      code: 'QUESTION_SET_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Rate AI-generated content
 */
router.post('/rate/:contentType/:contentId', authenticate, async (req, res) => {
  try {
    const contentType = req.params.contentType;
    const contentId = parseInt(req.params.contentId);
    const userId = req.user.id;
    const { rating, feedback, suggestions } = req.body;

    // Validate content type
    const validTypes = ['transcription', 'summary', 'question'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'סוג תוכן לא תקין',
        code: 'INVALID_CONTENT_TYPE'
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'דירוג חייב להיות בין 1 ל-5',
        code: 'INVALID_RATING'
      });
    }

    // Save rating
    const result = await run(`
      INSERT INTO content_quality_ratings (
        content_type, content_id, user_id, rating, feedback_text,
        improvement_suggestions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      contentType,
      contentId,
      userId,
      rating,
      feedback || null,
      suggestions || null
    ]);

    res.json({
      success: true,
      ratingId: result.lastID,
      message: 'הדירוג נשמר בהצלחה'
    });

  } catch (error) {
    console.error('Error saving content rating:', error);
    res.status(500).json({
      error: 'שגיאה בשמירת הדירוג',
      code: 'RATING_SAVE_ERROR',
      message: error.message
    });
  }
});

/**
 * Get processing statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await AIProcessingService.getProcessingStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching processing stats:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת הסטטיסטיקות',
      code: 'STATS_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Get AI service usage
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, provider } = req.query;

    let query_sql = `
      SELECT 
        service_provider,
        service_type,
        COUNT(*) as request_count,
        SUM(tokens_used) as total_tokens,
        SUM(cost_usd) as total_cost,
        AVG(processing_time) as avg_processing_time
      FROM ai_service_usage 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (startDate) {
      query_sql += ` AND request_timestamp >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query_sql += ` AND request_timestamp <= ?`;
      params.push(endDate);
    }

    if (provider) {
      query_sql += ` AND service_provider = ?`;
      params.push(provider);
    }

    query_sql += ` GROUP BY service_provider, service_type ORDER BY request_timestamp DESC`;

    const { query } = require('../config/database-sqlite');
    const result = await query(query_sql, params);

    res.json({
      success: true,
      usage: result.rows
    });

  } catch (error) {
    console.error('Error fetching AI usage:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת נתוני השימוש',
      code: 'USAGE_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Get queue status
 */
router.get('/queue/status', authenticate, async (req, res) => {
  try {
    const queueStatus = AIProcessingService.getQueueStatus();

    res.json({
      success: true,
      queue: queueStatus
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטוס התור',
      code: 'QUEUE_STATUS_ERROR',
      message: error.message
    });
  }
});

/**
 * Health check for AI services
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    const { checkServiceHealth, getAvailableProviders } = require('../config/ai-services');
    
    const providers = getAvailableProviders();
    const healthChecks = await Promise.all(
      providers.map(async (provider) => {
        const health = await checkServiceHealth(provider.name);
        return {
          provider: provider.name,
          ...health
        };
      })
    );

    const configValidation = validateServiceConfig();

    res.json({
      success: true,
      health: {
        providers: healthChecks,
        configuration: configValidation,
        queue: AIProcessingService.getQueueStatus()
      }
    });

  } catch (error) {
    console.error('Error checking AI service health:', error);
    res.status(500).json({
      error: 'שגיאה בבדיקת תקינות השירותים',
      code: 'HEALTH_CHECK_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
