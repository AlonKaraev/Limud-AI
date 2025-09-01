const express = require('express');
const { authenticate } = require('../middleware/auth');
const { db, query, run } = require('../config/database-sqlite');

const router = express.Router();

// Middleware to ensure user is a student
const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      error: 'גישה מוגבלת לתלמידים בלבד',
      code: 'STUDENT_ACCESS_REQUIRED'
    });
  }
  next();
};

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
  
  if (error.code === 'SQLITE_CORRUPT') {
    return res.status(500).json({
      error: 'שגיאה במסד הנתונים, אנא פנה למנהל המערכת',
      code: 'DATABASE_CORRUPT'
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

// Get student dashboard data
router.get('/dashboard', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student's classes with error handling
    const classes = await executeQuery(`
      SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
      FROM classes c
      JOIN class_memberships cm ON c.id = cm.class_id
      JOIN users u ON c.teacher_id = u.id
      WHERE cm.student_id = ? AND cm.is_active = 1 AND c.is_active = 1
    `, [studentId]);

    // Get recent activity count
    const recentActivity = await executeQuery(`
      SELECT COUNT(*) as count
      FROM student_content_access sca
      JOIN content_shares cs ON sca.content_share_id = cs.id
      WHERE sca.student_id = ? AND sca.accessed_at > datetime('now', '-7 days')
    `, [studentId]);

    // Get available lessons count
    const lessonsCount = await executeQuery(`
      SELECT COUNT(DISTINCT cs.recording_id) as count
      FROM content_shares cs
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN class_memberships cm ON csp.class_id = cm.class_id
      WHERE cm.student_id = ? AND cs.is_active = 1 AND cm.is_active = 1
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND (cs.start_date IS NULL OR datetime(cs.start_date) <= datetime('now'))
      AND cs.share_type IN ('transcription', 'summary')
    `, [studentId]);

    // Get available tests count
    const testsCount = await executeQuery(`
      SELECT COUNT(DISTINCT cs.recording_id) as count
      FROM content_shares cs
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN class_memberships cm ON csp.class_id = cm.class_id
      WHERE cm.student_id = ? AND cs.is_active = 1 AND cm.is_active = 1
      AND cs.share_type = 'test'
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND (cs.start_date IS NULL OR datetime(cs.start_date) <= datetime('now'))
    `, [studentId]);

    res.json({
      classes: classes.rows || [],
      stats: {
        recentActivity: recentActivity.rows[0]?.count || 0,
        lessonsCount: lessonsCount.rows[0]?.count || 0,
        testsCount: testsCount.rows[0]?.count || 0
      }
    });

  } catch (error) {
    console.error('Student dashboard error:', error);
    handleDatabaseError(error, res, 'טעינת נתוני התלמיד');
  }
});

// Get student's assigned lessons
router.get('/lessons', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const lessons = await executeQuery(`
      SELECT DISTINCT
        r.id as recording_id,
        r.filename,
        r.created_at as lesson_date,
        r.metadata,
        cs.id as content_share_id,
        cs.share_type,
        cs.lesson_name,
        cs.use_ai_naming,
        cs.start_date,
        cs.end_date,
        c.name as class_name,
        c.subject_area,
        c.grade_level,
        u.first_name as teacher_first_name,
        u.last_name as teacher_last_name,
        -- Check if student has accessed this content
        CASE WHEN sca.id IS NOT NULL THEN 1 ELSE 0 END as has_accessed,
        sca.accessed_at as last_accessed,
        -- Get summary if available
        summary.summary_text,
        summary.key_topics,
        -- Check if there's a test available for this lesson
        CASE WHEN test_share.id IS NOT NULL THEN 1 ELSE 0 END as has_test
      FROM recordings r
      JOIN content_shares cs ON r.id = cs.recording_id
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN classes c ON csp.class_id = c.id
      JOIN class_memberships cm ON c.id = cm.class_id
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN student_content_access sca ON cs.id = sca.content_share_id AND sca.student_id = ?
      LEFT JOIN content_summaries summary ON r.id = summary.recording_id
      LEFT JOIN content_shares test_share ON r.id = test_share.recording_id AND test_share.share_type = 'test' AND test_share.is_active = 1
      WHERE cm.student_id = ? 
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND cs.share_type IN ('transcription', 'summary')
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND (cs.start_date IS NULL OR datetime(cs.start_date) <= datetime('now'))
      ORDER BY r.created_at DESC
    `, [studentId, studentId]);

    // Parse metadata and key_topics JSON fields safely
    const processedLessons = lessons.rows.map(lesson => {
      try {
        return {
          ...lesson,
          metadata: lesson.metadata ? JSON.parse(lesson.metadata) : {},
          key_topics: lesson.key_topics ? JSON.parse(lesson.key_topics) : [],
          has_test: Boolean(lesson.has_test), // Convert to boolean
          has_accessed: Boolean(lesson.has_accessed) // Convert to boolean
        };
      } catch (parseError) {
        console.error('Error parsing lesson data:', parseError);
        return {
          ...lesson,
          metadata: {},
          key_topics: [],
          has_test: Boolean(lesson.has_test),
          has_accessed: Boolean(lesson.has_accessed)
        };
      }
    });

    res.json({ lessons: processedLessons });

  } catch (error) {
    console.error('Student lessons error:', error);
    handleDatabaseError(error, res, 'טעינת השיעורים');
  }
});

