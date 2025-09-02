const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query, run } = require('../config/database-sqlite');

// Get all summaries for a user (unified view)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      type, // 'all', 'manual', 'lesson', 'ai'
      subject, 
      grade, 
      public_only, 
      search,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let whereConditions = ['s.user_id = ?'];
    let queryParams = [userId];

    // Filter by summary type
    if (type && type !== 'all') {
      if (type === 'manual') {
        whereConditions.push(`summary_type = 'manual'`);
      } else if (type === 'lesson') {
        whereConditions.push(`summary_type = 'lesson'`);
      } else if (type === 'ai') {
        whereConditions.push(`summary_type = 'ai'`);
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

    // Filter by public only
    if (public_only === 'true') {
      whereConditions.push(`is_public = 1`);
    }

    // Search in title and content
    if (search) {
      whereConditions.push(`(title LIKE ? OR content LIKE ?)`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Validate sort parameters
    const validSortColumns = ['created_at', 'updated_at', 'title', 'subject_area', 'grade_level'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = validSortOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

    const summariesQuery = `
      SELECT 
        s.*,
        CASE 
          WHEN s.source_type = 'recording' AND s.source_id IS NOT NULL THEN 
            COALESCE(json_extract(r.metadata, '$.lessonName'), r.filename)
          ELSE NULL
        END as source_title
      FROM unified_summaries s
      LEFT JOIN recordings r ON s.source_type = 'recording' AND s.source_id = r.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY s.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(summariesQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM unified_summaries s
      LEFT JOIN recordings r ON s.source_type = 'recording' AND s.source_id = r.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = countResult.rows[0].total;

    res.json({
      success: true,
      summaries: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summaries',
      details: error.message
    });
  }
});

// Get summary statistics for a user
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_summaries,
        COUNT(CASE WHEN summary_type = 'manual' THEN 1 END) as manual_summaries,
        COUNT(CASE WHEN summary_type = 'lesson' THEN 1 END) as lesson_summaries,
        COUNT(CASE WHEN summary_type = 'ai' THEN 1 END) as ai_summaries,
        COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_summaries,
        COUNT(DISTINCT subject_area) as subjects_covered,
        COUNT(DISTINCT grade_level) as grade_levels_covered
      FROM unified_summaries 
      WHERE user_id = ?
    `;

    const result = await query(statsQuery, [userId]);
    
    res.json({
      success: true,
      ...result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching summary statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics',
      details: error.message
    });
  }
});

// Get a specific summary
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const summaryId = req.params.id;

    const summaryQuery = `
      SELECT s.*, 
        CASE 
          WHEN s.source_type = 'recording' AND s.source_id IS NOT NULL THEN 
            COALESCE(json_extract(r.metadata, '$.lessonName'), r.filename)
          ELSE NULL
        END as source_title
      FROM unified_summaries s
      LEFT JOIN recordings r ON s.source_type = 'recording' AND s.source_id = r.id
      WHERE s.id = ? AND (s.user_id = ? OR s.is_public = 1)
    `;

    const result = await query(summaryQuery, [summaryId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found or access denied'
      });
    }

    res.json({
      success: true,
      summary: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
      details: error.message
    });
  }
});

// Create a new manual summary
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      content,
      subject_area,
      grade_level,
      tags = [],
      is_public = false
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    if (title.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Title must be at least 3 characters long'
      });
    }

    if (content.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Content must be at least 10 characters long'
      });
    }

    const insertQuery = `
      INSERT INTO unified_summaries (
        user_id, title, content, summary_type, source_type,
        subject_area, grade_level, tags, is_public
      ) VALUES (?, ?, ?, 'manual', 'manual', ?, ?, ?, ?)
    `;

    const result = await run(insertQuery, [
      userId,
      title.trim(),
      content.trim(),
      subject_area || null,
      grade_level || null,
      JSON.stringify(tags),
      is_public ? 1 : 0
    ]);

    // Fetch the created summary
    const fetchQuery = `SELECT * FROM unified_summaries WHERE id = ?`;
    const fetchResult = await query(fetchQuery, [result.lastID]);

    res.status(201).json({
      success: true,
      summary: fetchResult.rows[0],
      message: 'Summary created successfully'
    });

  } catch (error) {
    console.error('Error creating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create summary',
      details: error.message
    });
  }
});

