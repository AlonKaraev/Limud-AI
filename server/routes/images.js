const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const ImageProcessingService = require('../services/ImageProcessingService');
const { run, query } = require('../config/database-sqlite');

const router = express.Router();

// Initialize image processing service
const imageProcessingService = new ImageProcessingService();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/images');
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
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי תמונות מותרים'), false);
    }
  }
});

/**
 * Upload image and start OCR text extraction
 */
router.post('/upload', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { metadata, tags } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'לא נמצא קובץ תמונה',
        code: 'NO_FILE'
      });
    }

    // Parse metadata and tags if they're strings
    let parsedMetadata = {};
    let parsedTags = [];

    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        console.warn('Error parsing metadata:', error);
      }
    }

    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        console.warn('Error parsing tags:', error);
      }
    }

    // Generate unique image ID
    const imageId = `img_${Date.now()}_${Math.round(Math.random() * 1E9)}`;

    // Determine file type from extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileType = getFileTypeFromExtension(fileExtension);

    // Get image dimensions if possible
    let dimensions = null;
    try {
      dimensions = await getImageDimensions(req.file.path);
    } catch (error) {
      console.warn('Could not get image dimensions:', error);
    }

    // Save image to database
    const image = await saveImageToDatabase({
      userId,
      imageId,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType,
      mimeType: req.file.mimetype,
      dimensions,
      metadata: parsedMetadata,
      tags: parsedTags
    });

    // Create OCR extraction job
    const jobId = await imageProcessingService.createExtractionJob(
      image.id,
      userId,
      'ocr'
    );

    // Start OCR text extraction in background
    startAutomaticOCRExtraction(image.id, req.file.path, req.file.mimetype, req.file.originalname, userId, jobId);

    // Generate image URL
    const imageUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      image: {
        id: image.id,
        imageId: image.image_id,
        filename: image.original_filename,
        original_filename: image.original_filename,
        size: image.file_size,
        file_size: image.file_size,
        fileType: image.file_type,
        file_type: image.file_type,
        mimeType: image.mime_type,
        mime_type: image.mime_type,
        dimensions: image.dimensions,
        url: imageUrl,
        thumbnail_url: imageUrl, // For now, use same URL for thumbnail
        extractionStatus: 'pending',
        jobId: jobId,
        createdAt: image.created_at,
        created_at: image.created_at
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      error: 'שגיאה בהעלאת התמונה',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * Get user's images
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const images = await getUserImages({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      images: images.data || [],
      pagination: {
        page: images.page || 1,
        limit: images.limit || 20,
        total: images.total || 0,
        pages: images.pages || 0
      }
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת התמונות',
      code: 'FETCH_ERROR',
      images: [],
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
 * Get image by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      image
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת התמונה',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * Get OCR extraction status for an image
 */
router.get('/:id/extraction-status', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Get extraction job status
    const jobResult = await query(`
      SELECT * FROM image_text_extraction_jobs 
      WHERE image_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [image.id, userId]);

    let extractionStatus = 'not_started';
    let jobDetails = null;

    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0];
      extractionStatus = job.status;
      jobDetails = {
        id: job.id,
        status: job.status,
        progress: job.progress_percent,
        progressMessage: job.progress_message,
        extractionMethod: job.extraction_method,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message,
        createdAt: job.created_at
      };
    }

    // Get extraction result if completed
    let extraction = null;
    if (extractionStatus === 'completed') {
      extraction = await imageProcessingService.getExtractionByImageId(image.id, userId);
    }

    res.json({
      success: true,
      extractionStatus,
      job: jobDetails,
      extraction: extraction ? {
        id: extraction.id,
        text: extraction.extracted_text,
        method: extraction.extraction_method,
        confidence: extraction.confidence_score,
        language: extraction.language_detected,
        processingDuration: extraction.processing_duration,
        isEdited: extraction.is_edited,
        createdAt: extraction.created_at
      } : null
    });
  } catch (error) {
    console.error('Error fetching extraction status:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת סטטוס החילוץ',
      code: 'EXTRACTION_STATUS_ERROR'
    });
  }
});

/**
 * Get extracted text for an image
 */
router.get('/:id/text', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    const extraction = await imageProcessingService.getExtractionByImageId(image.id, userId);
    if (!extraction) {
      return res.status(404).json({
        error: 'טקסט מחולץ לא נמצא עבור תמונה זו',
        code: 'EXTRACTION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      extraction: {
        id: extraction.id,
        text: extraction.extracted_text,
        method: extraction.extraction_method,
        confidence: extraction.confidence_score,
        language: extraction.language_detected,
        processingDuration: extraction.processing_duration,
        metadata: extraction.extraction_metadata,
        isEdited: extraction.is_edited,
        originalText: extraction.original_text,
        editedAt: extraction.edited_at,
        createdAt: extraction.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching extracted text:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת הטקסט המחולץ',
      code: 'TEXT_FETCH_ERROR'
    });
  }
});

/**
 * Edit extracted text
 */
router.put('/:id/text', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;
    const { editedText, editReason } = req.body;

    if (!editedText || typeof editedText !== 'string') {
      return res.status(400).json({
        error: 'נדרש טקסט מערוך',
        code: 'MISSING_EDITED_TEXT'
      });
    }

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Get current extraction
    const extraction = await imageProcessingService.getExtractionByImageId(image.id, userId);
    if (!extraction) {
      return res.status(404).json({
        error: 'טקסט מחולץ לא נמצא עבור תמונה זו',
        code: 'EXTRACTION_NOT_FOUND'
      });
    }

    // Save original text if this is the first edit
    if (!extraction.is_edited) {
      await run(`
        UPDATE image_text_extractions 
        SET original_text = extracted_text
        WHERE id = ?
      `, [extraction.id]);
    }

    // Save edit to history
    await run(`
      INSERT INTO image_text_extraction_edit_history (
        extraction_id, user_id, original_text, edited_text, edit_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [extraction.id, userId, extraction.extracted_text, editedText, editReason || null]);

    // Update extraction with edited text
    await run(`
      UPDATE image_text_extractions 
      SET extracted_text = ?, is_edited = TRUE, edited_at = datetime('now'), edited_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [editedText, userId, extraction.id]);

    res.json({
      success: true,
      message: 'הטקסט המחולץ עודכן בהצלחה',
      extraction: {
        id: extraction.id,
        text: editedText,
        isEdited: true,
        editedAt: new Date().toISOString(),
        editedBy: userId
      }
    });
  } catch (error) {
    console.error('Error editing extracted text:', error);
    res.status(500).json({
      error: 'שגיאה בעריכת הטקסט המחולץ',
      code: 'TEXT_EDIT_ERROR'
    });
  }
});

/**
 * Manually trigger OCR text extraction for an image
 */
router.post('/:id/extract', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;
    const { method = 'ocr' } = req.body;

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Check if extraction is already in progress
    const existingJobResult = await query(`
      SELECT * FROM image_text_extraction_jobs 
      WHERE image_id = ? AND user_id = ? AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [image.id, userId]);

    if (existingJobResult.rows.length > 0) {
      return res.status(409).json({
        error: 'חילוץ טקסט כבר מתבצע עבור תמונה זו',
        code: 'EXTRACTION_IN_PROGRESS'
      });
    }

    // Create new extraction job
    const jobId = await imageProcessingService.createExtractionJob(image.id, userId, method);

    // Start extraction
    startAutomaticOCRExtraction(image.id, image.file_path, image.mime_type, image.original_filename, userId, jobId);

    res.json({
      success: true,
      message: 'חילוץ טקסט החל בהצלחה',
      jobId: jobId,
      extractionStatus: 'pending'
    });
  } catch (error) {
    console.error('Error starting manual extraction:', error);
    res.status(500).json({
      error: 'שגיאה בהתחלת חילוץ הטקסט',
      code: 'EXTRACTION_START_ERROR'
    });
  }
});

/**
 * Update image metadata
 */
router.put('/:id/metadata', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;
    const { title, metadata, tags } = req.body;

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Prepare update data
    const updates = [];
    const params = [];

    // Update original filename if title is provided
    if (title !== undefined && title.trim()) {
      // Keep the original file extension
      const originalExt = path.extname(image.original_filename);
      const newFilename = `${title.trim().replace(/[^a-zA-Z0-9\u0590-\u05FF\s-_]/g, '_')}${originalExt}`;
      updates.push('original_filename = ?');
      params.push(newFilename);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(Array.isArray(tags) ? tags : []));
    }

    if (metadata !== undefined) {
      // Merge with existing metadata, preserving important system fields
      const currentMetadata = image.metadata || {};
      const updatedMetadata = { 
        ...currentMetadata, 
        ...metadata,
        lastModified: new Date().toISOString(),
        // Preserve system fields
        uploadedAt: currentMetadata.uploadedAt || new Date().toISOString(),
        originalFileName: currentMetadata.originalFileName || image.original_filename
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
    params.push(image.id, userId);

    const sql = `
      UPDATE images 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    const result = await run(sql, params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה או לא ניתן לעדכן',
        code: 'UPDATE_FAILED'
      });
    }

    // Get updated image
    const updatedImage = await getImageById(imageId, userId);

    res.json({
      success: true,
      message: 'מטא-דאטה עודכנה בהצלחה',
      image: {
        id: updatedImage.id,
        original_filename: updatedImage.original_filename,
        tags: updatedImage.tags || [],
        metadata: updatedImage.metadata || {},
        updated_at: updatedImage.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating image metadata:', error);
    res.status(500).json({
      error: 'שגיאה בעדכון המטא-דאטה',
      code: 'METADATA_UPDATE_ERROR'
    });
  }
});

/**
 * Delete image
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;

    const image = await getImageById(imageId, userId);
    if (!image) {
      return res.status(404).json({
        error: 'תמונה לא נמצאה',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(image.file_path);
    } catch (error) {
      console.warn('Error deleting image file:', error);
    }

    // Delete from database (cascades to related tables)
    await deleteImageFromDatabase(image.id, userId);

    res.json({
      success: true,
      message: 'התמונה נמחקה בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      error: 'שגיאה במחיקת התמונה',
      code: 'DELETE_ERROR'
    });
  }
});

// Helper functions

/**
 * Start automatic OCR extraction in background
 */
async function startAutomaticOCRExtraction(imageId, filePath, mimeType, fileName, userId, jobId) {
  try {
    console.log(`Starting automatic OCR extraction for image ${imageId}`);
    
    // Process extraction in background (don't await)
    processOCRExtractionAsync(imageId, filePath, mimeType, fileName, userId, jobId);
    
  } catch (error) {
    console.error(`Failed to start automatic OCR extraction for image ${imageId}:`, error);
  }
}

/**
 * Async OCR extraction processing function
 */
async function processOCRExtractionAsync(imageId, filePath, mimeType, fileName, userId, jobId) {
  try {
    console.log(`Processing OCR extraction for image ${imageId}, job ${jobId}`);
    
    // Perform OCR text extraction
    const extractionResult = await imageProcessingService.extractText({
      filePath,
      mimeType,
      fileName,
      imageId,
      userId,
      jobId
    });

    if (extractionResult.success) {
      console.log(`OCR extraction completed successfully for image ${imageId}`);
    } else {
      console.error(`OCR extraction failed for image ${imageId}:`, extractionResult.error);
    }

  } catch (error) {
    console.error(`OCR extraction processing failed for image ${imageId}:`, error);
    
    // Update job status to failed
    await imageProcessingService.updateJobStatus(jobId, 'failed', 0, error.message);
  }
}

/**
 * Get image dimensions using a simple approach
 */
async function getImageDimensions(filePath) {
  // This is a placeholder - in a real implementation, you'd use a library like 'sharp' or 'jimp'
  // For now, return null and let the frontend handle dimensions
  return null;
}

/**
 * Get file type from extension
 */
function getFileTypeFromExtension(extension) {
  const typeMap = {
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.png': 'png',
    '.gif': 'gif',
    '.webp': 'webp',
    '.bmp': 'bmp',
    '.tiff': 'tiff',
    '.svg': 'svg'
  };
  
  return typeMap[extension] || 'unknown';
}

/**
 * Save image to database
 */
async function saveImageToDatabase({
  userId,
  imageId,
  filename,
  originalFilename,
  filePath,
  fileSize,
  fileType,
  mimeType,
  dimensions,
  metadata,
  tags
}) {
  const result = await run(`
    INSERT INTO images (
      user_id, image_id, filename, original_filename, file_path,
      file_size, file_type, mime_type, dimensions, metadata, tags,
      upload_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))
  `, [
    userId,
    imageId,
    filename,
    originalFilename,
    filePath,
    fileSize,
    fileType,
    mimeType,
    JSON.stringify(dimensions),
    JSON.stringify(metadata),
    JSON.stringify(tags)
  ]);

  return {
    id: result.lastID,
    image_id: imageId,
    filename,
    original_filename: originalFilename,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
    mime_type: mimeType,
    dimensions,
    metadata,
    tags,
    upload_status: 'completed',
    created_at: new Date().toISOString()
  };
}

/**
 * Get user's images
 */
async function getUserImages({ userId, page, limit, search, sortBy, sortOrder }) {
  let sql = `
    SELECT i.*, 
           iej.status as extraction_status,
           iej.progress_percent as extraction_progress
    FROM images i
    LEFT JOIN image_text_extraction_jobs iej ON i.id = iej.image_id 
      AND iej.job_id = (
        SELECT job_id FROM image_text_extraction_jobs 
        WHERE image_id = i.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    WHERE i.user_id = ?
  `;
  
  const params = [userId];

  if (search) {
    sql += ` AND (i.original_filename LIKE ? OR i.metadata LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['created_at', 'updated_at', 'original_filename', 'file_size', 'file_type'];
  const validSortBy = allowedSortFields.includes(sortBy) ? `i.${sortBy}` : 'i.created_at';
  const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  sql += ` ORDER BY ${validSortBy} ${validSortOrder}`;
  
  // Add pagination
  const offset = (page - 1) * limit;
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await query(sql, params);
  const images = result.rows;

  // Get total count
  let countSql = `SELECT COUNT(*) as total FROM images WHERE user_id = ?`;
  const countParams = [userId];
  
  if (search) {
    countSql += ` AND (original_filename LIKE ? OR metadata LIKE ?)`;
    countParams.push(`%${search}%`, `%${search}%`);
  }
  
  const countResult = await query(countSql, countParams);
  const total = countResult.rows[0].total;

  return {
    data: images.map(i => ({
      ...i,
      dimensions: JSON.parse(i.dimensions || 'null'),
      metadata: JSON.parse(i.metadata || '{}'),
      tags: JSON.parse(i.tags || '[]'),
      url: `/uploads/images/${i.filename}`,
      thumbnail_url: `/uploads/images/${i.filename}`, // For now, use same URL for thumbnail
      extractionStatus: i.extraction_status || 'not_started'
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get image by ID
 */
async function getImageById(imageId, userId) {
  const result = await query(`
    SELECT * FROM images 
    WHERE (id = ? OR image_id = ?) AND user_id = ?
  `, [imageId, imageId, userId]);

  if (result.rows.length > 0) {
    const image = result.rows[0];
    image.dimensions = JSON.parse(image.dimensions || 'null');
    image.metadata = JSON.parse(image.metadata || '{}');
    image.tags = JSON.parse(image.tags || '[]');
    return image;
  }

  return null;
}

/**
 * Delete image from database
 */
async function deleteImageFromDatabase(imageId, userId) {
  const result = await run(`
    DELETE FROM images 
    WHERE id = ? AND user_id = ?
  `, [imageId, userId]);

  return result.changes > 0;
}

module.exports = router;
