const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const shareContentValidation = [
  body('recordingId')
    .isInt({ min: 1 })
    .withMessage('מזהה הקלטה לא תקין'),
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
    .isInt({ min: 1 })
    .withMessage('מזהה כיתה לא תקין'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('תאריך התחלה לא תקין'),
  body('endDate')
    .optional()
    .isISO8601()
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
 * Share content with classes
 */
router.post('/share', authenticate, shareContentValidation, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים לשתף תוכן',
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

    const { recordingId, contentTypes, classIds, startDate, endDate } = req.body;

    // Verify recording belongs to teacher
    const recording = await getRecordingById(recordingId, req.user.id);
    if (!recording) {
      return res.status(404).json({
        error: 'הקלטה לא נמצאה',
        code: 'RECORDING_NOT_FOUND'
      });
    }

    // Verify all classes belong to teacher
    const classes = await getClassesByIds(classIds, req.user.id);
    if (classes.length !== classIds.length) {
      return res.status(404).json({
        error: 'אחת או יותר מהכיתות לא נמצאו',
        code: 'CLASSES_NOT_FOUND'
      });
    }

    // Verify content exists for the content types being shared
    const aiContent = await getAIContentForRecording(recordingId);
    const missingContent = [];
    
    for (const contentType of contentTypes) {
      if (contentType === 'transcription' && !aiContent?.transcription?.transcription_text) {
        missingContent.push('תמליל');
      } else if (contentType === 'summary' && !aiContent?.summary?.summary_text) {
        missingContent.push('סיכום');
      } else if (contentType === 'test' && (!aiContent?.questions || aiContent.questions.length === 0)) {
        missingContent.push('מבחן');
      }
    }

    if (missingContent.length > 0) {
      return res.status(400).json({
        error: `התוכן הבא לא זמין לשיתוף: ${missingContent.join(', ')}`,
        code: 'CONTENT_NOT_AVAILABLE'
      });
    }

    // Create content shares
    const shareResults = await shareContentWithClasses({
      recordingId,
      teacherId: req.user.id,
      contentTypes,
      classIds,
      startDate,
      endDate
    });

    // Create notifications for students
    await createStudentNotifications({
      shareResults,
      recording,
      teacher: req.user,
      classes
    });

    res.json({
      success: true,
      shares: shareResults,
      message: `תוכן שותף עם ${classes.length} כיתות`
    });
  } catch (error) {
    console.error('Error sharing content:', error);
    res.status(500).json({
      error: 'שגיאה בשיתוף התוכן',
      code: 'SHARE_CONTENT_ERROR'
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

async function shareContentWithClasses({ recordingId, teacherId, contentTypes, classIds, startDate, endDate }) {
  const { run, query } = require('../config/database-sqlite');
  
  const shareResults = [];

  for (const contentType of contentTypes) {
    // Create or update content share
    const shareResult = await run(`
      INSERT OR REPLACE INTO content_shares (
        recording_id, teacher_id, share_type, is_active, 
        start_date, end_date, created_at, updated_at
      ) VALUES (?, ?, ?, TRUE, ?, ?, datetime('now'), datetime('now'))
    `, [
      recordingId,
      teacherId,
      contentType,
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

module.exports = router;