// Get student's available tests
router.get('/tests', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const tests = await executeQuery(`
      SELECT DISTINCT
        r.id as recording_id,
        r.filename,
        r.created_at as lesson_date,
        cs.id as content_share_id,
        cs.start_date,
        cs.end_date,
        c.name as class_name,
        c.subject_area,
        c.grade_level,
        u.first_name as teacher_first_name,
        u.last_name as teacher_last_name,
        -- Check if student has accessed this test
        CASE WHEN sca.id IS NOT NULL THEN 1 ELSE 0 END as has_accessed,
        sca.accessed_at as last_accessed,
        -- Get question set info
        qs.id as question_set_id,
        qs.set_name,
        qs.description as test_description,
        qs.total_questions,
        qs.estimated_duration,
        -- Get summary for context
        summary.summary_text,
        summary.key_topics
      FROM recordings r
      JOIN content_shares cs ON r.id = cs.recording_id
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN classes c ON csp.class_id = c.id
      JOIN class_memberships cm ON c.id = cm.class_id
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN student_content_access sca ON cs.id = sca.content_share_id AND sca.student_id = ?
      LEFT JOIN question_sets qs ON r.id = qs.recording_id
      LEFT JOIN content_summaries summary ON r.id = summary.recording_id
      WHERE cm.student_id = ? 
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND cs.share_type = 'test'
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND (cs.start_date IS NULL OR datetime(cs.start_date) <= datetime('now'))
      ORDER BY r.created_at DESC
    `, [studentId, studentId]);

    // Parse JSON fields safely
    const processedTests = tests.rows.map(test => {
      try {
        return {
          ...test,
          key_topics: test.key_topics ? JSON.parse(test.key_topics) : [],
          has_accessed: Boolean(test.has_accessed) // Convert to boolean
        };
      } catch (parseError) {
        console.error('Error parsing test data for recording:', test.recording_id, parseError);
        return {
          ...test,
          key_topics: [],
          has_accessed: Boolean(test.has_accessed)
        };
      }
    });

    console.log(`Returning ${processedTests.length} processed tests for student ${studentId}`);
    res.json({ tests: processedTests });

  } catch (error) {
    console.error('Student tests error:', error);
    handleDatabaseError(error, res, 'טעינת המבחנים');
  }
});

