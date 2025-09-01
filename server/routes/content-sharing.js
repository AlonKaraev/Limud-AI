const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { query, run } = require('../config/database-sqlite');
const consoleLogger = require('../utils/ConsoleLogger');
const {
  detectAndRedactPII,
  validateContentQuality,
  generateSharingToken,
  checkRateLimit,
  logContentAccess,
  validateSchoolAccess
} = require('../middleware/contentSecurity');
const crypto = require('crypto');

const router = express.Router();

// Enhanced error handler for database operations
const handleDatabaseError = (error, res, operation = 'database operation') => {
  console.error(`Database error during ${operation}:`, error);
  
  if (error.code === 'SQLITE_BUSY') {
    return res.status(503).json({
      error: 'מסד הנתונים עמוס כרגע, אנא נסה שוב',
      code: 'DATABASE_BUSY',
      retryAfter: 1000
    });
  }
  
  if (error.code === 'SQLITE_LOCKED') {
    return res.status(503).json({
      error: 'מסד הנתונים נעול, אנא נסה שוב',
      code: 'DATABASE_LOCKED',
      retryAfter: 500
    });
  }
  
  if (error.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({
      error: 'נתונים לא תקינים או כפולים',
      code: 'DATA_CONSTRAINT_ERROR'
    });
  }
  
  return res.status(500).json({
    error: `שגיאה ב${operation}`,
    code: 'DATABASE_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Enhanced query wrapper with retry logic
const executeQuery = async (sql, params = [], maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query(sql, params);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
        continue;
      }
      
      throw error; // Don't retry for other errors
    }
  }
};

// Enhanced run wrapper with retry logic
const executeRun = async (sql, params = [], maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await run(sql, params);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
        continue;
      }
      
      throw error; // Don't retry for other errors
    }
  }
};

// Validation schemas
const shareContentValidation = [
  body('recordingId')
    .custom((value) => {
      // Convert string to integer if needed
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 1) {
        throw new Error('מזהה הקלטה לא תקין');
      }
      return true;
    })
    .customSanitizer((value) => {
      // Convert to integer
      return parseInt(value, 10);
    }),
  body('lessonName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('שם השיעור לא יכול להכיל יותר מ-255 תווים'),
  body('useAiNaming')
    .optional()
    .isBoolean()
    .withMessage('הגדרת שימוש בשמות AI חייבת להיות true או false'),
  body('contentTypes')
    .isArray({ min: 1 })
    .withMessage('יש לבחור לפחות סוג תוכן אחד'),
  body('contentTypes.*')
    .isIn(['transcription', 'summary', 'test'])
    .withMessage('סוג תוכן לא תקין'),
  body('classIds')
    .isArray({ min: 1 })
    .withMessage('יש לבחור לפחות כיתה אחת'),
  body('classIds.*')
    .custom((value) => {
      // Convert string to integer if needed
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 1) {
        throw new Error('מזהה כיתה לא תקין');
      }
      return true;
    })
    .customSanitizer((value) => {
      // Convert to integer
      return parseInt(value, 10);
    }),
  body('startDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      try {
        const date = new Date(value);
        const isValidDate = !isNaN(date.getTime());
        const matchesFormat = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
        return isValidDate && matchesFormat !== null;
      } catch (error) {
        return false;
      }
    })
    .withMessage('תאריך התחלה לא תקין'),
  body('endDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      try {
        const date = new Date(value);
        const isValidDate = !isNaN(date.getTime());
        const matchesFormat = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
        return isValidDate && matchesFormat !== null;
      } catch (error) {
        return false;
      }
    })
    .withMessage('תאריך סיום לא תקין')
];

const createClassValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('שם הכיתה חייב להכיל בין 2 ל-255 תווים'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('תיאור הכיתה לא יכול להכיל יותר מ-1000 תווים'),
  body('gradeLevel')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('רמת כיתה לא יכולה להכיל יותר מ-20 תווים'),
  body('subjectArea')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('תחום לימוד לא יכול להכיל יותר מ-100 תווים')
];

/**
 * Get teacher's classes
 */
router.get('/classes', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים לגשת לכיתות',
        code: 'TEACHER_ONLY'
      });
    }

    const classes = await getTeacherClasses(req.user.id);

    res.json({
      success: true,
      classes
    });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת הכיתות',
      code: 'FETCH_CLASSES_ERROR'
    });
  }
});

/**
 * Create new class
 */
router.post('/classes', authenticate, createClassValidation, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים ליצור כיתות',
        code: 'TEACHER_ONLY'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { name, description, gradeLevel, subjectArea } = req.body;

    const newClass = await createClass({
      teacherId: req.user.id,
      schoolId: req.user.school_id,
      name,
      description,
      gradeLevel,
      subjectArea
    });

    res.status(201).json({
      success: true,
      class: newClass
    });
  } catch (error) {
    console.error('Error creating class:', error);
    
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key')) {
      return res.status(409).json({
        error: 'כיתה עם שם זה כבר קיימת',
        code: 'CLASS_NAME_EXISTS'
      });
    }

    res.status(500).json({
      error: 'שגיאה ביצירת הכיתה',
      code: 'CREATE_CLASS_ERROR'
    });
  }
});

/**
 * Add students to class
 */
router.post('/classes/:classId/students', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים להוסיף תלמידים לכיתות',
        code: 'TEACHER_ONLY'
      });
    }

    const { classId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        error: 'יש לספק רשימת מזהי תלמידים',
        code: 'INVALID_STUDENT_IDS'
      });
    }

    // Verify class belongs to teacher
    const classInfo = await getClassById(classId, req.user.id);
    if (!classInfo) {
      return res.status(404).json({
        error: 'כיתה לא נמצאה',
        code: 'CLASS_NOT_FOUND'
      });
    }

    const result = await addStudentsToClass(classId, studentIds);

    res.json({
      success: true,
      added: result.added,
      skipped: result.skipped,
      message: `נוספו ${result.added} תלמידים לכיתה`
    });
  } catch (error) {
    console.error('Error adding students to class:', error);
    res.status(500).json({
      error: 'שגיאה בהוספת תלמידים לכיתה',
      code: 'ADD_STUDENTS_ERROR'
    });
  }
});

