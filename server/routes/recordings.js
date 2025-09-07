const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const AudioProcessingService = require('../services/AudioProcessingService');
const VideoProcessingService = require('../services/VideoProcessingService');
const TranscriptionService = require('../services/TranscriptionService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/recordings');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname);
    
    // If no extension, determine from mimetype
    if (!ext) {
      if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
        ext = '.mp3';
      } else if (file.mimetype === 'audio/webm') {
        ext = '.webm';
      } else if (file.mimetype === 'audio/wav') {
        ext = '.wav';
      } else if (file.mimetype === 'audio/ogg') {
        ext = '.ogg';
      } else if (file.mimetype === 'audio/m4a' || file.mimetype === 'audio/mp4') {
        ext = '.m4a';
      } else {
        ext = '.webm'; // fallback
      }
    }
    
    cb(null, `recording-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit for video support
  },
  fileFilter: (req, file, cb) => {
    // Accept audio and video files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי אודיו ווידאו מותרים'), false);
    }
  }
});

// Initialize video processing service
const videoProcessingService = new VideoProcessingService();

// Store for chunked uploads
const chunkUploads = new Map();

/**
 * Initialize chunked upload
 */
router.post('/upload/init', authenticate, async (req, res) => {
  try {
    const { recordingId, filename, fileSize, totalChunks, metadata } = req.body;
    const userId = req.user.id;

    if (!recordingId || !filename || !fileSize || !totalChunks) {
      return res.status(400).json({
        error: 'חסרים פרמטרים נדרשים',
        code: 'MISSING_PARAMETERS'
      });
    }

    const uploadId = `${userId}_${recordingId}_${Date.now()}`;
    const uploadDir = path.join(__dirname, '../uploads/temp', uploadId);
    
    // Create upload directory
    await fs.mkdir(uploadDir, { recursive: true });

    // Store upload session info
    chunkUploads.set(uploadId, {
      userId,
      recordingId,
      filename,
      fileSize,
      totalChunks,
      metadata,
      uploadDir,
      receivedChunks: new Set(),
      createdAt: new Date()
    });

    res.json({
      success: true,
      uploadId
    });
  } catch (error) {
    console.error('Error initializing upload:', error);
    res.status(500).json({
      error: 'שגיאה באתחול העלאה',
      code: 'UPLOAD_INIT_ERROR'
    });
  }
});

/**
 * Upload chunk
 */
router.post('/upload/chunk', authenticate, upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    const userId = req.user.id;

    if (!uploadId || chunkIndex === undefined || !req.file) {
      return res.status(400).json({
        error: 'חסרים פרמטרים נדרשים',
        code: 'MISSING_PARAMETERS'
      });
    }

    const uploadSession = chunkUploads.get(uploadId);
    if (!uploadSession || uploadSession.userId !== userId) {
      return res.status(404).json({
        error: 'סשן העלאה לא נמצא',
        code: 'UPLOAD_SESSION_NOT_FOUND'
      });
    }

    // Move chunk to upload directory
    const chunkPath = path.join(uploadSession.uploadDir, `chunk_${chunkIndex}`);
    await fs.rename(req.file.path, chunkPath);

    // Mark chunk as received
    uploadSession.receivedChunks.add(parseInt(chunkIndex));

    res.json({
      success: true,
      receivedChunks: uploadSession.receivedChunks.size,
      totalChunks: uploadSession.totalChunks
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    res.status(500).json({
      error: 'שגיאה בהעלאת חלק מהקובץ',
      code: 'CHUNK_UPLOAD_ERROR'
    });
  }
});

/**
 * Finalize chunked upload
 */
router.post('/upload/finalize', authenticate, async (req, res) => {
  try {
    const { uploadId } = req.body;
    const userId = req.user.id;

    const uploadSession = chunkUploads.get(uploadId);
    if (!uploadSession || uploadSession.userId !== userId) {
      return res.status(404).json({
        error: 'סשן העלאה לא נמצא',
        code: 'UPLOAD_SESSION_NOT_FOUND'
      });
    }

    // Check if all chunks received
    if (uploadSession.receivedChunks.size !== uploadSession.totalChunks) {
      return res.status(400).json({
        error: 'לא כל חלקי הקובץ התקבלו',
        code: 'INCOMPLETE_UPLOAD'
      });
    }

    // Combine chunks
    const finalDir = path.join(__dirname, '../uploads/recordings');
    await fs.mkdir(finalDir, { recursive: true });
    
    const finalPath = path.join(finalDir, uploadSession.filename);
    const writeStream = require('fs').createWriteStream(finalPath);

    // Combine chunks in order
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      const chunkPath = path.join(uploadSession.uploadDir, `chunk_${i}`);
      const chunkData = await fs.readFile(chunkPath);
      writeStream.write(chunkData);
    }
    writeStream.end();

    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Determine media type from filename
    const isVideo = uploadSession.filename.match(/\.(mp4|avi|mov|wmv|mkv|webm|flv|3gp)$/i);
    const mediaType = isVideo ? 'video' : 'audio';

    // Save recording metadata to database
    const recording = await saveRecordingToDatabase({
      userId,
      recordingId: uploadSession.recordingId,
      filename: uploadSession.filename,
      filePath: finalPath,
      fileSize: uploadSession.fileSize,
      metadata: uploadSession.metadata,
      mediaType: mediaType
    });

    // Start automatic transcription for audio/video files
    startAutomaticTranscription(recording.id, finalPath, userId);

    // Start async video processing if it's a video file
    if (isVideo) {
      processVideoAsync(recording.id, finalPath, uploadSession.filename);
    }

    // Cleanup temp directory
    await fs.rmdir(uploadSession.uploadDir, { recursive: true });
    chunkUploads.delete(uploadId);

    res.json({
      success: true,
      recording: {
        id: recording.id,
        filename: recording.filename,
        size: recording.file_size,
        mediaType: mediaType,
        transcriptionStatus: 'pending',
        processingStatus: isVideo ? 'processing' : 'completed',
        createdAt: recording.created_at
      }
    });
  } catch (error) {
    console.error('Error finalizing upload:', error);
    res.status(500).json({
      error: 'שגיאה בסיום העלאה',
      code: 'UPLOAD_FINALIZE_ERROR'
    });
  }
});

/**
 * Simple upload (non-chunked) - supports both audio and video
 */
router.post('/upload', authenticate, upload.single('media'), async (req, res) => {
  try {
    const { recordingId, metadata } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'לא נמצא קובץ מדיה',
        code: 'NO_FILE'
      });
    }

    // Parse metadata if it's a string
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        console.warn('Error parsing metadata:', error);
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (req.body.tags) {
      try {
        parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (error) {
        console.warn('Error parsing tags:', error);
      }
    }

    // Determine media type
    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'audio';

    // Validate video file if it's a video
    if (isVideo) {
      try {
        videoProcessingService.validateVideoFile(req.file.path, req.file.size, req.file.originalname);
      } catch (validationError) {
        // Delete uploaded file if validation fails
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Error deleting invalid file:', unlinkError);
        }
        
        return res.status(400).json({
          error: validationError.message,
          code: 'INVALID_VIDEO_FILE'
        });
      }
    }

    // Save recording to database
    const recording = await saveRecordingToDatabase({
      userId,
      recordingId: recordingId || `rec_${Date.now()}`,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      metadata: parsedMetadata,
      mediaType: mediaType,
      tags: parsedTags
    });

    // Start automatic transcription for audio/video files
    startAutomaticTranscription(recording.id, req.file.path, userId);

    // Start async video processing if it's a video file
    if (isVideo) {
      // Don't await - process in background
      processVideoAsync(recording.id, req.file.path, req.file.originalname);
    }

    res.json({
      success: true,
      recording: {
        id: recording.id,
        filename: recording.filename,
        size: recording.file_size,
        mediaType: mediaType,
        transcriptionStatus: 'pending',
        processingStatus: isVideo ? 'processing' : 'completed',
        createdAt: recording.created_at
      }
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({
      error: 'שגיאה בהעלאת הקובץ',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * Start automatic transcription for uploaded media
 */
async function startAutomaticTranscription(recordingId, filePath, userId) {
  try {
    console.log(`Starting automatic transcription for recording ${recordingId}`);
    
    // Create AI processing job for transcription
    const { run } = require('../config/database-sqlite');
    const jobResult = await run(`
      INSERT INTO ai_processing_jobs (
        recording_id, user_id, job_type, status, ai_provider, 
        processing_config, created_at, updated_at
      ) VALUES (?, ?, 'transcription', 'pending', 'openai', '{}', datetime('now'), datetime('now'))
    `, [recordingId, userId]);

    const jobId = jobResult.lastID;
    console.log(`Created transcription job ${jobId} for recording ${recordingId}`);

    // Start transcription in background (don't await)
    processTranscriptionAsync(recordingId, filePath, userId, jobId);
    
  } catch (error) {
    console.error(`Failed to start automatic transcription for recording ${recordingId}:`, error);
  }
}

/**
 * Async transcription processing function
 */
async function processTranscriptionAsync(recordingId, filePath, userId, jobId) {
  try {
    console.log(`Processing transcription for recording ${recordingId}, job ${jobId}`);
    
    // Update job status to processing
    await TranscriptionService.updateJobStatus(jobId, 'processing');
    
    // Perform transcription
    const transcriptionResult = await TranscriptionService.transcribeAudio({
      filePath,
      recordingId,
      userId,
      jobId,
      provider: 'openai',
      useEnhancedProcessing: true
    });

    if (transcriptionResult.success) {
      // Update job status to completed
      await TranscriptionService.updateJobStatus(jobId, 'completed');
      console.log(`Transcription completed successfully for recording ${recordingId}`);
    } else {
      throw new Error('Transcription failed without specific error');
    }

  } catch (error) {
    console.error(`Transcription processing failed for recording ${recordingId}:`, error);
    
    // Update job status to failed
    await TranscriptionService.updateJobStatus(jobId, 'failed', error.message);
  }
}

/**
 * Async video processing function
 */
async function processVideoAsync(recordingId, filePath, originalFilename) {
  try {
    console.log(`Starting background video processing for recording ${recordingId}`);
    await videoProcessingService.processVideoFile(recordingId, filePath, originalFilename);
    console.log(`Background video processing completed for recording ${recordingId}`);
  } catch (error) {
    console.error(`Background video processing failed for recording ${recordingId}:`, error);
  }
}

/**
 * Get user's recordings
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const recordings = await getUserRecordings({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      recordings: recordings.data || [],
      pagination: {
        page: recordings.page || 1,
        limit: recordings.limit || 20,
        total: recordings.total || 0,
        pages: recordings.pages || 0
      }
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    // Return empty result instead of error when no recordings exist
    res.json({
      success: true,
      recordings: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    });
  }
});

/**
 * Get storage statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getUserStorageStats(userId);

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטיסטיקות',
      code: 'STATS_ERROR'
    });
  }
});

/**
 * Get recording by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      recording
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת ההקלטה',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * Stream recording for inline playback (audio or video)
 */
router.get('/:id/stream', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Check if file exists
    try {
      await fs.access(recording.file_path);
    } catch (error) {
      return res.status(404).json({
        error: 'קובץ המדיה לא נמצא',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Determine content type based on file extension and media type
    const fileExt = path.extname(recording.filename).toLowerCase();
    let contentType = 'application/octet-stream'; // default
    
    if (recording.media_type === 'video') {
      switch (fileExt) {
        case '.mp4':
          contentType = 'video/mp4';
          break;
        case '.avi':
          contentType = 'video/x-msvideo';
          break;
        case '.mov':
          contentType = 'video/quicktime';
          break;
        case '.wmv':
          contentType = 'video/x-ms-wmv';
          break;
        case '.mkv':
          contentType = 'video/x-matroska';
          break;
        case '.webm':
          contentType = 'video/webm';
          break;
        case '.flv':
          contentType = 'video/x-flv';
          break;
        case '.3gp':
          contentType = 'video/3gpp';
          break;
        default:
          contentType = 'video/mp4';
      }
    } else {
      // Audio files
      switch (fileExt) {
        case '.mp3':
          contentType = 'audio/mpeg';
          break;
        case '.wav':
          contentType = 'audio/wav';
          break;
        case '.ogg':
          contentType = 'audio/ogg';
          break;
        case '.m4a':
          contentType = 'audio/mp4';
          break;
        case '.webm':
          contentType = 'audio/webm';
          break;
        default:
          contentType = 'audio/webm';
      }
    }

    // Set appropriate headers for inline playback (no Content-Disposition: attachment)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', recording.file_size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Support range requests for better media streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : recording.file_size - 1;
      const chunksize = (end - start) + 1;

      res.status(206); // Partial Content
      res.setHeader('Content-Range', `bytes ${start}-${end}/${recording.file_size}`);
      res.setHeader('Content-Length', chunksize);

      const fileStream = require('fs').createReadStream(recording.file_path, { start, end });
      fileStream.pipe(res);
    } else {
      // Stream the entire file
      const fileStream = require('fs').createReadStream(recording.file_path);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Error streaming media:', error);
    res.status(500).json({
      error: 'שגיאה בהזרמת הקובץ',
      code: 'STREAM_ERROR'
    });
  }
});

/**
 * Download recording (audio or video)
 */
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Check if file exists
    try {
      await fs.access(recording.file_path);
    } catch (error) {
      return res.status(404).json({
        error: 'קובץ המדיה לא נמצא',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Determine content type based on file extension and media type
    const fileExt = path.extname(recording.filename).toLowerCase();
    let contentType = 'application/octet-stream'; // default
    
    if (recording.media_type === 'video') {
      switch (fileExt) {
        case '.mp4':
          contentType = 'video/mp4';
          break;
        case '.avi':
          contentType = 'video/x-msvideo';
          break;
        case '.mov':
          contentType = 'video/quicktime';
          break;
        case '.wmv':
          contentType = 'video/x-ms-wmv';
          break;
        case '.mkv':
          contentType = 'video/x-matroska';
          break;
        case '.webm':
          contentType = 'video/webm';
          break;
        case '.flv':
          contentType = 'video/x-flv';
          break;
        case '.3gp':
          contentType = 'video/3gpp';
          break;
        default:
          contentType = 'video/mp4';
      }
    } else {
      // Audio files
      switch (fileExt) {
        case '.mp3':
          contentType = 'audio/mpeg';
          break;
        case '.wav':
          contentType = 'audio/wav';
          break;
        case '.ogg':
          contentType = 'audio/ogg';
          break;
        case '.m4a':
          contentType = 'audio/mp4';
          break;
        case '.webm':
          contentType = 'audio/webm';
          break;
        default:
          contentType = 'audio/webm';
      }
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);
    res.setHeader('Content-Length', recording.file_size);

    // Stream the file
    const fileStream = require('fs').createReadStream(recording.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading media:', error);
    res.status(500).json({
      error: 'שגיאה בהורדת הקובץ',
      code: 'DOWNLOAD_ERROR'
    });
  }
});

/**
 * Get video thumbnails for a recording
 */
router.get('/:id/thumbnails', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    if (recording.media_type !== 'video') {
      return res.status(400).json({
        error: 'הקלטה זו אינה וידאו',
        code: 'NOT_VIDEO'
      });
    }

    const thumbnails = await videoProcessingService.getVideoThumbnails(recordingId);

    res.json({
      success: true,
      thumbnails
    });
  } catch (error) {
    console.error('Error fetching video thumbnails:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת תמונות ממוזערות',
      code: 'THUMBNAILS_ERROR'
    });
  }
});

/**
 * Get video processing status
 */
router.get('/:id/processing-status', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    const status = await videoProcessingService.getProcessingStatus(recordingId);

    res.json({
      success: true,
      status: status || {
        status: recording.processing_status || 'completed',
        metadata: recording.video_metadata || null,
        thumbnailPath: recording.thumbnail_path || null
      }
    });
  } catch (error) {
    console.error('Error fetching processing status:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטוס עיבוד',
      code: 'STATUS_ERROR'
    });
  }
});

/**
 * Serve video thumbnail
 */
router.get('/:id/thumbnail/:size?', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const size = req.params.size || 'medium';
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    if (recording.media_type !== 'video') {
      return res.status(400).json({
        error: 'הקלטה זו אינה וידאו',
        code: 'NOT_VIDEO'
      });
    }

    // Get thumbnail path
    let thumbnailPath;
    if (recording.thumbnail_path && size === 'medium') {
      // Use primary thumbnail
      thumbnailPath = path.join(__dirname, '../uploads', recording.thumbnail_path);
    } else {
      // Find specific size thumbnail
      const thumbnails = await videoProcessingService.getVideoThumbnails(recordingId);
      const thumbnail = thumbnails.find(t => 
        t.thumbnail_size === size && t.timestamp_percent === 25
      ) || thumbnails.find(t => t.thumbnail_size === size) || thumbnails[0];

      if (!thumbnail) {
        return res.status(404).json({
          error: 'תמונה ממוזערת לא נמצאה',
          code: 'THUMBNAIL_NOT_FOUND'
        });
      }

      thumbnailPath = path.join(__dirname, '../uploads', thumbnail.thumbnail_path);
    }

    // Check if thumbnail exists
    try {
      await fs.access(thumbnailPath);
    } catch (error) {
      return res.status(404).json({
        error: 'קובץ תמונה ממוזערת לא נמצא',
        code: 'THUMBNAIL_FILE_NOT_FOUND'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Stream the thumbnail
    const thumbnailStream = require('fs').createReadStream(thumbnailPath);
    thumbnailStream.pipe(res);
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).json({
      error: 'שגיאה בהגשת תמונה ממוזערת',
      code: 'THUMBNAIL_SERVE_ERROR'
    });
  }
});

/**
 * Get transcription status for multiple recordings (bulk)
 */
router.post('/bulk-transcription-status', authenticate, async (req, res) => {
  try {
    const { recordingIds } = req.body;
    const userId = req.user.id;

    if (!recordingIds || !Array.isArray(recordingIds) || recordingIds.length === 0) {
      return res.status(400).json({
        error: 'נדרש מערך של מזהי הקלטות',
        code: 'MISSING_RECORDING_IDS'
      });
    }

    // Limit to reasonable number of recordings to prevent abuse
    if (recordingIds.length > 100) {
      return res.status(400).json({
        error: 'ניתן לבדוק עד 100 הקלטות בבת אחת',
        code: 'TOO_MANY_RECORDINGS'
      });
    }

    const { query } = require('../config/database-sqlite');
    
    // Get all recordings that belong to the user
    const placeholders = recordingIds.map(() => '?').join(',');
    const recordingsResult = await query(`
      SELECT id, recording_id FROM recordings 
      WHERE (id IN (${placeholders}) OR recording_id IN (${placeholders})) AND user_id = ?
    `, [...recordingIds, ...recordingIds, userId]);

    const validRecordingIds = recordingsResult.rows.map(r => r.id);
    
    if (validRecordingIds.length === 0) {
      return res.json({
        success: true,
        statuses: {}
      });
    }

    // Get transcription jobs for all valid recordings
    const jobPlaceholders = validRecordingIds.map(() => '?').join(',');
    const jobsResult = await query(`
      SELECT 
        recording_id,
        status,
        ai_provider,
        started_at,
        completed_at,
        error_message,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY recording_id ORDER BY created_at DESC) as rn
      FROM ai_processing_jobs 
      WHERE recording_id IN (${jobPlaceholders}) AND user_id = ? AND job_type = 'transcription'
    `, [...validRecordingIds, userId]);

    // Filter to get only the latest job for each recording
    const latestJobs = jobsResult.rows.filter(job => job.rn === 1);

    // Get completed transcriptions
    const completedRecordingIds = latestJobs
      .filter(job => job.status === 'completed')
      .map(job => job.recording_id);

    let transcriptions = [];
    if (completedRecordingIds.length > 0) {
      const transcriptionPlaceholders = completedRecordingIds.map(() => '?').join(',');
      const transcriptionsResult = await query(`
        SELECT 
          recording_id,
          transcription_text,
          language_detected,
          confidence_score,
          processing_duration,
          created_at
        FROM transcriptions 
        WHERE recording_id IN (${transcriptionPlaceholders}) AND user_id = ?
      `, [...completedRecordingIds, userId]);
      
      transcriptions = transcriptionsResult.rows;
    }

    // Build response object
    const statuses = {};
    
    // Map original recording IDs to internal IDs
    const recordingIdMap = {};
    recordingsResult.rows.forEach(r => {
      recordingIdMap[r.id] = r.recording_id || r.id;
    });

    recordingIds.forEach(originalId => {
      // Find the internal ID for this recording
      const recordingRow = recordingsResult.rows.find(r => 
        r.id.toString() === originalId.toString() || r.recording_id === originalId
      );
      
      if (!recordingRow) {
        statuses[originalId] = {
          transcriptionStatus: 'not_found',
          job: null,
          transcription: null
        };
        return;
      }

      const internalId = recordingRow.id;
      const job = latestJobs.find(j => j.recording_id === internalId);
      const transcription = transcriptions.find(t => t.recording_id === internalId);

      let transcriptionStatus = 'not_started';
      let jobDetails = null;

      if (job) {
        transcriptionStatus = job.status;
        jobDetails = {
          status: job.status,
          aiProvider: job.ai_provider,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          errorMessage: job.error_message,
          createdAt: job.created_at
        };
      }

      statuses[originalId] = {
        transcriptionStatus,
        job: jobDetails,
        transcription: transcription ? {
          text: transcription.transcription_text,
          language: transcription.language_detected,
          confidenceScore: transcription.confidence_score,
          processingDuration: transcription.processing_duration,
          createdAt: transcription.created_at
        } : null
      };
    });

    res.json({
      success: true,
      statuses
    });
  } catch (error) {
    console.error('Error fetching bulk transcription status:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטוס התמלול',
      code: 'BULK_TRANSCRIPTION_STATUS_ERROR'
    });
  }
});

/**
 * Get transcription status for a recording
 */
router.get('/:id/transcription-status', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Get transcription job status
    const { query } = require('../config/database-sqlite');
    const jobResult = await query(`
      SELECT * FROM ai_processing_jobs 
      WHERE recording_id = ? AND user_id = ? AND job_type = 'transcription'
      ORDER BY created_at DESC
      LIMIT 1
    `, [recordingId, userId]);

    let transcriptionStatus = 'not_started';
    let jobDetails = null;

    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0];
      transcriptionStatus = job.status;
      jobDetails = {
        id: job.id,
        status: job.status,
        aiProvider: job.ai_provider,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message,
        createdAt: job.created_at
      };
    }

    // Get transcription result if completed
    let transcription = null;
    if (transcriptionStatus === 'completed') {
      transcription = await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
    }

    res.json({
      success: true,
      transcriptionStatus,
      job: jobDetails,
      transcription: transcription ? {
        id: transcription.id,
        text: transcription.transcription_text,
        language: transcription.language_detected,
        confidenceScore: transcription.confidence_score,
        processingDuration: transcription.processing_duration,
        createdAt: transcription.created_at
      } : null
    });
  } catch (error) {
    console.error('Error fetching transcription status:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטוס התמלול',
      code: 'TRANSCRIPTION_STATUS_ERROR'
    });
  }
});

/**
 * Get transcription text for a recording
 */
router.get('/:id/transcription', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    const transcription = await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
    if (!transcription) {
      return res.status(404).json({
        error: 'תמלול לא נמצא עבור הקלטה זו',
        code: 'TRANSCRIPTION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      transcription: {
        id: transcription.id,
        text: transcription.transcription_text,
        language: transcription.language_detected,
        confidenceScore: transcription.confidence_score,
        processingDuration: transcription.processing_duration,
        aiProvider: transcription.ai_provider,
        modelVersion: transcription.model_version,
        segments: transcription.segments,
        metadata: transcription.metadata,
        createdAt: transcription.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת התמלול',
      code: 'TRANSCRIPTION_FETCH_ERROR'
    });
  }
});

/**
 * Manually trigger transcription for a recording
 */
router.post('/:id/transcribe', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;
    const { provider = 'openai', useEnhancedProcessing = true } = req.body;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Check if transcription is already in progress
    const { query } = require('../config/database-sqlite');
    const existingJobResult = await query(`
      SELECT * FROM ai_processing_jobs 
      WHERE recording_id = ? AND user_id = ? AND job_type = 'transcription' AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [recordingId, userId]);

    if (existingJobResult.rows.length > 0) {
      return res.status(409).json({
        error: 'תמלול כבר מתבצע עבור הקלטה זו',
        code: 'TRANSCRIPTION_IN_PROGRESS'
      });
    }

    // Start transcription
    startAutomaticTranscription(recordingId, recording.file_path, userId);

    res.json({
      success: true,
      message: 'תמלול החל בהצלחה',
      transcriptionStatus: 'pending'
    });
  } catch (error) {
    console.error('Error starting manual transcription:', error);
    res.status(500).json({
      error: 'שגיאה בהתחלת התמלול',
      code: 'TRANSCRIPTION_START_ERROR'
    });
  }
});

