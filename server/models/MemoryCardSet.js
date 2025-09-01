const { query, run } = require('../config/database-sqlite');

class MemoryCardSet {
  constructor(setData) {
    this.id = setData.id;
    this.name = setData.name;
    this.description = setData.description;
    this.userId = setData.user_id;
    this.subjectArea = setData.subject_area;
    this.gradeLevel = setData.grade_level;
    this.isPublic = setData.is_public;
    this.totalCards = setData.total_cards || 0;
    this.createdAt = setData.created_at;
    this.updatedAt = setData.updated_at;
  }

  // Create a new memory card set
  static async create(setData) {
    const { 
      name, 
      description = null, 
      userId, 
      subjectArea = null, 
      gradeLevel = null,
      isPublic = false
    } = setData;

    // Validate required fields
    if (!name || !userId) {
      throw new Error('חסרים שדות חובה: שם הסט ומשתמש');
    }

    // Validate Hebrew text support
    if (typeof name !== 'string') {
      throw new Error('שם הסט חייב להיות מחרוזת');
    }

    const queryText = `
      INSERT INTO memory_card_sets (
        name, description, user_id, subject_area, grade_level, is_public
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [name, description, userId, subjectArea, gradeLevel, isPublic ? 1 : 0];

    try {
      const result = await run(queryText, values);
      
      // Get the created set
      const getSetQuery = 'SELECT * FROM memory_card_sets WHERE id = ?';
      const setResult = await query(getSetQuery, [result.lastID]);
      return new MemoryCardSet(setResult.rows[0]);
    } catch (error) {
      console.error('Error creating memory card set:', error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('סט עם שם זה כבר קיים');
      }
      throw new Error('שגיאה ביצירת סט כרטיסי זיכרון');
    }
  }

  // Find set by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM memory_card_sets WHERE id = ?';
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new MemoryCardSet(result.rows[0]);
  }

  // Get sets by user ID
  static async getByUserId(userId, options = {}) {
    const { 
      includePublic = false,
      subjectArea = null,
      gradeLevel = null,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      limit = null,
      offset = 0
    } = options;

    let queryText = `
      SELECT mcs.*, 
             u.first_name, u.last_name,
             COUNT(mc.id) as actual_card_count
      FROM memory_card_sets mcs
      LEFT JOIN users u ON mcs.user_id = u.id
      LEFT JOIN memory_cards mc ON mcs.id = mc.set_id AND mc.is_active = 1
      WHERE mcs.user_id = ?
    `;
    const values = [userId];

    if (includePublic) {
      queryText = queryText.replace('WHERE mcs.user_id = ?', 'WHERE (mcs.user_id = ? OR mcs.is_public = 1)');
    }

    if (subjectArea) {
      queryText += ' AND mcs.subject_area = ?';
      values.push(subjectArea);
    }

    if (gradeLevel) {
      queryText += ' AND mcs.grade_level = ?';
      values.push(gradeLevel);
    }

    queryText += ` GROUP BY mcs.id ORDER BY mcs.${orderBy} ${orderDirection}`;

    if (limit) {
      queryText += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => {
      const set = new MemoryCardSet(row);
      set.creatorName = `${row.first_name} ${row.last_name}`;
      set.actualCardCount = row.actual_card_count;
      return set;
    });
  }

  // Get public sets
  static async getPublicSets(options = {}) {
    const { 
      subjectArea = null,
      gradeLevel = null,
      userId = null, // to exclude user's own sets
      orderBy = 'created_at',
      orderDirection = 'DESC',
      limit = 20,
      offset = 0
    } = options;

    let queryText = `
      SELECT mcs.*, 
             u.first_name, u.last_name,
             COUNT(mc.id) as actual_card_count
      FROM memory_card_sets mcs
      LEFT JOIN users u ON mcs.user_id = u.id
      LEFT JOIN memory_cards mc ON mcs.id = mc.set_id AND mc.is_active = 1
      WHERE mcs.is_public = 1
    `;
    const values = [];

    if (userId) {
      queryText += ' AND mcs.user_id != ?';
      values.push(userId);
    }

    if (subjectArea) {
      queryText += ' AND mcs.subject_area = ?';
      values.push(subjectArea);
    }

    if (gradeLevel) {
      queryText += ' AND mcs.grade_level = ?';
      values.push(gradeLevel);
    }

    queryText += ` GROUP BY mcs.id HAVING actual_card_count > 0 ORDER BY mcs.${orderBy} ${orderDirection}`;

    if (limit) {
      queryText += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => {
      const set = new MemoryCardSet(row);
      set.creatorName = `${row.first_name} ${row.last_name}`;
      set.actualCardCount = row.actual_card_count;
      return set;
    });
  }

  // Update set
  async update(updateData) {
    const allowedFields = [
      'name', 'description', 'subject_area', 'grade_level', 'is_public'
    ];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        if (key === 'is_public') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const queryText = `
      UPDATE memory_card_sets 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await run(queryText, values);

    // Get updated set
    const getSetQuery = 'SELECT * FROM memory_card_sets WHERE id = ?';
    const setResult = await query(getSetQuery, [this.id]);
    return new MemoryCardSet(setResult.rows[0]);
  }