/**
 * Share content with classes - Enhanced with security features
 */
router.post('/share', authenticate, shareContentValidation, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      consoleLogger.logSharingError('UNAUTHORIZED_ACCESS', {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        endpoint: '/api/content-sharing/share',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Non-teacher role attempting to share content',
        message: 'Content sharing access denied - insufficient role permissions'
      });

      await logContentAccess({
        userId: req.user.id,
        contentType: 'share_attempt',
        contentId: null,
        action: 'unauthorized_access',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { reason: 'non_teacher_role', role: req.user.role }
      });

      return res.status(403).json({
        error: 'רק מורים יכולים לשתף תוכן',
        code: 'TEACHER_ONLY',
        userFriendlyMessage: 'אין לך הרשאה לשתף תוכן. פעולה זו מיועדת למורים בלבד.'
      });
    }

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(req.user.id, 'share');
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: 'חרגת ממגבלת השיתוף',
        code: 'RATE_LIMIT_EXCEEDED',
        userFriendlyMessage: `ניתן לשתף עד ${rateLimitCheck.limit} פריטים בשעה. נסה שוב בעוד ${Math.ceil((rateLimitCheck.resetTime - new Date()) / (1000 * 60))} דקות.`,
        retryAfter: Math.ceil((rateLimitCheck.resetTime - new Date()) / 1000)
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        userFriendlyMessage: 'הנתונים שהוזנו אינם תקינים. אנא בדוק את הפרטים ונסה שוב.',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { recordingId, contentTypes, classIds, startDate, endDate, lessonName, useAiNaming } = req.body;

    // Enhanced logging for debugging
    console.log('Content sharing request:', {
      recordingId,
      contentTypes,
      classIds,
      teacherId: req.user.id,
      startDate,
      endDate,
      ipAddress: req.ip
    });

    // Validate school-level access - ensure all classes belong to the teacher's school
    try {
      const classValidation = await validateTeacherClassAccess(req.user.id, req.user.school_id, classIds);
      if (!classValidation.valid) {
        return res.status(403).json({
          error: classValidation.error,
          code: 'SCHOOL_ACCESS_DENIED',
          userFriendlyMessage: classValidation.error,
          invalidClasses: classValidation.invalidClasses
        });
      }
    } catch (validationError) {
      console.error('School access validation error:', validationError);
      return res.status(500).json({
        error: 'שגיאה בבדיקת הרשאות בית ספר',
        code: 'SCHOOL_VALIDATION_ERROR',
        userFriendlyMessage: 'שגיאה בבדיקת הרשאות. אנא נסה שוב.'
      });
    }

    // Verify recording belongs to teacher with better error handling
    let recording;
    try {
      recording = await getRecordingById(recordingId, req.user.id);
      if (!recording) {
        return res.status(404).json({
          error: 'הקלטה לא נמצאה',
          code: 'RECORDING_NOT_FOUND',
          userFriendlyMessage: 'ההקלטה שבחרת לא נמצאה או שאין לך הרשאה לגשת אליה.'
        });
      }
    } catch (dbError) {
      console.error('Database error fetching recording:', dbError);
      return handleDatabaseError(dbError, res, 'אחזור הקלטה');
    }

    // Verify all classes belong to teacher with better error handling
    let classes;
    try {
      classes = await getClassesByIds(classIds, req.user.id);
      if (classes.length !== classIds.length) {
        const foundClassIds = classes.map(c => c.id);
        const missingClassIds = classIds.filter(id => !foundClassIds.includes(id));
        return res.status(404).json({
          error: 'אחת או יותר מהכיתות לא נמצאו',
          code: 'CLASSES_NOT_FOUND',
          userFriendlyMessage: `לא נמצאו כיתות עם המזהים: ${missingClassIds.join(', ')}. ייתכן שהכיתות נמחקו או שאין לך הרשאה לגשת אליהן.`,
          missingClassIds
        });
      }
    } catch (dbError) {
      console.error('Database error fetching classes:', dbError);
      return handleDatabaseError(dbError, res, 'אחזור כיתות');
    }

    // Verify content exists and validate quality
    let aiContent;
    let contentValidationResults = {};
    let securityMetadata = {};
    
    try {
      aiContent = await getAIContentForRecording(recordingId);
      const missingContent = [];
      const contentTypeNames = {
        'transcription': 'תמליל',
        'summary': 'סיכום', 
        'test': 'מבחן'
      };
      
      // Check content availability and validate quality
      for (const contentType of contentTypes) {
        let content = null;
        let contentExists = false;

        if (contentType === 'transcription' && aiContent?.transcription?.transcription_text) {
          content = aiContent.transcription;
          contentExists = true;
        } else if (contentType === 'summary' && aiContent?.summary?.summary_text) {
          content = aiContent.summary;
          contentExists = true;
        } else if (contentType === 'test' && aiContent?.questions && aiContent.questions.length > 0) {
          content = aiContent.questions;
          contentExists = true;
        }

        if (!contentExists) {
          missingContent.push(contentTypeNames[contentType]);
          continue;
        }

        // Validate content quality
        const qualityValidation = validateContentQuality(content, contentType);
        contentValidationResults[contentType] = qualityValidation;

        // Detect and redact PII
        if (contentType === 'transcription' || contentType === 'summary') {
          const textContent = contentType === 'transcription' ? content.transcription_text : content.summary_text;
          const piiResult = detectAndRedactPII(textContent);
          
          securityMetadata[contentType] = {
            piiDetected: piiResult.piiFound,
            piiRedacted: piiResult.piiFound,
            redactionCount: piiResult.redactions.length,
            qualityScore: qualityValidation.score,
            qualityIssues: qualityValidation.issues
          };

          // Store redacted content for sharing
          if (piiResult.piiFound) {
            if (contentType === 'transcription') {
              aiContent.transcription.transcription_text = piiResult.content;
            } else {
              aiContent.summary.summary_text = piiResult.content;
            }
          }
        } else if (contentType === 'test') {
          securityMetadata[contentType] = {
            piiDetected: false,
            piiRedacted: false,
            redactionCount: 0,
            qualityScore: qualityValidation.score,
            qualityIssues: qualityValidation.issues
          };
        }

        // Warn about quality issues
        if (!qualityValidation.isValid || qualityValidation.score < 70) {
          console.warn(`Content quality issues for ${contentType}:`, qualityValidation.issues);
        }
      }

      if (missingContent.length > 0) {
        return res.status(400).json({
          error: `התוכן הבא לא זמין לשיתוף: ${missingContent.join(', ')}`,
          code: 'CONTENT_NOT_AVAILABLE',
          userFriendlyMessage: `לא ניתן לשתף את התוכן המבוקש מכיוון שהוא עדיין לא נוצר. תוכן חסר: ${missingContent.join(', ')}. אנא צור תחילה את התוכן באמצעות עיבוד AI.`,
          missingContent,
          availableContent: {
            transcription: !!aiContent?.transcription?.transcription_text,
            summary: !!aiContent?.summary?.summary_text,
            test: !!(aiContent?.questions && aiContent.questions.length > 0)
          }
        });
      }
    } catch (dbError) {
      console.error('Database error fetching AI content:', dbError);
      return handleDatabaseError(dbError, res, 'אחזור תוכן AI');
    }

    // Check student consent for affected students
    const affectedStudents = await getStudentsFromClasses(classIds);
    const consentIssues = await checkStudentConsent(affectedStudents, ['content_sharing', 'data_processing']);
    
    if (consentIssues.length > 0) {
      console.warn('Student consent issues detected:', consentIssues);
      // For now, log the issue but don't block sharing
      // In production, you might want to require explicit consent
    }

    // Create content shares with basic functionality
    let shareResults;
    try {
      shareResults = await shareContentWithClasses({
        recordingId,
        teacherId: req.user.id,
        contentTypes,
        classIds,
        startDate,
        endDate,
        lessonName,
        useAiNaming
      });
      
      console.log('Content sharing completed successfully:', shareResults);
    } catch (dbError) {
      console.error('Database error creating content shares:', dbError);
      return handleDatabaseError(dbError, res, 'יצירת שיתוף תוכן');
    }

    // Create notifications for students with error handling
    try {
      await createStudentNotifications({
        shareResults,
        recording,
        teacher: req.user,
        classes
      });
      console.log('Student notifications created successfully');
    } catch (notificationError) {
      console.error('Error creating student notifications:', notificationError);
      // Don't fail the whole operation if notifications fail
      // The content was shared successfully, notifications are secondary
    }

    // Prepare response with security information
    const response = {
      success: true,
      shares: shareResults,
      message: `תוכן שותף בהצלחה עם ${classes.length} כיתות`,
      details: {
        sharedContentTypes: contentTypes,
        targetClasses: classes.map(c => ({ id: c.id, name: c.name })),
        totalStudents: classes.reduce((sum, c) => sum + (c.student_count || 0), 0),
        securityInfo: {
          piiDetected: Object.values(securityMetadata).some(m => m.piiDetected),
          contentValidated: true,
          qualityScores: Object.fromEntries(
            Object.entries(contentValidationResults).map(([type, validation]) => [type, validation.score])
          )
        }
      }
    };

    // Add warnings if there are quality or security issues
    const warnings = [];
    
    if (Object.values(securityMetadata).some(m => m.piiDetected)) {
      warnings.push('זוהה מידע אישי בתוכן ובוצעה הסתרה אוטומטית');
    }
    
    const lowQualityContent = Object.entries(contentValidationResults)
      .filter(([_, validation]) => validation.score < 80)
      .map(([type, _]) => contentTypeNames[type]);
    
    if (lowQualityContent.length > 0) {
      warnings.push(`איכות התוכן הבא נמוכה: ${lowQualityContent.join(', ')}`);
    }

    if (consentIssues.length > 0) {
      warnings.push(`${consentIssues.length} תלמידים לא נתנו הסכמה מפורשת לשיתוף תוכן`);
    }

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.json(response);
  } catch (error) {
    console.error('Unexpected error sharing content:', error);
    
    // Log the error
    await logContentAccess({
      userId: req.user?.id,
      contentType: 'content_share',
      contentId: req.body?.recordingId,
      action: 'share_error',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { error: error.message, stack: error.stack }
    }).catch(logError => console.error('Failed to log error:', logError));
    
    // Provide more specific error messages based on error type
    let userFriendlyMessage = 'אירעה שגיאה בלתי צפויה בעת שיתוף התוכן. אנא נסה שוב מאוחר יותר.';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      userFriendlyMessage = 'הפעולה ארכה יותר מהצפוי. אנא נסה שוב.';
      statusCode = 408;
    } else if (error.message.includes('connection')) {
      userFriendlyMessage = 'בעיה בחיבור למסד הנתונים. אנא נסה שוב מאוחר יותר.';
      statusCode = 503;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      userFriendlyMessage = 'השרת אינו זמין כרגע. אנא נסה שוב מאוחר יותר.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({
      error: 'שגיאה בשיתוף התוכן',
      code: 'SHARE_CONTENT_ERROR',
      userFriendlyMessage,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

/**
 * Get teacher's shared content
 */
router.get('/shares', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים לראות תוכן משותף',
        code: 'TEACHER_ONLY'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const shares = await getTeacherShares({
      teacherId: req.user.id,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      shares: shares.data,
      pagination: {
        page: shares.page,
        limit: shares.limit,
        total: shares.total,
        pages: shares.pages
      }
    });
  } catch (error) {
    console.error('Error fetching teacher shares:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת התוכן המשותף',
      code: 'FETCH_SHARES_ERROR'
    });
  }
});