// Get specific lesson details
router.get('/lesson/:id', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const recordingId = req.params.id;

    // Verify student has access to this lesson
    const accessCheck = await executeQuery(`
      SELECT cs.id, cs.share_type
      FROM content_shares cs
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN class_memberships cm ON csp.class_id = cm.class_id
      WHERE cm.student_id = ? 
      AND cs.recording_id = ?
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND datetime(cs.start_date) <= datetime('now')
      LIMIT 1
    `, [studentId, recordingId]);

    if (!accessCheck.rows.length) {
      return res.status(403).json({
        error: 'אין לך הרשאה לגשת לשיעור זה',
        code: 'ACCESS_DENIED'
      });
    }

    // Get lesson details
    const lesson = await executeQuery(`
      SELECT 
        r.*,
        cs.share_type,
        summary.summary_text,
        summary.key_topics,
        summary.learning_objectives,
        transcription.transcription_text,
        c.name as class_name,
        c.subject_area,
        u.first_name as teacher_first_name,
        u.last_name as teacher_last_name
      FROM recordings r
      JOIN content_shares cs ON r.id = cs.recording_id
      LEFT JOIN content_summaries summary ON r.id = summary.recording_id
      LEFT JOIN transcriptions transcription ON r.id = transcription.recording_id
      LEFT JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      LEFT JOIN classes c ON csp.class_id = c.id
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE r.id = ? AND cs.id = ?
      LIMIT 1
    `, [recordingId, accessCheck.rows[0].id]);

    if (!lesson.rows.length) {
      return res.status(404).json({
        error: 'שיעור לא נמצא',
        code: 'LESSON_NOT_FOUND'
      });
    }

    // Log access
    try {
      await run(`
        INSERT INTO student_content_access (student_id, content_share_id, access_type, ip_address, user_agent)
        VALUES (?, ?, 'view', ?, ?)
      `, [studentId, accessCheck.rows[0].id, req.ip, req.get('User-Agent')]);
    } catch (logError) {
      console.error('Error logging access:', logError);
      // Don't fail the request if logging fails
    }

    // Parse JSON fields safely
    const processedLesson = {
      ...lesson.rows[0],
      metadata: lesson.rows[0].metadata ? JSON.parse(lesson.rows[0].metadata) : {},
      key_topics: lesson.rows[0].key_topics ? JSON.parse(lesson.rows[0].key_topics) : [],
      learning_objectives: lesson.rows[0].learning_objectives ? JSON.parse(lesson.rows[0].learning_objectives) : []
    };

    res.json({ lesson: processedLesson });

  } catch (error) {
    console.error('Student lesson details error:', error);
    handleDatabaseError(error, res, 'טעינת פרטי השיעור');
  }
});

// Get test for specific lesson
router.get('/lesson/:id/test', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const recordingId = req.params.id;

    // Verify student has access and get test
    const test = await executeQuery(`
      SELECT 
        qs.*,
        cs.id as content_share_id,
        c.name as class_name,
        u.first_name as teacher_first_name,
        u.last_name as teacher_last_name
      FROM question_sets qs
      JOIN content_shares cs ON qs.recording_id = cs.recording_id
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN class_memberships cm ON csp.class_id = cm.class_id
      LEFT JOIN classes c ON csp.class_id = c.id
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE cm.student_id = ? 
      AND qs.recording_id = ?
      AND cs.share_type = 'test'
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND datetime(cs.start_date) <= datetime('now')
      LIMIT 1
    `, [studentId, recordingId]);

    if (!test.rows.length) {
      return res.status(404).json({
        error: 'מבחן לא נמצא עבור שיעור זה',
        code: 'TEST_NOT_FOUND'
      });
    }

    // Get test questions
    const questions = await executeQuery(`
      SELECT gq.*, qsi.order_index, qsi.points
      FROM generated_questions gq
      JOIN question_set_items qsi ON gq.id = qsi.question_id
      WHERE qsi.question_set_id = ?
      ORDER BY qsi.order_index
    `, [test.rows[0].id]);

    // Parse JSON fields in questions safely
    const processedQuestions = questions.rows.map(q => {
      try {
        return {
          ...q,
          answer_options: q.answer_options ? JSON.parse(q.answer_options) : []
        };
      } catch (parseError) {
        console.error('Error parsing answer options for question:', q.id, parseError);
        return {
          ...q,
          answer_options: []
        };
      }
    });

    // Log access
    try {
      await run(`
        INSERT INTO student_content_access (student_id, content_share_id, access_type, ip_address, user_agent)
        VALUES (?, ?, 'view', ?, ?)
      `, [studentId, test.rows[0].content_share_id, req.ip, req.get('User-Agent')]);
    } catch (logError) {
      console.error('Error logging test access:', logError);
      // Don't fail the request if logging fails
    }

    res.json({ 
      test: {
        ...test.rows[0],
        metadata: test.rows[0].metadata ? JSON.parse(test.rows[0].metadata) : {}
      },
      questions: processedQuestions 
    });

  } catch (error) {
    console.error('Student lesson test error:', error);
    handleDatabaseError(error, res, 'טעינת המבחן');
  }
});