// Update an existing summary
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const summaryId = req.params.id;
    const {
      title,
      content,
      subject_area,
      grade_level,
      tags,
      is_public
    } = req.body;

    // Check if summary exists and belongs to user
    const checkQuery = `
      SELECT id, summary_type FROM unified_summaries 
      WHERE id = ? AND user_id = ?
    `;
    const checkResult = await query(checkQuery, [summaryId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found or access denied'
      });
    }

    // Only allow editing of manual summaries
    if (checkResult.rows[0].summary_type !== 'manual') {
      return res.status(403).json({
        success: false,
        error: 'Only manual summaries can be edited'
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

    if (content !== undefined) {
      if (content.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Content must be at least 10 characters long'
        });
      }
      updateFields.push('content = ?');
      updateValues.push(content.trim());
    }

    if (subject_area !== undefined) {
      updateFields.push('subject_area = ?');
      updateValues.push(subject_area || null);
    }

    if (grade_level !== undefined) {
      updateFields.push('grade_level = ?');
      updateValues.push(grade_level || null);
    }

    if (tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(tags));
    }

    if (is_public !== undefined) {
      updateFields.push('is_public = ?');
      updateValues.push(is_public ? 1 : 0);
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
    updateValues.push(summaryId, userId);

    const updateQuery = `
      UPDATE unified_summaries 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    await run(updateQuery, updateValues);

    // Fetch updated summary
    const fetchQuery = `SELECT * FROM unified_summaries WHERE id = ?`;
    const fetchResult = await query(fetchQuery, [summaryId]);

    res.json({
      success: true,
      summary: fetchResult.rows[0],
      message: 'Summary updated successfully'
    });

  } catch (error) {
    console.error('Error updating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update summary',
      details: error.message
    });
  }
});

// Delete a summary
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const summaryId = req.params.id;

    // Check if summary exists and belongs to user
    const checkQuery = `
      SELECT id, summary_type FROM unified_summaries 
      WHERE id = ? AND user_id = ?
    `;
    const checkResult = await query(checkQuery, [summaryId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found or access denied'
      });
    }

    // Only allow deletion of manual summaries
    if (checkResult.rows[0].summary_type !== 'manual') {
      return res.status(403).json({
        success: false,
        error: 'Only manual summaries can be deleted'
      });
    }

    const deleteQuery = `DELETE FROM unified_summaries WHERE id = ? AND user_id = ?`;
    await run(deleteQuery, [summaryId, userId]);

    res.json({
      success: true,
      message: 'Summary deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete summary',
      details: error.message
    });
  }
});

// Create lesson summary from AI content (internal API)
router.post('/lesson', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      recording_id,
      title,
      content,
      subject_area,
      grade_level,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!recording_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Recording ID, title, and content are required'
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

    // Check if lesson summary already exists for this recording
    const existingQuery = `
      SELECT id FROM unified_summaries 
      WHERE source_type = 'recording' AND source_id = ? AND summary_type = 'lesson'
    `;
    const existingResult = await query(existingQuery, [recording_id]);

    if (existingResult.rows.length > 0) {
      // Update existing lesson summary
      const updateQuery = `
        UPDATE unified_summaries 
        SET title = ?, content = ?, subject_area = ?, grade_level = ?, 
            metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await run(updateQuery, [
        title,
        content,
        subject_area,
        grade_level,
        JSON.stringify(metadata),
        existingResult.rows[0].id
      ]);

      // Fetch updated summary
      const fetchQuery = `SELECT * FROM unified_summaries WHERE id = ?`;
      const fetchResult = await query(fetchQuery, [existingResult.rows[0].id]);

      res.json({
        success: true,
        summary: fetchResult.rows[0],
        message: 'Lesson summary updated successfully'
      });
    } else {
      // Create new lesson summary
      const insertQuery = `
        INSERT INTO unified_summaries (
          user_id, title, content, summary_type, source_type, source_id,
          subject_area, grade_level, metadata
        ) VALUES (?, ?, ?, 'lesson', 'recording', ?, ?, ?, ?)
      `;

      const result = await run(insertQuery, [
        userId,
        title,
        content,
        recording_id,
        subject_area,
        grade_level,
        JSON.stringify(metadata)
      ]);

      // Fetch the created summary
      const fetchQuery = `SELECT * FROM unified_summaries WHERE id = ?`;
      const fetchResult = await query(fetchQuery, [result.lastID]);

      res.status(201).json({
        success: true,
        summary: fetchResult.rows[0],
        message: 'Lesson summary created successfully'
      });
    }

  } catch (error) {
    console.error('Error creating lesson summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lesson summary',
      details: error.message
    });
  }
});

module.exports = router;
