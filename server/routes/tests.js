const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query, run } = require('../config/database-sqlite');

// Get all tests for a user (unified view)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      type, // 'all', 'manual', 'lesson', 'ai'
      subject, 
      grade, 
      status,
      public_only, 
      search,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let whereConditions = ['t.user_id = ?'];
    let queryParams = [userId];

    // Filter by test type
    if (type && type !== 'all') {
      if (type === 'manual') {
        whereConditions.push(`test_type = 'manual'`);
      } else if (type === 'lesson') {
        whereConditions.push(`test_type = 'lesson_generated'`);
      } else if (type === 'ai') {
        whereConditions.push(`test_type = 'ai_generated'`);
      }
    }

    // Filter by subject area
    if (subject) {
      whereConditions.push(`subject_area LIKE ?`);
      queryParams.push(`%${subject}%`);
    }

    // Filter by grade level
    if (grade) {
      whereConditions.push(`grade_level = ?`);
      queryParams.push(grade);
    }

    // Filter by status
    if (status) {
      whereConditions.push(`status = ?`);
      queryParams.push(status);
    }

    // Filter by public only
    if (public_only === 'true') {
      whereConditions.push(`is_public = 1`);
    }

    // Search in title and description
    if (search) {
      whereConditions.push(`(title LIKE ? OR description LIKE ?)`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Validate sort parameters
    const validSortColumns = ['created_at', 'updated_at', 'title', 'subject_area', 'grade_level', 'status'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = validSortOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

    const testsQuery = `
      SELECT 
        t.*,
        CASE 
          WHEN t.source_type = 'recording' AND t.source_id IS NOT NULL THEN 
            COALESCE(json_extract(r.metadata, '$.lessonName'), r.filename)
          ELSE NULL
        END as source_title
      FROM tests t
      LEFT JOIN recordings r ON t.source_type = 'recording' AND t.source_id = r.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY t.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(testsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tests t
      LEFT JOIN recordings r ON t.source_type = 'recording' AND t.source_id = r.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = countResult.rows[0].total;

    res.json({
      success: true,
      tests: result.rows.map(test => ({
        ...test,
        tags: test.tags ? JSON.parse(test.tags) : [],
        learning_objectives: test.learning_objectives ? JSON.parse(test.learning_objectives) : [],
        processing_metadata: test.processing_metadata ? JSON.parse(test.processing_metadata) : {},
        shared_with: test.shared_with ? JSON.parse(test.shared_with) : []
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tests',
      details: error.message
    });
  }
});

// Get test statistics for a user
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN test_type = 'manual' THEN 1 END) as manual_tests,
        COUNT(CASE WHEN test_type = 'lesson_generated' THEN 1 END) as lesson_tests,
        COUNT(CASE WHEN test_type = 'ai_generated' THEN 1 END) as ai_tests,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tests,
        COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_tests,
        SUM(question_count) as total_questions,
        COUNT(DISTINCT subject_area) as subjects_covered,
        COUNT(DISTINCT grade_level) as grade_levels_covered
      FROM tests 
      WHERE user_id = ?
    `;

    const result = await query(statsQuery, [userId]);
    
    res.json({
      success: true,
      ...result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching test statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test statistics',
      details: error.message
    });
  }
});

// Get a specific test with questions
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const testId = req.params.id;

    const testQuery = `
      SELECT t.*, 
        CASE 
          WHEN t.source_type = 'recording' AND t.source_id IS NOT NULL THEN 
            COALESCE(json_extract(r.metadata, '$.lessonName'), r.filename)
          ELSE NULL
        END as source_title
      FROM tests t
      LEFT JOIN recordings r ON t.source_type = 'recording' AND t.source_id = r.id
      WHERE t.id = ? AND (t.user_id = ? OR t.is_public = 1)
    `;

    const result = await query(testQuery, [testId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Test not found or access denied'
      });
    }

    const test = result.rows[0];

    // Get questions for this test
    const questionsQuery = `
      SELECT 
        tq.*
      FROM test_questions tq
      WHERE tq.test_id = ?
      ORDER BY tq.order_index ASC, tq.created_at ASC
    `;

    const questionsResult = await query(questionsQuery, [testId]);

    // Get options for each question
    const questions = [];
    for (const question of questionsResult.rows) {
      const optionsQuery = `
        SELECT 
          option_text,
          is_correct,
          explanation,
          option_order
        FROM test_question_options
        WHERE question_id = ?
        ORDER BY option_order ASC
      `;

      const optionsResult = await query(optionsQuery, [question.id]);

      questions.push({
        ...question,
        metadata: question.metadata ? JSON.parse(question.metadata) : {},
        tags: question.tags ? JSON.parse(question.tags) : [],
        options: optionsResult.rows || []
      });
    }

    res.json({
      success: true,
      test: {
        ...test,
        tags: test.tags ? JSON.parse(test.tags) : [],
        learning_objectives: test.learning_objectives ? JSON.parse(test.learning_objectives) : [],
        processing_metadata: test.processing_metadata ? JSON.parse(test.processing_metadata) : {},
        shared_with: test.shared_with ? JSON.parse(test.shared_with) : [],
        questions
      }
    });

  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test',
      details: error.message
    });
  }
});