/**
 * Edit transcription text
 */
router.put('/:id/transcription', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;
    const { editedText, editReason } = req.body;

    if (!editedText || typeof editedText !== 'string') {
      return res.status(400).json({
        error: 'נדרש טקסט תמלול מערוך',
        code: 'MISSING_EDITED_TEXT'
      });
    }

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Get current transcription
    const transcription = await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
    if (!transcription) {
      return res.status(404).json({
        error: 'תמלול לא נמצא עבור הקלטה זו',
        code: 'TRANSCRIPTION_NOT_FOUND'
      });
    }

    const { run } = require('../config/database-sqlite');

    // Save original text if this is the first edit
    if (!transcription.is_edited) {
      await run(`
        UPDATE transcriptions 
        SET original_text = transcription_text
        WHERE id = ?
      `, [transcription.id]);
    }

    // Save edit to history
    await run(`
      INSERT INTO transcription_edit_history (
        transcription_id, user_id, original_text, edited_text, edit_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [transcription.id, userId, transcription.transcription_text, editedText, editReason || null]);

    // Update transcription with edited text
    await run(`
      UPDATE transcriptions 
      SET transcription_text = ?, is_edited = TRUE, edited_at = datetime('now'), edited_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [editedText, userId, transcription.id]);

    res.json({
      success: true,
      message: 'תמלול עודכן בהצלחה',
      transcription: {
        id: transcription.id,
        text: editedText,
        isEdited: true,
        editedAt: new Date().toISOString(),
        editedBy: userId
      }
    });
  } catch (error) {
    console.error('Error editing transcription:', error);
    res.status(500).json({
      error: 'שגיאה בעריכת התמלול',
      code: 'TRANSCRIPTION_EDIT_ERROR'
    });
  }
});