// Log content access
router.post('/content/:id/access', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const contentShareId = req.params.id;
    const { accessType = 'view' } = req.body;

    // Validate access type
    if (!['view', 'download'].includes(accessType)) {
      return res.status(400).json({
        error: 'סוג גישה לא תקין',
        code: 'INVALID_ACCESS_TYPE'
      });
    }

    // Verify student has access to this content
    const accessCheck = await executeQuery(`
      SELECT cs.id
      FROM content_shares cs
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN class_memberships cm ON csp.class_id = cm.class_id
      WHERE cm.student_id = ? 
      AND cs.id = ?
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND (cs.end_date IS NULL OR cs.end_date > datetime('now'))
      AND datetime(cs.start_date) <= datetime('now')
    `, [studentId, contentShareId]);

    if (!accessCheck.rows.length) {
      return res.status(403).json({
        error: 'אין לך הרשאה לגשת לתוכן זה',
        code: 'ACCESS_DENIED'
      });
    }

    // Log the access
    await run(`
      INSERT INTO student_content_access (student_id, content_share_id, access_type, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `, [studentId, contentShareId, accessType, req.ip, req.get('User-Agent')]);

    res.json({ 
      success: true,
      message: 'גישה נרשמה בהצלחה' 
    });

  } catch (error) {
    console.error('Content access logging error:', error);
    handleDatabaseError(error, res, 'רישום הגישה');
  }
});

// Get student notifications
router.get('/notifications', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE sn.student_id = ?';
    const params = [studentId];

    if (unreadOnly === 'true') {
      whereClause += ' AND sn.is_read = 0';
    }

    params.push(parseInt(limit), offset);

    const notifications = await executeQuery(`
      SELECT 
        sn.*,
        cs.share_type,
        r.filename,
        r.metadata as recording_metadata,
        u.first_name as teacher_first_name,
        u.last_name as teacher_last_name,
        c.name as class_name
      FROM student_notifications sn
      JOIN content_shares cs ON sn.content_share_id = cs.id
      JOIN recordings r ON cs.recording_id = r.id
      JOIN users u ON cs.teacher_id = u.id
      LEFT JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      LEFT JOIN classes c ON csp.class_id = c.id
      ${whereClause}
      ORDER BY sn.created_at DESC
      LIMIT ? OFFSET ?
    `, params);

    // Get total count
    const countParams = [studentId];
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total
      FROM student_notifications sn
      ${whereClause}
    `, countParams);

    const total = countResult.rows[0].total;

    const processedNotifications = notifications.rows.map(row => {
      try {
        return {
          ...row,
          recording_metadata: row.recording_metadata ? JSON.parse(row.recording_metadata) : {}
        };
      } catch (parseError) {
        console.error('Error parsing notification metadata:', parseError);
        return {
          ...row,
          recording_metadata: {}
        };
      }
    });

    res.json({
      success: true,
      notifications: processedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Student notifications error:', error);
    handleDatabaseError(error, res, 'טעינת ההתראות');
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticate, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { notificationId } = req.params;

    // Verify notification belongs to student
    const notification = await executeQuery(`
      SELECT id FROM student_notifications 
      WHERE id = ? AND student_id = ?
    `, [notificationId, studentId]);

    if (!notification.rows.length) {
      return res.status(404).json({
        error: 'התראה לא נמצאה',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    await run(`
      UPDATE student_notifications 
      SET is_read = 1, read_at = datetime('now')
      WHERE id = ? AND student_id = ?
    `, [notificationId, studentId]);

    res.json({
      success: true,
      message: 'התראה סומנה כנקראה'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    handleDatabaseError(error, res, 'עדכון ההתראה');
  }
});

module.exports = router;
