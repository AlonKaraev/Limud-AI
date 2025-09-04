const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const DocumentProcessingService = require('../services/DocumentProcessingService');
const { run, query } = require('../config/database-sqlite');

const router = express.Router();

// Initialize document processing service
const documentProcessingService = new DocumentProcessingService();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
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
    cb(null, `document-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept document files
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי מסמכים מותרים'), false);
    }
  }
});

/**
 * Upload document and start text extraction
 */
router.post('/upload', authenticate, upload.single('document'), async (req, res) => {
  try {
    const { metadata, tags } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'לא נמצא קובץ מסמך',
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

    // Generate unique document ID
    const documentId = `doc_${Date.now()}_${Math.round(Math.random() * 1E9)}`;

    // Determine file type from extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileType = getFileTypeFromExtension(fileExtension);

    // Save document to database
    const document = await saveDocumentToDatabase({
      userId,
      documentId,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType,
      mimeType: req.file.mimetype,
      metadata: parsedMetadata,
      tags: parsedTags
    });

    // Create extraction job
    const jobId = await documentProcessingService.createExtractionJob(
      document.id,
      userId,
      'auto'
    );

    // Start text extraction in background
    startAutomaticTextExtraction(document.id, req.file.path, req.file.mimetype, req.file.originalname, userId, jobId);

    res.json({
      success: true,
      document: {
        id: document.id,
        documentId: document.document_id,
        filename: document.original_filename,
        size: document.file_size,
        fileType: document.file_type,
        mimeType: document.mime_type,
        extractionStatus: 'pending',
        jobId: jobId,
        createdAt: document.created_at
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      error: 'שגיאה בהעלאת המסמך',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * Get user's documents
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const documents = await getUserDocuments({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      documents: documents.data || [],
      pagination: {
        page: documents.page || 1,
        limit: documents.limit || 20,
        total: documents.total || 0,
        pages: documents.pages || 0
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת המסמכים',
      code: 'FETCH_ERROR',
      documents: [],
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
 * Get document by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({
        error: 'מסמך לא נמצא',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת המסמך',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * Get text extraction status for a document
 */
router.get('/:id/extraction-status', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({
        error: 'מסמך לא נמצא',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Get extraction job status
    const jobResult = await query(`
      SELECT * FROM text_extraction_jobs 
      WHERE document_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [document.id, userId]);

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
      extraction = await documentProcessingService.getExtractionByDocumentId(document.id, userId);
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
 * Get extracted text for a document
 */