// Create a new manual test
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      subject_area,
      grade_level,
      time_limit = 0,
      passing_score = 60,
      tags = [],
      difficulty_level = 'medium',
      learning_objectives = [],
      allow_retakes = true,
      shuffle_questions = false,
      shuffle_answers = false,
      show_results_immediately = true,
      is_public = false,
      questions = []
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    if (title.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Title must be at least 3 characters long'
      });
    }

    const insertTestQuery = `
      INSERT INTO tests (
        user_id, title, description, test_type, source_type,
        subject_area, grade_level, time_limit, passing_score,
        tags, difficulty_level, learning_objectives,
        allow_retakes, shuffle_questions, shuffle_answers, show_results_immediately,
        is_public, question_count, status
      ) VALUES (?, ?, ?, 'manual', 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `;

    const result = await run(insertTestQuery, [
      userId,
      title.trim(),
      description ? description.trim() : null,
      subject_area || null,
      grade_level || null,
      parseInt(time_limit) || 0,
      parseInt(passing_score) || 60,
      JSON.stringify(tags),
      difficulty_level || 'medium',
      JSON.stringify(learning_objectives),
      allow_retakes ? 1 : 0,
      shuffle_questions ? 1 : 0,
      shuffle_answers ? 1 : 0,
      show_results_immediately ? 1 : 0,
      is_public ? 1 : 0,
      questions.length
    ]);

    const testId = result.lastID;

    // Add questions if provided
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        const insertQuestionQuery = `
          INSERT INTO test_questions (
            test_id, question_text, question_type, difficulty_level,
            points, order_index, correct_answer, explanation,
            metadata, tags, ai_generated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const questionResult = await run(insertQuestionQuery, [
          testId,
          question.question_text,
          question.question_type || 'multiple_choice',
          question.difficulty_level || difficulty_level,
          question.points || 1,
          i,
          question.correct_answer || null,
          question.explanation || null,
          JSON.stringify(question.metadata || {}),
          JSON.stringify(question.tags || [])
        ]);

        const questionId = questionResult.lastID;

        // Add options if it's a multiple choice question
        if (question.options && question.options.length > 0) {
          for (let j = 0; j < question.options.length; j++) {
            const option = question.options[j];
            
            const insertOptionQuery = `
              INSERT INTO test_question_options (
                question_id, option_text, is_correct, explanation, option_order
              ) VALUES (?, ?, ?, ?, ?)
            `;

            await run(insertOptionQuery, [
              questionId,
              option.option_text,
              option.is_correct ? 1 : 0,
              option.explanation || null,
              j
            ]);
          }
        }
      }
    }

    // Fetch the created test
    const fetchQuery = `SELECT * FROM tests WHERE id = ?`;
    const fetchResult = await query(fetchQuery, [testId]);

    res.status(201).json({
      success: true,
      test: {
        ...fetchResult.rows[0],
        tags: JSON.parse(fetchResult.rows[0].tags || '[]'),
        learning_objectives: JSON.parse(fetchResult.rows[0].learning_objectives || '[]')
      },
      message: 'Test created successfully'
    });

  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test',
      details: error.message
    });
  }
});

// Update an existing test
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const testId = req.params.id;
    const {
      title,
      description,
      subject_area,
      grade_level,
      time_limit,
      passing_score,
      tags,
      difficulty_level,
      learning_objectives,
      allow_retakes,
      shuffle_questions,
      shuffle_answers,
      show_results_immediately,
      is_public,
      status
    } = req.body;

    // Check if test exists and belongs to user
    const checkQuery = `
      SELECT id, test_type FROM tests 
      WHERE id = ? AND user_id = ?
    `;
    const checkResult = await query(checkQuery, [testId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Test not found or access denied'
      });
    }

    // Only allow editing of manual tests
    if (checkResult.rows[0].test_type !== 'manual') {
      return res.status(403).json({
        success: false,
        error: 'Only manual tests can be edited'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      if (title.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Title must be at least 3 characters long'
        });
      }
      updateFields.push('title = ?');
      updateValues.push(title.trim());
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description ? description.trim() : null);
    }

    if (subject_area !== undefined) {
      updateFields.push('subject_area = ?');
      updateValues.push(subject_area || null);
    }

    if (grade_level !== undefined) {
      updateFields.push('grade_level = ?');
      updateValues.push(grade_level || null);
    }

    if (time_limit !== undefined) {
      updateFields.push('time_limit = ?');
      updateValues.push(parseInt(time_limit) || 0);
    }

    if (passing_score !== undefined) {
      updateFields.push('passing_score = ?');
      updateValues.push(parseInt(passing_score) || 60);
    }

    if (tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(tags));
    }

    if (difficulty_level !== undefined) {
      updateFields.push('difficulty_level = ?');
      updateValues.push(difficulty_level);
    }

    if (learning_objectives !== undefined) {
      updateFields.push('learning_objectives = ?');
      updateValues.push(JSON.stringify(learning_objectives));
    }

    if (allow_retakes !== undefined) {
      updateFields.push('allow_retakes = ?');
      updateValues.push(allow_retakes ? 1 : 0);
    }

    if (shuffle_questions !== undefined) {
      updateFields.push('shuffle_questions = ?');
      updateValues.push(shuffle_questions ? 1 : 0);
    }

    if (shuffle_answers !== undefined) {
      updateFields.push('shuffle_answers = ?');
      updateValues.push(shuffle_answers ? 1 : 0);
    }

    if (show_results_immediately !== undefined) {
      updateFields.push('show_results_immediately = ?');
      updateValues.push(show_results_immediately ? 1 : 0);
    }

    if (is_public !== undefined) {
      updateFields.push('is_public = ?');
      updateValues.push(is_public ? 1 : 0);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Add WHERE clause parameters
    updateValues.push(testId, userId);

    const updateQuery = `
      UPDATE tests 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    await run(updateQuery, updateValues);

    // Fetch updated test
    const fetchQuery = `SELECT * FROM tests WHERE id = ?`;
    const fetchResult = await query(fetchQuery, [testId]);

    res.json({
      success: true,
      test: {
        ...fetchResult.rows[0],
        tags: JSON.parse(fetchResult.rows[0].tags || '[]'),
        learning_objectives: JSON.parse(fetchResult.rows[0].learning_objectives || '[]')
      },
      message: 'Test updated successfully'
    });

  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update test',
      details: error.message
    });
  }
});