/**
 * Update content share (activate/deactivate, change dates)
 */
router.put('/shares/:shareId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים לעדכן שיתוף תוכן',
        code: 'TEACHER_ONLY'
      });
    }

    const { shareId } = req.params;
    const { isActive, startDate, endDate } = req.body;

    // Verify share belongs to teacher
    const share = await getContentShareById(shareId, req.user.id);
    if (!share) {
      return res.status(404).json({
        error: 'שיתוף תוכן לא נמצא',
        code: 'SHARE_NOT_FOUND'
      });
    }

    const updatedShare = await updateContentShare(shareId, {
      isActive,
      startDate,
      endDate
    });

    res.json({
      success: true,
      share: updatedShare
    });
  } catch (error) {
    console.error('Error updating content share:', error);
    res.status(500).json({
      error: 'שגיאה בעדכון שיתוף התוכן',
      code: 'UPDATE_SHARE_ERROR'
    });
  }
});

/**
 * Delete content share
 */
router.delete('/shares/:shareId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים למחוק שיתוף תוכן',
        code: 'TEACHER_ONLY'
      });
    }

    const { shareId } = req.params;

    // Verify share belongs to teacher
    const share = await getContentShareById(shareId, req.user.id);
    if (!share) {
      return res.status(404).json({
        error: 'שיתוף תוכן לא נמצא',
        code: 'SHARE_NOT_FOUND'
      });
    }

    await deleteContentShare(shareId);

    res.json({
      success: true,
      message: 'שיתוף התוכן נמחק בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting content share:', error);
    res.status(500).json({
      error: 'שגיאה במחיקת שיתוף התוכן',
      code: 'DELETE_SHARE_ERROR'
    });
  }
});