router.get('/:id/text', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({
        error: 'מסמך לא נמצא',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    const extraction = await documentProcessingService.getExtractionByDocumentId(document.id, userId);
    if (!extraction) {
      return res.status(404).json({
        error: 'טקסט מחולץ לא נמצא עבור מסמך זה',
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
    const documentId = req.params.id;
    const userId = req.user.id;
    const { editedText, editReason } = req.body;

    if (!editedText || typeof editedText !== 'string') {
      return res.status(400).json({
        error: 'נדרש טקסט מערוך',
        code: 'MISSING_EDITED_TEXT'
      });
    }

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({
        error: 'מסמך לא נמצא',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Get current extraction
    const extraction = await documentProcessingService.getExtractionByDocumentId(document.id, userId);
    if (!extraction) {
      return res.status(404).json({
        error: 'טקסט מחולץ לא נמצא עבור מסמך זה',
        code: 'EXTRACTION_NOT_FOUND'
      });
    }

    // Save original text if this is the first edit
    if (!extraction.is_edited) {
      await run(`
        UPDATE document_text_extractions 
        SET original_text = extracted_text
        WHERE id = ?
      `, [extraction.id]);
    }

    // Save edit to history
    await run(`
      INSERT INTO text_extraction_edit_history (
        extraction_id, user_id, original_text, edited_text, edit_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [extraction.id, userId, extraction.extracted_text, editedText, editReason || null]);

    // Update extraction with edited text
    await run(`
      UPDATE document_text_extractions 
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
 * Manually trigger text extraction for a document
 */
router.post('/:id/extract', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const { method = 'auto' } = req.body;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({
        error: 'מסמך לא נמצא',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Check if extraction is already in progress
    const existingJobResult = await query(`
      SELECT * FROM text_extraction_jobs 
      WHERE document_id = ? AND user_id = ? AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [document.id, userId]);

    if (existingJobResult.rows.length > 0) {
      return res.status(409).json({
        error: 'חילוץ טקסט כבר מתבצע עבור מסמך זה',
        code: 'EXTRACTION_IN_PROGRESS'
      });
    }

    // Create new extraction job
    const jobId = await documentProcessingService.createExtractionJob(document.id, userId, method);

    // Start extraction
    startAutomaticTextExtraction(document.id, document.file_path, document.mime_type, document.original_filename, userId, jobId);

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
 * Delete document
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({
        error: 'מסמך לא נמצא',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.file_path);
    } catch (error) {
      console.warn('Error deleting document file:', error);
    }

    // Delete from database (cascades to related tables)
    await deleteDocumentFromDatabase(document.id, userId);

    res.json({
      success: true,
      message: 'המסמך נמחק בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      error: 'שגיאה במחיקת המסמך',
      code: 'DELETE_ERROR'
    });
  }
});

// Helper functions

/**
 * Start automatic text extraction in background
 */
async function startAutomaticTextExtraction(documentId, filePath, mimeType, fileName, userId, jobId) {
  try {
    console.log(`Starting automatic text extraction for document ${documentId}`);
    
    // Process extraction in background (don't await)
    processTextExtractionAsync(documentId, filePath, mimeType, fileName, userId, jobId);
    
  } catch (error) {
    console.error(`Failed to start automatic text extraction for document ${documentId}:`, error);
  }
}

/**
 * Async text extraction processing function
 */
async function processTextExtractionAsync(documentId, filePath, mimeType, fileName, userId, jobId) {
  try {
    console.log(`Processing text extraction for document ${documentId}, job ${jobId}`);
    
    // Perform text extraction
    const extractionResult = await documentProcessingService.extractText({
      filePath,
      mimeType,
      fileName,
      documentId,
      userId,
      jobId
    });

    if (extractionResult.success) {
      console.log(`Text extraction completed successfully for document ${documentId}`);
    } else {
      console.error(`Text extraction failed for document ${documentId}:`, extractionResult.error);
    }

  } catch (error) {
    console.error(`Text extraction processing failed for document ${documentId}:`, error);
    
    // Update job status to failed
    await documentProcessingService.updateJobStatus(jobId, 'failed', 0, error.message);
  }
}

/**
 * Get file type from extension
 */
function getFileTypeFromExtension(extension) {
  const typeMap = {
    '.pdf': 'pdf',
    '.doc': 'doc',
    '.docx': 'docx',
    '.xls': 'xls',
    '.xlsx': 'xlsx',
    '.ppt': 'ppt',
    '.pptx': 'pptx',
    '.txt': 'txt',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image'
  };
  
  return typeMap[extension] || 'unknown';
}

/**
 * Save document to database
 */
async function saveDocumentToDatabase({
  userId,
  documentId,
  filename,
  originalFilename,
  filePath,
  fileSize,
  fileType,
  mimeType,
  metadata,
  tags
}) {
  const result = await run(`
    INSERT INTO documents (
      user_id, document_id, filename, original_filename, file_path,
      file_size, file_type, mime_type, metadata, tags,
      upload_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))
  `, [
    userId,
    documentId,
    filename,
    originalFilename,
    filePath,
    fileSize,
    fileType,
    mimeType,
    JSON.stringify(metadata),
    JSON.stringify(tags)
  ]);

  return {
    id: result.lastID,
    document_id: documentId,
    filename,
    original_filename: originalFilename,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
    mime_type: mimeType,
    metadata,
    tags,
    upload_status: 'completed',
    created_at: new Date().toISOString()
  };
}

/**
 * Get user's documents
 */
async function getUserDocuments({ userId, page, limit, search, sortBy, sortOrder }) {
  let sql = `
    SELECT d.*, 
           tej.status as extraction_status,
           tej.progress_percent as extraction_progress
    FROM documents d
    LEFT JOIN text_extraction_jobs tej ON d.id = tej.document_id 
      AND tej.id = (
        SELECT id FROM text_extraction_jobs 
        WHERE document_id = d.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    WHERE d.user_id = ?
  `;
  
  const params = [userId];

  if (search) {
    sql += ` AND (d.original_filename LIKE ? OR d.metadata LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['created_at', 'updated_at', 'original_filename', 'file_size', 'file_type'];
  const validSortBy = allowedSortFields.includes(sortBy) ? `d.${sortBy}` : 'd.created_at';
  const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  sql += ` ORDER BY ${validSortBy} ${validSortOrder}`;
  
  // Add pagination
  const offset = (page - 1) * limit;
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await query(sql, params);
  const documents = result.rows;

  // Get total count
  let countSql = `SELECT COUNT(*) as total FROM documents WHERE user_id = ?`;
  const countParams = [userId];
  
  if (search) {
    countSql += ` AND (original_filename LIKE ? OR metadata LIKE ?)`;
    countParams.push(`%${search}%`, `%${search}%`);
  }
  
  const countResult = await query(countSql, countParams);
  const total = countResult.rows[0].total;

  return {
    data: documents.map(d => ({
      ...d,
      metadata: JSON.parse(d.metadata || '{}'),
      tags: JSON.parse(d.tags || '[]')
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get document by ID
 */
async function getDocumentById(documentId, userId) {
  const result = await query(`
    SELECT * FROM documents 
    WHERE (id = ? OR document_id = ?) AND user_id = ?
  `, [documentId, documentId, userId]);

  if (result.rows.length > 0) {
    const document = result.rows[0];
    document.metadata = JSON.parse(document.metadata || '{}');
    document.tags = JSON.parse(document.tags || '[]');
    return document;
  }

  return null;
}

/**
 * Delete document from database
 */
async function deleteDocumentFromDatabase(documentId, userId) {
  const result = await run(`
    DELETE FROM documents 
    WHERE id = ? AND user_id = ?
  `, [documentId, userId]);

  return result.changes > 0;
}

module.exports = router;
