const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');

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
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `recording-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי אודיו מותרים'), false);
    }
  }
});

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

    // Save recording metadata to database
    const recording = await saveRecordingToDatabase({
      userId,
      recordingId: uploadSession.recordingId,
      filename: uploadSession.filename,
      filePath: finalPath,
      fileSize: uploadSession.fileSize,
      metadata: uploadSession.metadata
    });

    // Cleanup temp directory
    await fs.rmdir(uploadSession.uploadDir, { recursive: true });
    chunkUploads.delete(uploadId);

    res.json({
      success: true,
      recording: {
        id: recording.id,
        filename: recording.filename,
        size: recording.file_size,
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
 * Simple upload (non-chunked)
 */
router.post('/upload', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const { recordingId, metadata } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'לא נמצא קובץ אודיו',
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

    // Save recording to database
    const recording = await saveRecordingToDatabase({
      userId,
      recordingId: recordingId || `rec_${Date.now()}`,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      metadata: parsedMetadata
    });

    res.json({
      success: true,
      recording: {
        id: recording.id,
        filename: recording.filename,
        size: recording.file_size,
        createdAt: recording.created_at
      }
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({
      error: 'שגיאה בהעלאת ההקלטה',
      code: 'UPLOAD_ERROR'
    });
  }
});

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
 * Download recording
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
        error: 'קובץ ההקלטה לא נמצא',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);
    res.setHeader('Content-Length', recording.file_size);

    // Stream the file
    const fileStream = require('fs').createReadStream(recording.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({
      error: 'שגיאה בהורדת ההקלטה',
      code: 'DOWNLOAD_ERROR'
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

    // Delete file from filesystem
    try {
      await fs.unlink(recording.file_path);
    } catch (error) {
      console.warn('Error deleting file:', error);
    }

    // Delete from database
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
async function saveRecordingToDatabase({ userId, recordingId, filename, filePath, fileSize, metadata }) {
  const { query, run } = require('../config/database-sqlite');
  
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
      metadata: JSON.parse(fullRecord.metadata || '{}'),
      created_at: fullRecord.created_at
    };
  }
  
  const result = await run(`
    INSERT INTO recordings (
      user_id, recording_id, filename, file_path, file_size, 
      metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    userId,
    recordingId,
    filename,
    filePath,
    fileSize,
    JSON.stringify(metadata)
  ]);

  console.log('Recording saved to database:', {
    id: result.lastID,
    recordingId,
    filename,
    fileSize
  });

  return {
    id: result.lastID,
    recording_id: recordingId,
    filename,
    file_path: filePath,
    file_size: fileSize,
    metadata,
    created_at: new Date().toISOString()
  };
}

async function getUserRecordings({ userId, page, limit, search, sortBy, sortOrder }) {
  const { query } = require('../config/database-sqlite');
  
  let sql = `
    SELECT id, recording_id, filename, file_size, metadata, created_at, updated_at
    FROM recordings 
    WHERE user_id = ?
  `;
  
  const params = [userId];

  if (search) {
    sql += ` AND (filename LIKE ? OR json_extract(metadata, '$.lessonName') LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['created_at', 'updated_at', 'filename', 'file_size'];
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
      metadata: JSON.parse(r.metadata || '{}')
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