  // Delete set (and all its cards)
  async delete() {
    try {
      // First delete all cards in the set
      await run('DELETE FROM memory_cards WHERE set_id = ?', [this.id]);
      
      // Delete the set
      await run('DELETE FROM memory_card_sets WHERE id = ?', [this.id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting memory card set:', error);
      throw new Error('שגיאה במחיקת סט כרטיסי זיכרון');
    }
  }

  // Get set with cards
  async getWithCards(options = {}) {
    const { 
      includeInactive = false,
      orderBy = 'order_index',
      orderDirection = 'ASC'
    } = options;

    // Get the set details
    const setQuery = 'SELECT * FROM memory_card_sets WHERE id = ?';
    const setResult = await query(setQuery, [this.id]);
    
    if (setResult.rows.length === 0) {
      return null;
    }

    const set = new MemoryCardSet(setResult.rows[0]);

    // Get cards in the set
    let cardsQuery = `
      SELECT * FROM memory_cards 
      WHERE set_id = ?
    `;
    const values = [this.id];

    if (!includeInactive) {
      cardsQuery += ' AND is_active = 1';
    }

    cardsQuery += ` ORDER BY ${orderBy} ${orderDirection}`;

    const cardsResult = await query(cardsQuery, values);
    const MemoryCard = require('./MemoryCard');
    set.cards = cardsResult.rows.map(row => new MemoryCard(row));

    return set;
  }

  // Share set with classes
  async shareWithClasses(classIds, permissionType = 'view', grantedBy) {
    try {
      for (const classId of classIds) {
        await run(`
          INSERT OR REPLACE INTO memory_card_set_permissions 
          (set_id, class_id, permission_type, granted_by, is_active)
          VALUES (?, ?, ?, ?, 1)
        `, [this.id, classId, permissionType, grantedBy]);
      }
      return true;
    } catch (error) {
      console.error('Error sharing memory card set:', error);
      throw new Error('שגיאה בשיתוף סט כרטיסי זיכרון');
    }
  }

  // Get shared classes for this set
  async getSharedClasses() {
    const queryText = `
      SELECT c.*, mcp.permission_type, mcp.granted_at, mcp.expires_at,
             u.first_name as granted_by_first_name, u.last_name as granted_by_last_name
      FROM memory_card_set_permissions mcp
      JOIN classes c ON mcp.class_id = c.id
      JOIN users u ON mcp.granted_by = u.id
      WHERE mcp.set_id = ? AND mcp.is_active = 1
      ORDER BY mcp.granted_at DESC
    `;

    const result = await query(queryText, [this.id]);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      gradeLevel: row.grade_level,
      subjectArea: row.subject_area,
      permissionType: row.permission_type,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      grantedBy: `${row.granted_by_first_name} ${row.granted_by_last_name}`
    }));
  }

  // Get sets accessible to a student
  static async getAccessibleSets(studentId, options = {}) {
    const { 
      subjectArea = null,
      gradeLevel = null,
      permissionType = null,
      limit = 20,
      offset = 0
    } = options;

    let queryText = `
      SELECT DISTINCT mcs.*, 
             u.first_name, u.last_name,
             mcp.permission_type,
             COUNT(mc.id) as actual_card_count
      FROM memory_card_sets mcs
      JOIN memory_card_set_permissions mcp ON mcs.id = mcp.set_id
      JOIN class_memberships cm ON mcp.class_id = cm.class_id
      LEFT JOIN users u ON mcs.user_id = u.id
      LEFT JOIN memory_cards mc ON mcs.id = mc.set_id AND mc.is_active = 1
      WHERE cm.student_id = ? AND cm.is_active = 1 AND mcp.is_active = 1
      AND (mcp.expires_at IS NULL OR mcp.expires_at > datetime('now'))
    `;
    const values = [studentId];

    if (subjectArea) {
      queryText += ' AND mcs.subject_area = ?';
      values.push(subjectArea);
    }

    if (gradeLevel) {
      queryText += ' AND mcs.grade_level = ?';
      values.push(gradeLevel);
    }

    if (permissionType) {
      queryText += ' AND mcp.permission_type = ?';
      values.push(permissionType);
    }

    queryText += ` GROUP BY mcs.id HAVING actual_card_count > 0 ORDER BY mcs.created_at DESC`;

    if (limit) {
      queryText += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => {
      const set = new MemoryCardSet(row);
      set.creatorName = `${row.first_name} ${row.last_name}`;
      set.actualCardCount = row.actual_card_count;
      set.permissionType = row.permission_type;
      return set;
    });
  }

  // Search sets by name or description
  static async searchSets(searchTerm, userId = null, options = {}) {
    const { 
      includePublic = true,
      subjectArea = null,
      gradeLevel = null,
      limit = 20,
      offset = 0
    } = options;

    let queryText = `
      SELECT mcs.*, 
             u.first_name, u.last_name,
             COUNT(mc.id) as actual_card_count
      FROM memory_card_sets mcs
      LEFT JOIN users u ON mcs.user_id = u.id
      LEFT JOIN memory_cards mc ON mcs.id = mc.set_id AND mc.is_active = 1
      WHERE (mcs.name LIKE ? OR mcs.description LIKE ?)
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const values = [searchPattern, searchPattern];

    if (userId && includePublic) {
      queryText += ' AND (mcs.user_id = ? OR mcs.is_public = 1)';
      values.push(userId);
    } else if (userId) {
      queryText += ' AND mcs.user_id = ?';
      values.push(userId);
    } else if (includePublic) {
      queryText += ' AND mcs.is_public = 1';
    }

    if (subjectArea) {
      queryText += ' AND mcs.subject_area = ?';
      values.push(subjectArea);
    }

    if (gradeLevel) {
      queryText += ' AND mcs.grade_level = ?';
      values.push(gradeLevel);
    }

    queryText += ` GROUP BY mcs.id ORDER BY mcs.created_at DESC LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    const result = await query(queryText, values);
    return result.rows.map(row => {
      const set = new MemoryCardSet(row);
      set.creatorName = `${row.first_name} ${row.last_name}`;
      set.actualCardCount = row.actual_card_count;
      return set;
    });
  }

  // Get set statistics
  async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT mc.id) as total_cards,
        COUNT(DISTINCT CASE WHEN mc.is_active = 1 THEN mc.id END) as active_cards,
        COUNT(DISTINCT mcp.student_id) as unique_students,
        AVG(mcp.mastery_level) as avg_mastery_level,
        SUM(mcp.correct_attempts) as total_correct_attempts,
        SUM(mcp.incorrect_attempts) as total_incorrect_attempts
      FROM memory_cards mc
      LEFT JOIN memory_card_progress mcp ON mc.id = mcp.card_id
      WHERE mc.set_id = ?
    `;

    const result = await query(statsQuery, [this.id]);
    return result.rows[0] || {
      total_cards: 0,
      active_cards: 0,
      unique_students: 0,
      avg_mastery_level: 0,
      total_correct_attempts: 0,
      total_incorrect_attempts: 0
    };
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      userId: this.userId,
      subjectArea: this.subjectArea,
      gradeLevel: this.gradeLevel,
      isPublic: this.isPublic,
      totalCards: this.totalCards,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creatorName: this.creatorName || undefined,
      actualCardCount: this.actualCardCount || undefined,
      permissionType: this.permissionType || undefined,
      cards: this.cards ? this.cards.map(card => card.toJSON()) : undefined
    };
  }
}

module.exports = MemoryCardSet;