/**
 * Get transcription edit history
 */
router.get('/:id/transcription/history', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Get transcription
    const transcription = await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
    if (!transcription) {
      return res.status(404).json({
        error: 'תמלול לא נמצא עבור הקלטה זו',
        code: 'TRANSCRIPTION_NOT_FOUND'
      });
    }

    // Get edit history
    const { query } = require('../config/database-sqlite');
    const historyResult = await query(`
      SELECT 
        teh.*,
        u.first_name,
        u.last_name
      FROM transcription_edit_history teh
      LEFT JOIN users u ON teh.user_id = u.id
      WHERE teh.transcription_id = ?
      ORDER BY teh.created_at DESC
    `, [transcription.id]);

    const history = historyResult.rows.map(row => ({
      id: row.id,
      originalText: row.original_text,
      editedText: row.edited_text,
      editReason: row.edit_reason,
      createdAt: row.created_at,
      editedBy: {
        id: row.user_id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'משתמש לא ידוע'
      }
    }));

    res.json({
      success: true,
      history,
      transcription: {
        id: transcription.id,
        currentText: transcription.transcription_text,
        originalText: transcription.original_text,
        isEdited: transcription.is_edited,
        editedAt: transcription.edited_at,
        editedBy: transcription.edited_by
      }
    });
  } catch (error) {
    console.error('Error fetching transcription history:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת היסטוריית עריכות',
      code: 'TRANSCRIPTION_HISTORY_ERROR'
    });
  }
});

