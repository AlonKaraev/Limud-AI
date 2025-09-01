const { query, run } = require('../config/database-sqlite');

class MemoryCard {
  constructor(cardData) {
    this.id = cardData.id;
    this.userId = cardData.user_id;
    this.setId = cardData.set_id;
    this.frontText = cardData.front_text;
    this.backText = cardData.back_text;
    this.cardType = cardData.card_type || 'text';
    this.difficultyLevel = cardData.difficulty_level || 'medium';
    this.tags = cardData.tags ? JSON.parse(cardData.tags) : [];
    this.isActive = cardData.is_active;
    this.orderIndex = cardData.order_index || 0;
    this.createdAt = cardData.created_at;
    this.updatedAt = cardData.updated_at;
  }

  // Create a new memory card
  static async create(cardData) {
    const { 
      userId, 
      setId, 
      frontText, 
      backText, 
      cardType = 'text', 
      difficultyLevel = 'medium',
      tags = [],
      orderIndex = 0
    } = cardData;

    // Validate required fields
    if (!userId || !setId || !frontText || !backText) {
      throw new Error('חסרים שדות חובה: משתמש, סט, טקסט קדמי וטקסט אחורי');
    }

    // Validate Hebrew text support
    if (typeof frontText !== 'string' || typeof backText !== 'string') {
      throw new Error('הטקסט הקדמי והאחורי חייבים להיות מחרוזות');
    }

    const queryText = `
      INSERT INTO memory_cards (
        user_id, set_id, front_text, back_text, card_type, 
        difficulty_level, tags, order_index
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId, 
      setId, 
      frontText, 
      backText, 
      cardType, 
      difficultyLevel,
      JSON.stringify(tags),
      orderIndex
    ];

    try {
      const result = await run(queryText, values);
      
      // Update total_cards count in the set
      await run(`
        UPDATE memory_card_sets 
        SET total_cards = (
          SELECT COUNT(*) FROM memory_cards 
          WHERE set_id = ? AND is_active = 1
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [setId, setId]);

      // Get the created card
      const getUserQuery = 'SELECT * FROM memory_cards WHERE id = ?';
      const cardResult = await query(getUserQuery, [result.lastID]);
      return new MemoryCard(cardResult.rows[0]);
    } catch (error) {
      console.error('Error creating memory card:', error);
      throw new Error('שגיאה ביצירת כרטיס זיכרון');
    }
  }

  // Find card by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM memory_cards WHERE id = ? AND is_active = 1';
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new MemoryCard(result.rows[0]);
  }

  // Get all cards in a set
  static async getBySetId(setId, options = {}) {
    const { 
      includeInactive = false, 
      orderBy = 'order_index',
      orderDirection = 'ASC',
      limit = null,
      offset = 0
    } = options;

    let queryText = `
      SELECT * FROM memory_cards 
      WHERE set_id = ?
    `;
    const values = [setId];

    if (!includeInactive) {
      queryText += ' AND is_active = 1';
    }

    queryText += ` ORDER BY ${orderBy} ${orderDirection}`;

    if (limit) {
      queryText += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => new MemoryCard(row));
  }

  // Get cards by user ID
  static async getByUserId(userId, options = {}) {
    const { 
      includeInactive = false,
      setId = null,
      cardType = null,
      difficultyLevel = null,
      limit = null,
      offset = 0
    } = options;

    let queryText = `
      SELECT mc.*, mcs.name as set_name 
      FROM memory_cards mc
      JOIN memory_card_sets mcs ON mc.set_id = mcs.id
      WHERE mc.user_id = ?
    `;
    const values = [userId];

    if (!includeInactive) {
      queryText += ' AND mc.is_active = 1';
    }

    if (setId) {
      queryText += ' AND mc.set_id = ?';
      values.push(setId);
    }

    if (cardType) {
      queryText += ' AND mc.card_type = ?';
      values.push(cardType);
    }

    if (difficultyLevel) {
      queryText += ' AND mc.difficulty_level = ?';
      values.push(difficultyLevel);
    }

    queryText += ' ORDER BY mc.created_at DESC';

    if (limit) {
      queryText += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => {
      const card = new MemoryCard(row);
      card.setName = row.set_name;
      return card;
    });
  }

  // Update card
  async update(updateData) {
    const allowedFields = [
      'front_text', 'back_text', 'card_type', 'difficulty_level', 
      'tags', 'order_index', 'is_active'
    ];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        if (key === 'tags') {
          values.push(JSON.stringify(value));
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
      UPDATE memory_cards 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await run(queryText, values);

    // Update total_cards count in the set if is_active changed
    if (updateData.is_active !== undefined) {
      await run(`
        UPDATE memory_card_sets 
        SET total_cards = (
          SELECT COUNT(*) FROM memory_cards 
          WHERE set_id = ? AND is_active = 1
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [this.setId, this.setId]);
    }

    // Get updated card
    const getUserQuery = 'SELECT * FROM memory_cards WHERE id = ?';
    const cardResult = await query(getUserQuery, [this.id]);
    return new MemoryCard(cardResult.rows[0]);
  }

  // Delete card (soft delete)
  async delete() {
    const queryText = `
      UPDATE memory_cards 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await run(queryText, [this.id]);

    // Update total_cards count in the set
    await run(`
      UPDATE memory_card_sets 
      SET total_cards = (
        SELECT COUNT(*) FROM memory_cards 
        WHERE set_id = ? AND is_active = 1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [this.setId, this.setId]);

    this.isActive = false;
    return this;
  }

  // Hard delete card (permanent)
  async hardDelete() {
    const queryText = 'DELETE FROM memory_cards WHERE id = ?';
    await run(queryText, [this.id]);

    // Update total_cards count in the set
    await run(`
      UPDATE memory_card_sets 
      SET total_cards = (
        SELECT COUNT(*) FROM memory_cards 
        WHERE set_id = ? AND is_active = 1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [this.setId, this.setId]);

    return true;
  }

  // Reorder cards in a set
  static async reorderCards(setId, cardOrders) {
    // cardOrders should be an array of {cardId, orderIndex}
    try {
      for (const { cardId, orderIndex } of cardOrders) {
        await run(`
          UPDATE memory_cards 
          SET order_index = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND set_id = ?
        `, [orderIndex, cardId, setId]);
      }
      return true;
    } catch (error) {
      console.error('Error reordering cards:', error);
      throw new Error('שגיאה בסידור מחדש של הכרטיסים');
    }
  }

  // Search cards by text content
  static async searchCards(userId, searchTerm, options = {}) {
    const { 
      setId = null,
      cardType = null,
      difficultyLevel = null,
      limit = 50,
      offset = 0
    } = options;

    let queryText = `
      SELECT mc.*, mcs.name as set_name 
      FROM memory_cards mc
      JOIN memory_card_sets mcs ON mc.set_id = mcs.id
      WHERE mc.user_id = ? AND mc.is_active = 1
      AND (mc.front_text LIKE ? OR mc.back_text LIKE ?)
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const values = [userId, searchPattern, searchPattern];

    if (setId) {
      queryText += ' AND mc.set_id = ?';
      values.push(setId);
    }

    if (cardType) {
      queryText += ' AND mc.card_type = ?';
      values.push(cardType);
    }

    if (difficultyLevel) {
      queryText += ' AND mc.difficulty_level = ?';
      values.push(difficultyLevel);
    }

    queryText += ' ORDER BY mc.created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const result = await query(queryText, values);
    return result.rows.map(row => {
      const card = new MemoryCard(row);
      card.setName = row.set_name;
      return card;
    });
  }

  // Get card statistics
  static async getCardStats(cardId) {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_attempts,
        SUM(correct_attempts) as total_correct,
        SUM(incorrect_attempts) as total_incorrect,
        AVG(mastery_level) as avg_mastery_level,
        COUNT(DISTINCT student_id) as unique_students
      FROM memory_card_progress 
      WHERE card_id = ?
    `;

    const result = await query(statsQuery, [cardId]);
    return result.rows[0] || {
      total_attempts: 0,
      total_correct: 0,
      total_incorrect: 0,
      avg_mastery_level: 0,
      unique_students: 0
    };
  }

  // Get all unique tags for a user
  static async getUserTags(userId) {
    const tagsQuery = `
      SELECT DISTINCT tags 
      FROM memory_cards 
      WHERE user_id = ? AND is_active = 1 AND tags IS NOT NULL AND tags != '[]'
    `;

    const result = await query(tagsQuery, [userId]);
    
    // Extract and flatten all tags
    const allTags = new Set();
    
    result.rows.forEach(row => {
      try {
        const tags = JSON.parse(row.tags);
        if (Array.isArray(tags)) {
          tags.forEach(tag => {
            if (tag && typeof tag === 'string' && tag.trim()) {
              allTags.add(tag.trim());
            }
          });
        }
      } catch (error) {
        console.error('Error parsing tags:', error, row.tags);
      }
    });

    // Convert Set to Array and sort alphabetically
    return Array.from(allTags).sort((a, b) => a.localeCompare(b, 'he'));
  }

  // Validate Hebrew text
  static validateHebrewText(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    // Check if text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text) || text.length > 0; // Allow non-Hebrew text too
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      setId: this.setId,
      frontText: this.frontText,
      backText: this.backText,
      cardType: this.cardType,
      difficultyLevel: this.difficultyLevel,
      tags: this.tags,
      isActive: this.isActive,
      orderIndex: this.orderIndex,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      setName: this.setName || undefined
    };
  }
}

module.exports = MemoryCard;