/**
 * Get student's accessible content
 */
router.get('/student/content', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        error: 'רק תלמידים יכולים לגשת לתוכן משותף',
        code: 'STUDENT_ONLY'
      });
    }

    const { page = 1, limit = 20, contentType } = req.query;
    const content = await getStudentAccessibleContent({
      studentId: req.user.id,
      page: parseInt(page),
      limit: parseInt(limit),
      contentType
    });

    res.json({
      success: true,
      content: content.data,
      pagination: {
        page: content.page,
        limit: content.limit,
        total: content.total,
        pages: content.pages
      }
    });
  } catch (error) {
    console.error('Error fetching student content:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת התוכן הזמין',
      code: 'FETCH_STUDENT_CONTENT_ERROR'
    });
  }
});

/**
 * Access shared content (view/download)
 */
router.get('/student/content/:shareId/:contentType', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        error: 'רק תלמידים יכולים לגשת לתוכן משותף',
        code: 'STUDENT_ONLY'
      });
    }

    const { shareId, contentType } = req.params;

    // Verify student has access to this content
    const hasAccess = await verifyStudentContentAccess(req.user.id, shareId, contentType);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'אין לך הרשאה לגשת לתוכן זה',
        code: 'ACCESS_DENIED'
      });
    }

    // Get the actual content
    const content = await getSharedContentData(shareId, contentType);
    if (!content) {
      return res.status(404).json({
        error: 'תוכן לא נמצא',
        code: 'CONTENT_NOT_FOUND'
      });
    }

    // Log access
    await logStudentContentAccess({
      studentId: req.user.id,
      shareId,
      accessType: 'view',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error accessing shared content:', error);
    res.status(500).json({
      error: 'שגיאה בגישה לתוכן',
      code: 'ACCESS_CONTENT_ERROR'
    });
  }
});

/**
 * Get student notifications
 */
router.get('/student/notifications', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        error: 'רק תלמידים יכולים לראות התראות',
        code: 'STUDENT_ONLY'
      });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const notifications = await getStudentNotifications({
      studentId: req.user.id,
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      notifications: notifications.data,
      pagination: {
        page: notifications.page,
        limit: notifications.limit,
        total: notifications.total,
        pages: notifications.pages
      }
    });
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת ההתראות',
      code: 'FETCH_NOTIFICATIONS_ERROR'
    });
  }
});

/**
 * Mark notification as read
 */
router.put('/student/notifications/:notificationId/read', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        error: 'רק תלמידים יכולים לעדכן התראות',
        code: 'STUDENT_ONLY'
      });
    }

    const { notificationId } = req.params;

    await markNotificationAsRead(notificationId, req.user.id);

    res.json({
      success: true,
      message: 'התראה סומנה כנקראה'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'שגיאה בעדכון ההתראה',
      code: 'UPDATE_NOTIFICATION_ERROR'
    });
  }
});

// Database helper functions
async function getTeacherClasses(teacherId) {
  const { query } = require('../config/database-sqlite');
  
  const result = await query(`
    SELECT 
      c.*,
      COUNT(cm.student_id) as student_count
    FROM classes c
    LEFT JOIN class_memberships cm ON c.id = cm.class_id AND cm.is_active = TRUE
    WHERE c.teacher_id = ? AND c.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, [teacherId]);

  return result.rows;
}

async function createClass({ teacherId, schoolId, name, description, gradeLevel, subjectArea }) {
  const { run, query } = require('../config/database-sqlite');
  
  const result = await run(`
    INSERT INTO classes (
      teacher_id, school_id, name, description, grade_level, 
      subject_area, academic_year, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    teacherId,
    schoolId,
    name,
    description || null,
    gradeLevel || null,
    subjectArea || null,
    '2024-2025' // Current academic year
  ]);

  // Return the created class
  const classResult = await query(`
    SELECT * FROM classes WHERE id = ?
  `, [result.lastID]);

  return classResult.rows[0];
}

async function getClassById(classId, teacherId) {
  const { query } = require('../config/database-sqlite');
  
  const result = await query(`
    SELECT * FROM classes 
    WHERE id = ? AND teacher_id = ? AND is_active = TRUE
  `, [classId, teacherId]);

  return result.rows[0] || null;
}