/**
 * Update recording metadata (comprehensive)
 */
router.put('/:id/metadata', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;
    const { title, metadata, tags } = req.body;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    const { run } = require('../config/database-sqlite');

    // Prepare update data
    const updates = [];
    const params = [];

    // Update filename if title is provided
    if (title !== undefined && title.trim()) {
      // Keep the original file extension
      const originalExt = path.extname(recording.filename);
      const newFilename = `${title.trim().replace(/[^a-zA-Z0-9\u0590-\u05FF\s-_]/g, '_')}${originalExt}`;
      updates.push('filename = ?');
      params.push(newFilename);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(Array.isArray(tags) ? tags : []));
    }

    if (metadata !== undefined) {
      // Merge with existing metadata, preserving important system fields
      const currentMetadata = recording.metadata || {};
      const updatedMetadata = { 
        ...currentMetadata, 
        ...metadata,
        lastModified: new Date().toISOString(),
        // Preserve system fields
        uploadedAt: currentMetadata.uploadedAt || new Date().toISOString(),
        originalFileName: currentMetadata.originalFileName || recording.filename
      };
      updates.push('metadata = ?');
      params.push(JSON.stringify(updatedMetadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'לא סופקו נתונים לעדכון',
        code: 'NO_UPDATE_DATA'
      });
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(recordingId, userId);

    const sql = `
      UPDATE recordings 
      SET ${updates.join(', ')}
      WHERE (id = ? OR recording_id = ?) AND user_id = ?
    `;

    const result = await run(sql, params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה או לא ניתן לעדכן',
        code: 'UPDATE_FAILED'
      });
    }

    // Get updated recording
    const updatedRecording = await getRecordingById(recordingId, userId);

    res.json({
      success: true,
      message: 'מטא-דאטה עודכנה בהצלחה',
      recording: {
        id: updatedRecording.id,
        filename: updatedRecording.filename,
        tags: updatedRecording.tags || [],
        metadata: updatedRecording.metadata || {},
        updatedAt: updatedRecording.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating recording metadata:', error);
    res.status(500).json({
      error: 'שגיאה בעדכון המטא-דאטה',
      code: 'METADATA_UPDATE_ERROR'
    });
  }
});