// Delete a test
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const testId = req.params.id;

    // Check if test exists and belongs to user
    const checkQuery = `
      SELECT id, test_type FROM tests 
      WHERE id = ? AND user_id = ?
    `;
    const checkResult = await query(checkQuery, [testId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Test not found or access denied'
      });
    }

    // Only allow deletion of manual tests
    if (checkResult.rows[0].test_type !== 'manual') {
      return res.status(403).json({
        success: false,
        error: 'Only manual tests can be deleted'
      });
    }

    // Delete test (cascade will handle questions and options)
    const deleteQuery = `DELETE FROM tests WHERE id = ? AND user_id = ?`;
    await run(deleteQuery, [testId, userId]);

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete test',
      details: error.message
    });
  }
});

// Create lesson test from AI content (internal API)
router.post('/lesson', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      recording_id,
      title,
      description,
      subject_area,
      grade_level,
      questions = [],
      time_limit = 0,
      difficulty_level = 'medium',
      learning_objectives = [],
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!recording_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'Recording ID and title are required'
      });
    }

    // Check if recording exists and belongs to user
    const recordingQuery = `SELECT id FROM recordings WHERE id = ? AND user_id = ?`;
    const recordingResult = await query(recordingQuery, [recording_id, userId]);

    if (recordingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found or access denied'
      });
    }

    // Check if lesson test already exists for this recording
    const existingQuery = `
      SELECT id FROM tests 
      WHERE source_type = 'recording' AND source_id = ? AND test_type = 'lesson_generated'
    `;
    const existingResult = await query(existingQuery, [recording_id]);

    if (existingResult.rows.length > 0) {
      // Update existing lesson test
      const updateQuery = `
        UPDATE tests 
        SET title = ?, description = ?, subject_area = ?, grade_level = ?, 
            question_count = ?, time_limit = ?, difficulty_level = ?,
            learning_objectives = ?, processing_metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await run(updateQuery, [
        title,
        description,
        subject_area,
        grade_level,
        questions.length,
        time_limit,
        difficulty_level,
        JSON.stringify(learning_objectives),
        JSON.stringify(metadata),
        existingResult.rows[0].id
      ]);

      // Delete existing questions and add new ones
      await run('DELETE FROM test_questions WHERE test_id = ?', [existingResult.rows[0].id]);

      // Add new questions
      await addQuestionsToTest(existingResult.rows[0].id, questions, difficulty_level);

      // Fetch updated test
      const fetchQuery = `SELECT * FROM tests WHERE id = ?`;
      const fetchResult = await query(fetchQuery, [existingResult.rows[0].id]);

      res.json({
        success: true,
        test: {
          ...fetchResult.rows[0],
          tags: JSON.parse(fetchResult.rows[0].tags || '[]'),
          learning_objectives: JSON.parse(fetchResult.rows[0].learning_objectives || '[]')
        },
        message: 'Lesson test updated successfully'
      });
    } else {
      // Create new lesson test
      const insertQuery = `
        INSERT INTO tests (
          user_id, title, description, test_type, source_type, source_id,
          subject_area, grade_level, question_count, time_limit, difficulty_level,
          learning_objectives, processing_metadata, tags, status
        ) VALUES (?, ?, ?, 'lesson_generated', 'recording', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      `;

      const result = await run(insertQuery, [
        userId,
        title,
        description,
        recording_id,
        subject_area,
        grade_level,
        questions.length,
        time_limit,
        difficulty_level,
        JSON.stringify(learning_objectives),
        JSON.stringify(metadata),
        JSON.stringify(['lesson', subject_area || 'general'].filter(Boolean))
      ]);

      const testId = result.lastID;

      // Add questions
      await addQuestionsToTest(testId, questions, difficulty_level);

      // Fetch the created test
      const fetchQuery = `SELECT * FROM tests WHERE id = ?`;
      const fetchResult = await query(fetchQuery, [testId]);

      res.status(201).json({
        success: true,
        test: {
          ...fetchResult.rows[0],
          tags: JSON.parse(fetchResult.rows[0].tags || '[]'),
          learning_objectives: JSON.parse(fetchResult.rows[0].learning_objectives || '[]')
        },
        message: 'Lesson test created successfully'
      });
    }

  } catch (error) {
    console.error('Error creating lesson test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lesson test',
      details: error.message
    });
  }
});

// Helper function to add questions to a test
async function addQuestionsToTest(testId, questions, defaultDifficulty = 'medium') {
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    const insertQuestionQuery = `
      INSERT INTO test_questions (
        test_id, question_text, question_type, difficulty_level,
        points, order_index, correct_answer, explanation,
        metadata, tags, ai_generated, ai_provider, confidence_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;

    const questionResult = await run(insertQuestionQuery, [
      testId,
      question.question_text,
      question.question_type || 'multiple_choice',
      question.difficulty_level || defaultDifficulty,
      question.points || 1,
      i,
      question.correct_answer || null,
      question.explanation || null,
      JSON.stringify(question.metadata || {}),
      JSON.stringify(question.tags || []),
      question.ai_provider || 'openai',
      question.confidence_score || 0.0
    ]);

    const questionId = questionResult.lastID;

    // Add options if provided
    if (question.options && question.options.length > 0) {
      for (let j = 0; j < question.options.length; j++) {
        const option = question.options[j];
        
        const insertOptionQuery = `
          INSERT INTO test_question_options (
            question_id, option_text, is_correct, explanation, option_order
          ) VALUES (?, ?, ?, ?, ?)
        `;

        await run(insertOptionQuery, [
          questionId,
          option.option_text,
          option.is_correct ? 1 : 0,
          option.explanation || null,
          j
        ]);
      }
    }
  }
}

module.exports = router;