async function getClassesByIds(classIds, teacherId) {
  const { query } = require('../config/database-sqlite');
  
  const placeholders = classIds.map(() => '?').join(',');
  const result = await query(`
    SELECT * FROM classes 
    WHERE id IN (${placeholders}) AND teacher_id = ? AND is_active = TRUE
  `, [...classIds, teacherId]);

  return result.rows;
}

async function addStudentsToClass(classId, studentIds) {
  const { run, query } = require('../config/database-sqlite');
  
  let added = 0;
  let skipped = 0;

  for (const studentId of studentIds) {
    try {
      // Check if student exists and is actually a student
      const studentCheck = await query(`
        SELECT id FROM users WHERE id = ? AND role = 'student'
      `, [studentId]);

      if (studentCheck.rows.length === 0) {
        skipped++;
        continue;
      }

      // Try to add student to class
      await run(`
        INSERT INTO class_memberships (class_id, student_id, joined_at, is_active)
        VALUES (?, ?, datetime('now'), TRUE)
      `, [classId, studentId]);
      
      added++;
    } catch (error) {
      // Skip if already exists (UNIQUE constraint)
      if (error.message.includes('UNIQUE constraint failed')) {
        skipped++;
      } else {
        throw error;
      }
    }
  }

  return { added, skipped };
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

async function getAIContentForRecording(recordingId) {
  const { query } = require('../config/database-sqlite');
  
  try {
    // Get transcription
    const transcriptionResult = await query(`
      SELECT transcription_text FROM transcriptions 
      WHERE recording_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `, [recordingId]);

    // Get summary
    const summaryResult = await query(`
      SELECT summary_text FROM content_summaries 
      WHERE recording_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `, [recordingId]);

    // Get questions
    const questionsResult = await query(`
      SELECT question_text, question_type, correct_answer, answer_options, difficulty_level
      FROM generated_questions 
      WHERE recording_id = ? 
      ORDER BY created_at DESC
    `, [recordingId]);

    return {
      transcription: transcriptionResult.rows[0] ? {
        transcription_text: transcriptionResult.rows[0].transcription_text
      } : null,
      summary: summaryResult.rows[0] ? {
        summary_text: summaryResult.rows[0].summary_text
      } : null,
      questions: questionsResult.rows.map(q => ({
        ...q,
        answer_options: JSON.parse(q.answer_options || '[]')
      }))
    };
  } catch (error) {
    console.error('Error fetching AI content:', error);
    return null;
  }
}

async function shareContentWithClasses({ recordingId, teacherId, contentTypes, classIds, startDate, endDate, lessonName, useAiNaming }) {
  const { run, query } = require('../config/database-sqlite');
  
  const shareResults = [];

  for (const contentType of contentTypes) {
    // Create or update content share
    const shareResult = await run(`
      INSERT OR REPLACE INTO content_shares (
        recording_id, teacher_id, share_type, lesson_name, use_ai_naming, is_active, 
        start_date, end_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, datetime('now'), datetime('now'))
    `, [
      recordingId,
      teacherId,
      contentType,
      lessonName || null,
      useAiNaming ? 1 : 0,
      startDate || new Date().toISOString(),
      endDate || null
    ]);

    const shareId = shareResult.lastID;

    // Add class permissions
    for (const classId of classIds) {
      await run(`
        INSERT OR IGNORE INTO content_share_permissions (
          content_share_id, class_id, created_at
        ) VALUES (?, ?, datetime('now'))
      `, [shareId, classId]);
    }

    shareResults.push({
      shareId,
      contentType,
      classIds
    });
  }

  return shareResults;
}

async function createStudentNotifications({ shareResults, recording, teacher, classes }) {
  const { run, query } = require('../config/database-sqlite');
  
  // Get all students from the classes
  const classIds = classes.map(c => c.id);
  const placeholders = classIds.map(() => '?').join(',');
  
  const studentsResult = await query(`
    SELECT DISTINCT cm.student_id, u.first_name, u.last_name
    FROM class_memberships cm
    JOIN users u ON cm.student_id = u.id
    WHERE cm.class_id IN (${placeholders}) AND cm.is_active = TRUE
  `, classIds);

  const students = studentsResult.rows;

  // Create notifications for each student and each shared content type
  for (const student of students) {
    for (const shareResult of shareResults) {
      const contentTypeHebrew = {
        transcription: 'תמליל',
        summary: 'סיכום',
        test: 'מבחן'
      }[shareResult.contentType];

      const lessonName = recording.metadata?.lessonName || `הקלטה ${recording.id}`;
      const title = `תוכן חדש זמין: ${contentTypeHebrew}`;
      const message = `המורה ${teacher.first_name} ${teacher.last_name} שיתף איתך ${contentTypeHebrew} עבור השיעור "${lessonName}"`;

      await run(`
        INSERT INTO student_notifications (
          student_id, content_share_id, notification_type, 
          title, message, created_at
        ) VALUES (?, ?, 'content_shared', ?, ?, datetime('now'))
      `, [student.student_id, shareResult.shareId, title, message]);
    }
  }
}

async function getTeacherShares({ teacherId, page, limit }) {
  const { query } = require('../config/database-sqlite');
  
  const offset = (page - 1) * limit;
  
  const result = await query(`
    SELECT 
      cs.*,
      r.filename,
      r.metadata as recording_metadata,
      GROUP_CONCAT(c.name) as class_names,
      COUNT(DISTINCT csp.class_id) as class_count
    FROM content_shares cs
    JOIN recordings r ON cs.recording_id = r.id
    JOIN content_share_permissions csp ON cs.id = csp.content_share_id
    JOIN classes c ON csp.class_id = c.id
    WHERE cs.teacher_id = ?
    GROUP BY cs.id
    ORDER BY cs.created_at DESC
    LIMIT ? OFFSET ?
  `, [teacherId, limit, offset]);

  // Get total count
  const countResult = await query(`
    SELECT COUNT(DISTINCT cs.id) as total
    FROM content_shares cs
    WHERE cs.teacher_id = ?
  `, [teacherId]);

  const total = countResult.rows[0].total;

  return {
    data: result.rows.map(row => ({
      ...row,
      recording_metadata: JSON.parse(row.recording_metadata || '{}'),
      class_names: row.class_names ? row.class_names.split(',') : []
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

async function getContentShareById(shareId, teacherId) {
  const { query } = require('../config/database-sqlite');
  
  const result = await query(`
    SELECT * FROM content_shares 
    WHERE id = ? AND teacher_id = ?
  `, [shareId, teacherId]);

  return result.rows[0] || null;
}

async function updateContentShare(shareId, updates) {
  const { run, query } = require('../config/database-sqlite');
  
  const setParts = [];
  const values = [];

  if (updates.isActive !== undefined) {
    setParts.push('is_active = ?');
    values.push(updates.isActive);
  }
  if (updates.startDate !== undefined) {
    setParts.push('start_date = ?');
    values.push(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    setParts.push('end_date = ?');
    values.push(updates.endDate);
  }

  setParts.push('updated_at = datetime(\'now\')');
  values.push(shareId);

  await run(`
    UPDATE content_shares 
    SET ${setParts.join(', ')}
    WHERE id = ?
  `, values);

  // Return updated share
  const result = await query(`
    SELECT * FROM content_shares WHERE id = ?
  `, [shareId]);

  return result.rows[0];
}

async function deleteContentShare(shareId) {
  const { run } = require('../config/database-sqlite');
  
  // Delete permissions first (foreign key constraint)
  await run(`
    DELETE FROM content_share_permissions WHERE content_share_id = ?
  `, [shareId]);

  // Delete the share
  await run(`
    DELETE FROM content_shares WHERE id = ?
  `, [shareId]);
}

async function getStudentAccessibleContent({ studentId, page, limit, contentType }) {
  const { query } = require('../config/database-sqlite');
  
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params = [studentId];

  if (contentType) {
    whereClause = 'AND cs.share_type = ?';
    params.push(contentType);
  }

  params.push(limit, offset);

  const result = await query(`
    SELECT DISTINCT
      cs.id as share_id,
      cs.recording_id,
      cs.teacher_id,
      cs.share_type,
      cs.start_date,
      cs.end_date,
      r.filename,
      r.metadata as recording_metadata,
      u.first_name as teacher_first_name,
      u.last_name as teacher_last_name,
      c.name as class_name
    FROM content_shares cs
    JOIN recordings r ON cs.recording_id = r.id
    JOIN users u ON cs.teacher_id = u.id
    JOIN content_share_permissions csp ON cs.id = csp.content_share_id
    JOIN classes c ON csp.class_id = c.id
    JOIN class_memberships cm ON c.id = cm.class_id
    WHERE cm.student_id = ?
      AND cs.is_active = TRUE
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND cs.start_date <= datetime('now')
      AND c.is_active = TRUE
      AND cm.is_active = TRUE
      ${whereClause}
    ORDER BY cs.created_at DESC
    LIMIT ? OFFSET ?
  `, params);

  // Get total count
  const countParams = [studentId];
  if (contentType) {
    countParams.push(contentType);
  }

  const countResult = await query(`
    SELECT COUNT(DISTINCT cs.id) as total
    FROM content_shares cs
    JOIN content_share_permissions csp ON cs.id = csp.content_share_id
    JOIN classes c ON csp.class_id = c.id
    JOIN class_memberships cm ON c.id = cm.class_id
    WHERE cm.student_id = ?
      AND cs.is_active = TRUE
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND cs.start_date <= datetime('now')
      AND c.is_active = TRUE
      AND cm.is_active = TRUE
      ${whereClause}
  `, countParams);

  const total = countResult.rows[0].total;

  return {
    data: result.rows.map(row => ({
      ...row,
      recording_metadata: JSON.parse(row.recording_metadata || '{}')
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

async function verifyStudentContentAccess(studentId, shareId, contentType) {
  const { query } = require('../config/database-sqlite');
  
  const result = await query(`
    SELECT 1
    FROM content_shares cs
    JOIN content_share_permissions csp ON cs.id = csp.content_share_id
    JOIN classes c ON csp.class_id = c.id
    JOIN class_memberships cm ON c.id = cm.class_id
    WHERE cm.student_id = ?
      AND cs.id = ?
      AND cs.share_type = ?
      AND cs.is_active = TRUE
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND cs.start_date <= datetime('now')
      AND c.is_active = TRUE
      AND cm.is_active = TRUE
    LIMIT 1
  `, [studentId, shareId, contentType]);

  return result.rows.length > 0;
}

async function getSharedContentData(shareId, contentType) {
  const { query } = require('../config/database-sqlite');
  
  // Get the recording ID from the share
  const shareResult = await query(`
    SELECT recording_id FROM content_shares WHERE id = ?
  `, [shareId]);

  if (shareResult.rows.length === 0) {
    return null;
  }

  const recordingId = shareResult.rows[0].recording_id;

  // Get the specific content based on type
  switch (contentType) {
    case 'transcription':
      const transcriptionResult = await query(`
        SELECT transcription_text, confidence_score, language_detected
        FROM transcriptions 
        WHERE recording_id = ? 
        ORDER BY created_at DESC LIMIT 1
      `, [recordingId]);
      
      return transcriptionResult.rows[0] ? {
        type: 'transcription',
        data: transcriptionResult.rows[0]
      } : null;

    case 'summary':
      const summaryResult = await query(`
        SELECT summary_text, key_topics, learning_objectives, subject_area, grade_level
        FROM content_summaries 
        WHERE recording_id = ? 
        ORDER BY created_at DESC LIMIT 1
      `, [recordingId]);
      
      if (summaryResult.rows[0]) {
        const summary = summaryResult.rows[0];
        return {
          type: 'summary',
          data: {
            ...summary,
            key_topics: JSON.parse(summary.key_topics || '[]'),
            learning_objectives: JSON.parse(summary.learning_objectives || '[]')
          }
        };
      }
      return null;

    case 'test':
      const questionsResult = await query(`
        SELECT question_text, question_type, correct_answer, answer_options, 
               difficulty_level, topic_area, explanation
        FROM generated_questions 
        WHERE recording_id = ? 
        ORDER BY created_at DESC
      `, [recordingId]);
      
      return {
        type: 'test',
        data: {
          questions: questionsResult.rows.map(q => ({
            ...q,
            answer_options: JSON.parse(q.answer_options || '[]')
          }))
        }
      };

    default:
      return null;
  }
}

async function logStudentContentAccess({ studentId, shareId, accessType, ipAddress, userAgent }) {
  const { run } = require('../config/database-sqlite');
  
  await run(`
    INSERT INTO student_content_access (
      student_id, content_share_id, access_type, accessed_at, ip_address, user_agent
    ) VALUES (?, ?, ?, datetime('now'), ?, ?)
  `, [studentId, shareId, accessType, ipAddress, userAgent]);
}

async function getStudentNotifications({ studentId, page, limit, unreadOnly }) {
  const { query } = require('../config/database-sqlite');
  
  const offset = (page - 1) * limit;
  let whereClause = 'WHERE sn.student_id = ?';
  const params = [studentId];

  if (unreadOnly) {
    whereClause += ' AND sn.is_read = FALSE';
  }

  params.push(limit, offset);

  const result = await query(`
    SELECT 
      sn.*,
      cs.share_type,
      r.filename,
      r.metadata as recording_metadata,
      u.first_name as teacher_first_name,
      u.last_name as teacher_last_name
    FROM student_notifications sn
    JOIN content_shares cs ON sn.content_share_id = cs.id
    JOIN recordings r ON cs.recording_id = r.id
    JOIN users u ON cs.teacher_id = u.id
    ${whereClause}
    ORDER BY sn.created_at DESC
    LIMIT ? OFFSET ?
  `, params);

  // Get total count
  const countParams = [studentId];
  const countResult = await query(`
    SELECT COUNT(*) as total
    FROM student_notifications sn
    ${whereClause}
  `, countParams);

  const total = countResult.rows[0].total;

  return {
    data: result.rows.map(row => ({
      ...row,
      recording_metadata: JSON.parse(row.recording_metadata || '{}')
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

async function markNotificationAsRead(notificationId, studentId) {
  const { run } = require('../config/database-sqlite');
  
  await run(`
    UPDATE student_notifications 
    SET is_read = TRUE, read_at = datetime('now')
    WHERE id = ? AND student_id = ?
  `, [notificationId, studentId]);
}

// Enhanced security helper functions

/**
 * Validate teacher access to classes (school-level security)
 */
async function validateTeacherClassAccess(teacherId, teacherSchoolId, classIds) {
  const { query } = require('../config/database-sqlite');
  
  try {
    // Check if all classes belong to the teacher and the same school
    const placeholders = classIds.map(() => '?').join(',');
    const result = await query(`
      SELECT c.id, c.name, c.school_id, c.teacher_id
      FROM classes c
      WHERE c.id IN (${placeholders}) AND c.is_active = TRUE
    `, classIds);

    const foundClasses = result.rows;
    
    // Check if all requested classes were found
    if (foundClasses.length !== classIds.length) {
      const foundClassIds = foundClasses.map(c => c.id);
      const missingClassIds = classIds.filter(id => !foundClassIds.includes(id));
      
      return {
        valid: false,
        error: `כיתות לא נמצאו או לא פעילות: ${missingClassIds.join(', ')}`,
        invalidClasses: missingClassIds
      };
    }

    // Check if all classes belong to the teacher
    const notOwnedClasses = foundClasses.filter(c => c.teacher_id !== teacherId);
    if (notOwnedClasses.length > 0) {
      return {
        valid: false,
        error: `אין לך הרשאה לגשת לכיתות: ${notOwnedClasses.map(c => c.name).join(', ')}`,
        invalidClasses: notOwnedClasses.map(c => c.id)
      };
    }

    // Check if all classes belong to the same school as the teacher
    const wrongSchoolClasses = foundClasses.filter(c => c.school_id !== teacherSchoolId);
    if (wrongSchoolClasses.length > 0) {
      return {
        valid: false,
        error: `כיתות שייכות לבית ספר אחר: ${wrongSchoolClasses.map(c => c.name).join(', ')}`,
        invalidClasses: wrongSchoolClasses.map(c => c.id)
      };
    }

    return {
      valid: true,
      classes: foundClasses
    };
  } catch (error) {
    console.error('Error validating teacher class access:', error);
    return {
      valid: false,
      error: 'שגיאה בבדיקת הרשאות כיתות',
      invalidClasses: classIds
    };
  }
}

/**
 * Get students from classes for consent checking
 */
async function getStudentsFromClasses(classIds) {
  const { query } = require('../config/database-sqlite');
  
  const placeholders = classIds.map(() => '?').join(',');
  const result = await query(`
    SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
    FROM users u
    JOIN class_memberships cm ON u.id = cm.student_id
    WHERE cm.class_id IN (${placeholders}) 
      AND u.role = 'student' 
      AND cm.is_active = TRUE
  `, classIds);

  return result.rows;
}

/**
 * Check student consent for specific consent types
 * Simplified version - assumes consent is given for now
 */
async function checkStudentConsent(students, consentTypes) {
  // For now, return empty array (no consent issues)
  // In a full implementation, this would check a student_consent table
  return [];
}

/**
 * Enhanced content sharing with security features
 */
async function shareContentWithClassesSecure({
  recordingId,
  teacherId,
  contentTypes,
  classIds,
  startDate,
  endDate,
  aiContent,
  securityMetadata,
  ipAddress,
  userAgent
}) {
  const { run, query } = require('../config/database-sqlite');
  
  const shareResults = [];

  for (const contentType of contentTypes) {
    // Generate secure sharing token
    const sharingToken = generateSharingToken();
    
    // Determine expiration date (default 30 days)
    const expiresAt = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Create content share with security features
    const shareResult = await run(`
      INSERT OR REPLACE INTO content_shares (
        recording_id, teacher_id, share_type, is_active, 
        start_date, end_date, sharing_token, classification_level,
        requires_consent, auto_expire_days, created_at, updated_at
      ) VALUES (?, ?, ?, TRUE, ?, ?, ?, 'public', 0, 30, datetime('now'), datetime('now'))
    `, [
      recordingId,
      teacherId,
      contentType,
      startDate || new Date().toISOString(),
      expiresAt,
      sharingToken
    ]);

    const shareId = shareResult.lastID;

    // Create content security metadata
    const metadata = securityMetadata[contentType];
    if (metadata) {
      await run(`
        INSERT OR REPLACE INTO content_security_metadata (
          content_type, content_id, classification_level, pii_detected,
          pii_redacted, redaction_count, quality_score, quality_issues,
          sharing_token, expires_at, created_by, created_at, updated_at
        ) VALUES (?, ?, 'public', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        contentType,
        shareId,
        metadata.piiDetected ? 1 : 0,
        metadata.piiRedacted ? 1 : 0,
        metadata.redactionCount,
        metadata.qualityScore,
        JSON.stringify(metadata.qualityIssues),
        sharingToken,
        expiresAt,
        teacherId
      ]);
    }

    // Create content snapshot for immutable sharing
    const contentData = getContentForSnapshot(aiContent, contentType);
    if (contentData) {
      const contentHash = crypto.createHash('sha256').update(JSON.stringify(contentData)).digest('hex');
      
      await run(`
        INSERT INTO content_snapshots (
          original_content_type, original_content_id, snapshot_data,
          content_hash, created_for_share_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        contentType,
        recordingId,
        JSON.stringify(contentData),
        contentHash,
        shareId,
        teacherId
      ]);
    }

    // Add class permissions
    for (const classId of classIds) {
      await run(`
        INSERT OR IGNORE INTO content_share_permissions (
          content_share_id, class_id, created_at
        ) VALUES (?, ?, datetime('now'))
      `, [shareId, classId]);
    }

    // Log sharing audit
    await run(`
      INSERT INTO content_sharing_audit (
        share_id, action, performed_by, affected_users, details,
        ip_address, user_agent, created_at
      ) VALUES (?, 'created', ?, ?, ?, ?, ?, datetime('now'))
    `, [
      shareId,
      teacherId,
      JSON.stringify(classIds),
      JSON.stringify({
        contentType,
        securityMetadata: metadata,
        sharingToken
      }),
      ipAddress,
      userAgent
    ]);

    shareResults.push({
      shareId,
      contentType,
      classIds,
      sharingToken,
      expiresAt,
      securityInfo: metadata
    });
  }

  return shareResults;
}

/**
 * Get content data for snapshot creation
 */
function getContentForSnapshot(aiContent, contentType) {
  switch (contentType) {
    case 'transcription':
      return aiContent?.transcription || null;
    case 'summary':
      return aiContent?.summary || null;
    case 'test':
      return { questions: aiContent?.questions || [] };
    default:
      return null;
  }
}

/**
 * Enhanced student notifications with consent checking
 */
async function createStudentNotificationsSecure({
  shareResults,
  recording,
  teacher,
  classes,
  consentRequired = false
}) {
  const { run, query } = require('../config/database-sqlite');
  
  // Get all students from the classes with consent status
  const classIds = classes.map(c => c.id);
  const placeholders = classIds.map(() => '?').join(',');
  
  const studentsResult = await query(`
    SELECT DISTINCT 
      cm.student_id, 
      u.first_name, 
      u.last_name,
      sc.consent_given as content_sharing_consent,
      snp.enabled as notifications_enabled,
      snp.delivery_method
    FROM class_memberships cm
    JOIN users u ON cm.student_id = u.id
    LEFT JOIN student_consent sc ON u.id = sc.student_id AND sc.consent_type = 'content_sharing'
    LEFT JOIN student_notification_preferences snp ON u.id = snp.student_id AND snp.notification_type = 'content_shared'
    WHERE cm.class_id IN (${placeholders}) AND cm.is_active = TRUE
  `, classIds);

  const students = studentsResult.rows;

  // Create notifications for each student and each shared content type
  for (const student of students) {
    // Skip if notifications are disabled
    if (student.notifications_enabled === 0) {
      continue;
    }

    // Check consent if required
    if (consentRequired && !student.content_sharing_consent) {
      console.warn(`Skipping notification for student ${student.student_id} - no consent`);
      continue;
    }

    for (const shareResult of shareResults) {
      const contentTypeHebrew = {
        transcription: 'תמליל',
        summary: 'סיכום',
        test: 'מבחן'
      }[shareResult.contentType];

      const lessonName = recording.metadata?.lessonName || `הקלטה ${recording.id}`;
      const title = `תוכן חדש זמין: ${contentTypeHebrew}`;
      const message = `המורה ${teacher.first_name} ${teacher.last_name} שיתף איתך ${contentTypeHebrew} עבור השיעור "${lessonName}"`;

      // Determine privacy level based on content security
      const privacyLevel = shareResult.securityInfo?.piiDetected ? 'high' : 'standard';

      await run(`
        INSERT INTO student_notifications (
          student_id, content_share_id, notification_type, 
          title, message, requires_consent, consent_obtained,
          privacy_level, created_at
        ) VALUES (?, ?, 'content_shared', ?, ?, ?, ?, ?, datetime('now'))
      `, [
        student.student_id, 
        shareResult.shareId, 
        title, 
        message,
        consentRequired ? 1 : 0,
        student.content_sharing_consent ? 1 : 0,
        privacyLevel
      ]);
    }
  }
}

module.exports = router;