/**
 * Update recording tags and metadata (legacy endpoint)
 */
router.put('/:id/tags-metadata', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;
    const { tags, metadata } = req.body;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    const { run } = require('../config/database-sqlite');

    // Prepare update data
    const updates = [];
    const params = [];

    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    if (metadata !== undefined) {
      // Merge with existing metadata
      const currentMetadata = recording.metadata || {};
      const updatedMetadata = { ...currentMetadata, ...metadata };
      updates.push('metadata = ?');
      params.push(JSON.stringify(updatedMetadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'לא סופקו נתונים לעדכון',
        code: 'NO_UPDATE_DATA'
      });
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(recordingId, userId);

    const sql = `
      UPDATE recordings 
      SET ${updates.join(', ')}
      WHERE (id = ? OR recording_id = ?) AND user_id = ?
    `;

    const result = await run(sql, params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה או לא ניתן לעדכן',
        code: 'UPDATE_FAILED'
      });
    }

    // Get updated recording
    const updatedRecording = await getRecordingById(recordingId, userId);

    res.json({
      success: true,
      message: 'תגיות ומטא-דאטה עודכנו בהצלחה',
      recording: {
        id: updatedRecording.id,
        tags: updatedRecording.tags || [],
        metadata: updatedRecording.metadata || {},
        updatedAt: updatedRecording.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating recording tags/metadata:', error);
    res.status(500).json({
      error: 'שגיאה בעדכון תגיות ומטא-דאטה',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * Delete recording
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const recordingId = req.params.id;
    const userId = req.user.id;

    const recording = await getRecordingById(recordingId, userId);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Delete main file from filesystem
    try {
      await fs.unlink(recording.file_path);
    } catch (error) {
      console.warn('Error deleting main file:', error);
    }

    // Delete thumbnails if it's a video
    if (recording.media_type === 'video') {
      try {
        const thumbnailDir = path.join(__dirname, '../uploads/thumbnails', recordingId.toString());
        await fs.rmdir(thumbnailDir, { recursive: true });
      } catch (error) {
        console.warn('Error deleting thumbnails:', error);
      }
    }

    // Delete from database (this will cascade delete thumbnails via foreign key)
    await deleteRecordingFromDatabase(recordingId, userId);

    res.json({
      success: true,
      message: 'הקלטה נמחקה בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({
      error: 'שגיאה במחיקת ההקלטה',
      code: 'DELETE_ERROR'
    });
  }
});

// Database helper functions
async function saveRecordingToDatabase({ userId, recordingId, filename, filePath, fileSize, metadata, mediaType = 'audio', tags = [] }) {
  const { query, run } = require('../config/database-sqlite');
  
  // Check which columns exist in the recordings table
  const tableInfoResult = await query(`PRAGMA table_info(recordings)`);
  const existingColumns = tableInfoResult.rows.map(row => row.name);
  
  // Check if recording already exists to prevent duplicates
  const existingResult = await query(`
    SELECT id FROM recordings 
    WHERE user_id = ? AND recording_id = ?
  `, [userId, recordingId]);
  
  if (existingResult.rows.length > 0) {
    console.log('Recording already exists in database, returning existing record:', recordingId);
    const fullResult = await query(`
      SELECT * FROM recordings WHERE id = ?
    `, [existingResult.rows[0].id]);
    
    const fullRecord = fullResult.rows[0];
    return {
      id: fullRecord.id,
      recording_id: fullRecord.recording_id,
      filename: fullRecord.filename,
      file_path: fullRecord.file_path,
      file_size: fullRecord.file_size,
      media_type: fullRecord.media_type || 'audio',
      processing_status: fullRecord.processing_status || 'completed',
      metadata: JSON.parse(fullRecord.metadata || '{}'),
      video_metadata: fullRecord.video_metadata ? JSON.parse(fullRecord.video_metadata) : {},
      created_at: fullRecord.created_at
    };
  }
  
  // Build INSERT statement based on existing columns
  const baseColumns = ['user_id', 'recording_id', 'filename', 'file_path', 'file_size', 'metadata', 'created_at', 'updated_at'];
  const baseValues = [userId, recordingId, filename, filePath, fileSize, JSON.stringify(metadata), 'datetime(\'now\')', 'datetime(\'now\')'];
  
  const videoColumns = [];
  const videoValues = [];
  
  if (existingColumns.includes('media_type')) {
    videoColumns.push('media_type');
    videoValues.push(mediaType);
  }
  
  if (existingColumns.includes('processing_status')) {
    videoColumns.push('processing_status');
    videoValues.push(mediaType === 'video' ? 'pending' : 'completed');
  }
  
  if (existingColumns.includes('video_metadata')) {
    videoColumns.push('video_metadata');
    videoValues.push(JSON.stringify({}));
  }
  
  // Add tags column if it exists
  if (existingColumns.includes('tags')) {
    videoColumns.push('tags');
    videoValues.push(JSON.stringify(tags));
  }
  
  const allColumns = baseColumns.concat(videoColumns);
  const allValues = baseValues.concat(videoValues);
  const placeholders = allValues.map((val, index) => 
    (val === 'datetime(\'now\')') ? 'datetime(\'now\')' : '?'
  );
  const actualValues = allValues.filter(val => val !== 'datetime(\'now\')');
  
  const sql = `
    INSERT INTO recordings (${allColumns.join(', ')})
    VALUES (${placeholders.join(', ')})
  `;
  
  const result = await run(sql, actualValues);

  console.log('Recording saved to database:', {
    id: result.lastID,
    recordingId,
    filename,
    fileSize,
    mediaType
  });

  return {
    id: result.lastID,
    recording_id: recordingId,
    filename,
    file_path: filePath,
    file_size: fileSize,
    media_type: mediaType,
    processing_status: mediaType === 'video' ? 'pending' : 'completed',
    metadata,
    video_metadata: {},
    created_at: new Date().toISOString()
  };
}

async function getUserRecordings({ userId, page, limit, search, sortBy, sortOrder }) {
  const { query } = require('../config/database-sqlite');
  
  // First, check which columns exist in the recordings table
  const tableInfoResult = await query(`PRAGMA table_info(recordings)`);
  const existingColumns = tableInfoResult.rows.map(row => row.name);
  
  // Build SELECT clause based on existing columns
  const baseColumns = ['id', 'recording_id', 'filename', 'file_size', 'metadata', 'created_at', 'updated_at'];
  const videoColumns = ['media_type', 'processing_status', 'thumbnail_path', 'video_metadata', 'tags'];
  
  const selectColumns = baseColumns.concat(
    videoColumns.filter(col => existingColumns.includes(col))
  );
  
  let sql = `
    SELECT ${selectColumns.join(', ')}
    FROM recordings 
    WHERE user_id = ?
  `;
  
  const params = [userId];

  if (search) {
    sql += ` AND (filename LIKE ? OR json_extract(metadata, '$.lessonName') LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  // Validate sortBy to prevent SQL injection - only use columns that exist
  const allowedSortFields = ['created_at', 'updated_at', 'filename', 'file_size'];
  if (existingColumns.includes('media_type')) {
    allowedSortFields.push('media_type');
  }
  
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  sql += ` ORDER BY ${validSortBy} ${validSortOrder}`;
  
  // Add pagination
  const offset = (page - 1) * limit;
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await query(sql, params);
  const recordings = result.rows;

  // Get total count
  let countSql = `SELECT COUNT(*) as total FROM recordings WHERE user_id = ?`;
  const countParams = [userId];
  
  if (search) {
    countSql += ` AND (filename LIKE ? OR json_extract(metadata, '$.lessonName') LIKE ?)`;
    countParams.push(`%${search}%`, `%${search}%`);
  }
  
  const countResult = await query(countSql, countParams);
  const total = countResult.rows[0].total;

  return {
    data: recordings.map(r => ({
      ...r,
      media_type: r.media_type || 'audio',
      processing_status: r.processing_status || 'completed',
      thumbnail_path: r.thumbnail_path || null,
      metadata: JSON.parse(r.metadata || '{}'),
      video_metadata: r.video_metadata ? JSON.parse(r.video_metadata) : {},
      tags: r.tags ? JSON.parse(r.tags) : []
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

async function getRecordingById(recordingId, userId) {
  const { query } = require('../config/database-sqlite');
  
  const result = await query(`
    SELECT * FROM recordings 
    WHERE (id = ? OR recording_id = ?) AND user_id = ?
  `, [recordingId, recordingId, userId]);

  if (result.rows.length > 0) {
    const recording = result.rows[0];
    recording.metadata = JSON.parse(recording.metadata || '{}');
    recording.video_metadata = recording.video_metadata ? JSON.parse(recording.video_metadata) : {};
    recording.media_type = recording.media_type || 'audio';
    recording.processing_status = recording.processing_status || 'completed';
    return recording;
  }

  return null;
}

async function deleteRecordingFromDatabase(recordingId, userId) {
  const { run } = require('../config/database-sqlite');
  
  const result = await run(`
    DELETE FROM recordings 
    WHERE (id = ? OR recording_id = ?) AND user_id = ?
  `, [recordingId, recordingId, userId]);

  return result.changes > 0;
}

async function getUserStorageStats(userId) {
  const { query } = require('../config/database-sqlite');
  
  const result = await query(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(file_size), 0) as size
    FROM recordings 
    WHERE user_id = ?
  `, [userId]);

  const stats = result.rows[0];
  return {
    count: stats.count,
    size: stats.size
  };
}

// Cleanup old chunk uploads periodically
setInterval(() => {
  const now = new Date();
  for (const [uploadId, session] of chunkUploads.entries()) {
    // Remove sessions older than 1 hour
    if (now - session.createdAt > 60 * 60 * 1000) {
      fs.rmdir(session.uploadDir, { recursive: true }).catch(console.error);
      chunkUploads.delete(uploadId);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes

module.exports = router;
