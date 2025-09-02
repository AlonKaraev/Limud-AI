const express = require('express');
const router = express.Router();
const MemoryCard = require('../models/MemoryCard');
const MemoryCardSet = require('../models/MemoryCardSet');
const { authenticate } = require('../middleware/auth');
const CardGenerationService = require('../services/CardGenerationService');

// Apply authentication middleware to all routes
router.use(authenticate);

// =============================================================================
// MEMORY CARD SET ROUTES
// =============================================================================

// GET /api/memory-cards/sets/user/:userId - Get all sets for a user
router.get('/sets/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      includePublic = false, 
      subjectArea, 
      gradeLevel, 
      limit = 50, 
      offset = 0 
    } = req.query;

    // Verify user has access to this data
    if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לגשת לנתונים אלה' 
      });
    }

    const options = {
      includePublic: includePublic === 'true',
      subjectArea: subjectArea || null,
      gradeLevel: gradeLevel || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const sets = await MemoryCardSet.getByUserId(parseInt(userId), options);
    
    res.json({
      success: true,
      data: sets,
      count: sets.length
    });

  } catch (error) {
    console.error('Error fetching user sets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הסטים',
      error: error.message 
    });
  }
});

// POST /api/memory-cards/sets - Create a new memory card set
router.post('/sets', async (req, res) => {
  try {
    const { name, description, userId, subjectArea, gradeLevel, isPublic } = req.body;

    // Verify user has permission to create sets for this user
    if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה ליצור סטים עבור משתמש זה' 
      });
    }

    // Validate required fields
    if (!name || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'שם הסט ומזהה המשתמש הם שדות חובה' 
      });
    }

    const setData = {
      name: name.trim(),
      description: description ? description.trim() : null,
      userId: parseInt(userId),
      subjectArea: subjectArea ? subjectArea.trim() : null,
      gradeLevel: gradeLevel ? gradeLevel.trim() : null,
      isPublic: Boolean(isPublic)
    };

    const newSet = await MemoryCardSet.create(setData);
    
    res.status(201).json({
      success: true,
      message: 'הסט נוצר בהצלחה',
      data: newSet
    });

  } catch (error) {
    console.error('Error creating memory card set:', error);
    
    if (error.message.includes('סט עם שם זה כבר קיים')) {
      return res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת הסט',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/sets/:setId - Get a specific set with cards
router.get('/sets/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const { includeInactive = false } = req.query;

    const set = await MemoryCardSet.findById(parseInt(setId));
    
    if (!set) {
      return res.status(404).json({ 
        success: false, 
        message: 'הסט לא נמצא' 
      });
    }

    // Verify user has access to this set
    if (req.user.id !== set.userId && req.user.role !== 'principal' && !set.isPublic) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לגשת לסט זה' 
      });
    }

    const setWithCards = await set.getWithCards({
      includeInactive: includeInactive === 'true'
    });

    res.json({
      success: true,
      data: setWithCards
    });

  } catch (error) {
    console.error('Error fetching set:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הסט',
      error: error.message 
    });
  }
});

// PUT /api/memory-cards/sets/:setId - Update a memory card set
router.put('/sets/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const updateData = req.body;

    const set = await MemoryCardSet.findById(parseInt(setId));
    
    if (!set) {
      return res.status(404).json({ 
        success: false, 
        message: 'הסט לא נמצא' 
      });
    }

    // Verify user has permission to update this set
    if (req.user.id !== set.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לעדכן סט זה' 
      });
    }

    const updatedSet = await set.update(updateData);
    
    res.json({
      success: true,
      message: 'הסט עודכן בהצלחה',
      data: updatedSet
    });

  } catch (error) {
    console.error('Error updating set:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בעדכון הסט',
      error: error.message 
    });
  }
});

// DELETE /api/memory-cards/sets/:setId - Delete a memory card set
router.delete('/sets/:setId', async (req, res) => {
  try {
    const { setId } = req.params;

    const set = await MemoryCardSet.findById(parseInt(setId));
    
    if (!set) {
      return res.status(404).json({ 
        success: false, 
        message: 'הסט לא נמצא' 
      });
    }

    // Verify user has permission to delete this set
    if (req.user.id !== set.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה למחוק סט זה' 
      });
    }

    await set.delete();
    
    res.json({
      success: true,
      message: 'הסט נמחק בהצלחה'
    });

  } catch (error) {
    console.error('Error deleting set:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה במחיקת הסט',
      error: error.message 
    });
  }
});

// =============================================================================
// MEMORY CARD ROUTES
// =============================================================================

// POST /api/memory-cards - Create a new memory card
router.post('/', async (req, res) => {
  try {
    const { userId, setId, frontText, backText, cardType, difficultyLevel, tags } = req.body;

    // Verify user has permission to create cards for this user
    if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה ליצור כרטיסים עבור משתמש זה' 
      });
    }

    // Validate required fields
    if (!userId || !setId || !frontText || !backText) {
      return res.status(400).json({ 
        success: false, 
        message: 'חסרים שדות חובה: משתמש, סט, טקסט קדמי וטקסט אחורי' 
      });
    }

    // Verify the set exists and user has access
    const set = await MemoryCardSet.findById(parseInt(setId));
    if (!set) {
      return res.status(404).json({ 
        success: false, 
        message: 'הסט לא נמצא' 
      });
    }

    if (req.user.id !== set.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה להוסיף כרטיסים לסט זה' 
      });
    }

    const cardData = {
      userId: parseInt(userId),
      setId: parseInt(setId),
      frontText: frontText.trim(),
      backText: backText.trim(),
      cardType: cardType || 'text',
      difficultyLevel: difficultyLevel || 'medium',
      tags: Array.isArray(tags) ? tags : []
    };

    const newCard = await MemoryCard.create(cardData);
    
    res.status(201).json({
      success: true,
      message: 'הכרטיס נוצר בהצלחה',
      data: newCard
    });

  } catch (error) {
    console.error('Error creating memory card:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת הכרטיס',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/set/:setId - Get all cards in a set
router.get('/set/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const { 
      includeInactive = false, 
      orderBy = 'order_index', 
      orderDirection = 'ASC',
      limit = 100,
      offset = 0
    } = req.query;

    // Verify the set exists and user has access
    const set = await MemoryCardSet.findById(parseInt(setId));
    if (!set) {
      return res.status(404).json({ 
        success: false, 
        message: 'הסט לא נמצא' 
      });
    }

    if (req.user.id !== set.userId && req.user.role !== 'principal' && !set.isPublic) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לגשת לכרטיסים בסט זה' 
      });
    }

    const options = {
      includeInactive: includeInactive === 'true',
      orderBy,
      orderDirection,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const cards = await MemoryCard.getBySetId(parseInt(setId), options);
    
    res.json({
      success: true,
      data: cards,
      count: cards.length
    });

  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הכרטיסים',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/:cardId - Get a specific card
router.get('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await MemoryCard.findById(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'הכרטיס לא נמצא' 
      });
    }

    // Verify user has access to this card
    if (req.user.id !== card.userId && req.user.role !== 'principal') {
      // Check if card is in a public set
      const set = await MemoryCardSet.findById(card.setId);
      if (!set || !set.isPublic) {
        return res.status(403).json({ 
          success: false, 
          message: 'אין הרשאה לגשת לכרטיס זה' 
        });
      }
    }

    res.json({
      success: true,
      data: card
    });

  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הכרטיס',
      error: error.message 
    });
  }
});

// PUT /api/memory-cards/:cardId - Update a memory card
router.put('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const updateData = req.body;

    const card = await MemoryCard.findById(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'הכרטיס לא נמצא' 
      });
    }

    // Verify user has permission to update this card
    if (req.user.id !== card.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לעדכן כרטיס זה' 
      });
    }

    const updatedCard = await card.update(updateData);
    
    res.json({
      success: true,
      message: 'הכרטיס עודכן בהצלחה',
      data: updatedCard
    });

  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בעדכון הכרטיס',
      error: error.message 
    });
  }
});

// DELETE /api/memory-cards/:cardId - Delete a memory card (soft delete)
router.delete('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { hard = false } = req.query;

    const card = await MemoryCard.findById(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'הכרטיס לא נמצא' 
      });
    }

    // Verify user has permission to delete this card
    if (req.user.id !== card.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה למחוק כרטיס זה' 
      });
    }

    if (hard === 'true') {
      await card.hardDelete();
    } else {
      await card.delete();
    }
    
    res.json({
      success: true,
      message: 'הכרטיס נמחק בהצלחה'
    });

  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה במחיקת הכרטיס',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/user/:userId - Get all cards for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      setId, 
      cardType, 
      difficultyLevel, 
      limit = 50, 
      offset = 0 
    } = req.query;

    // Verify user has access to this data
    if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לגשת לנתונים אלה' 
      });
    }

    const options = {
      setId: setId ? parseInt(setId) : null,
      cardType: cardType || null,
      difficultyLevel: difficultyLevel || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const cards = await MemoryCard.getByUserId(parseInt(userId), options);
    
    res.json({
      success: true,
      data: cards,
      count: cards.length
    });

  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הכרטיסים',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/search/:userId - Search cards by text
router.get('/search/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      q: searchTerm, 
      setId, 
      cardType, 
      difficultyLevel, 
      limit = 20, 
      offset = 0 
    } = req.query;

    // Verify user has access to this data
    if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לחפש בנתונים אלה' 
      });
    }

    if (!searchTerm) {
      return res.status(400).json({ 
        success: false, 
        message: 'חסר מונח חיפוש' 
      });
    }

    const options = {
      setId: setId ? parseInt(setId) : null,
      cardType: cardType || null,
      difficultyLevel: difficultyLevel || null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const cards = await MemoryCard.searchCards(parseInt(userId), searchTerm, options);
    
    res.json({
      success: true,
      data: cards,
      count: cards.length,
      searchTerm
    });

  } catch (error) {
    console.error('Error searching cards:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בחיפוש כרטיסים',
      error: error.message 
    });
  }
});

// POST /api/memory-cards/reorder/:setId - Reorder cards in a set
router.post('/reorder/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const { cardOrders } = req.body;

    // Verify the set exists and user has access
    const set = await MemoryCardSet.findById(parseInt(setId));
    if (!set) {
      return res.status(404).json({ 
        success: false, 
        message: 'הסט לא נמצא' 
      });
    }

    if (req.user.id !== set.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לסדר מחדש כרטיסים בסט זה' 
      });
    }

    if (!Array.isArray(cardOrders)) {
      return res.status(400).json({ 
        success: false, 
        message: 'נתוני הסידור לא תקינים' 
      });
    }

    await MemoryCard.reorderCards(parseInt(setId), cardOrders);
    
    res.json({
      success: true,
      message: 'הכרטיסים סודרו מחדש בהצלחה'
    });

  } catch (error) {
    console.error('Error reordering cards:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בסידור מחדש של הכרטיסים',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/stats/:cardId - Get card statistics
router.get('/stats/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await MemoryCard.findById(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'הכרטיס לא נמצא' 
      });
    }

    // Verify user has access to this card's stats
    if (req.user.id !== card.userId && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לגשת לסטטיסטיקות של כרטיס זה' 
      });
    }

    const stats = await MemoryCard.getCardStats(parseInt(cardId));
    
    res.json({
      success: true,
      data: {
        cardId: parseInt(cardId),
        ...stats
      }
    });

  } catch (error) {
    console.error('Error fetching card stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת סטטיסטיקות הכרטיס',
      error: error.message 
    });
  }
});

// GET /api/memory-cards/tags/user/:userId - Get all unique tags for a user
router.get('/tags/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user has access to this data
    if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לגשת לנתונים אלה' 
      });
    }

    const tags = await MemoryCard.getUserTags(parseInt(userId));
    
    res.json({
      success: true,
      data: tags,
      count: tags.length
    });

  } catch (error) {
    console.error('Error fetching user tags:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת התגיות',
      error: error.message 
    });
  }
});

// =============================================================================
// AI CARD GENERATION ROUTES
// =============================================================================

// POST /api/memory-cards/generate - Generate cards from text input
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, config = {} } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'נדרש טקסט של לפחות 100 תווים ליצירת כרטיסים איכותיים',
        code: 'INSUFFICIENT_TEXT'
      });
    }

    // Generate cards from text
    const result = await CardGenerationService.generateCardsFromText({
      text: text.trim(),
      userId,
      config
    });

    res.json({
      success: true,
      message: 'כרטיסים נוצרו בהצלחה',
      ...result
    });

  } catch (error) {
    console.error('Error generating cards from text:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה ביצירת כרטיסים מטקסט',
      code: 'CARD_GENERATION_ERROR'
    });
  }
});

// POST /api/memory-cards/generate/from-lesson/:recordingId - Generate cards from lesson
router.post('/generate/from-lesson/:recordingId', async (req, res) => {
  try {
    const userId = req.user.id;
    const recordingId = parseInt(req.params.recordingId);
    const { config = {} } = req.body;

    // Validate recording ID
    if (!recordingId || isNaN(recordingId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה הקלטה לא תקין',
        code: 'INVALID_RECORDING_ID'
      });
    }

    // Generate cards from lesson
    const result = await CardGenerationService.generateCardsFromLesson({
      recordingId,
      userId,
      config
    });

    res.json({
      success: true,
      message: 'כרטיסים נוצרו בהצלחה מהשיעור',
      ...result
    });

  } catch (error) {
    console.error('Error generating cards from lesson:', error);
    
    // Handle specific error cases
    if (error.message.includes('לא נמצא תמליל')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'TRANSCRIPTION_NOT_FOUND'
      });
    }
    
    if (error.message.includes('התמליל קצר מדי')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'TRANSCRIPTION_TOO_SHORT'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה ביצירת כרטיסים מהשיעור',
      code: 'LESSON_CARD_GENERATION_ERROR'
    });
  }
});

// POST /api/memory-cards/generate/approve/:jobId - Approve and save generated cards
router.post('/generate/approve/:jobId', async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = parseInt(req.params.jobId);
    const { setId, approvedCards, setName, setDescription } = req.body;

    // Validate input
    if (!jobId || isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה משימה לא תקין',
        code: 'INVALID_JOB_ID'
      });
    }

    if (!approvedCards || !Array.isArray(approvedCards) || approvedCards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'לא נבחרו כרטיסים לאישור',
        code: 'NO_CARDS_SELECTED'
      });
    }

    let targetSetId = setId;

    // Get job details to determine if this is a lesson-generated set
    const { query } = require('../config/database-sqlite');
    const jobResult = await query(`
      SELECT * FROM card_generation_jobs 
      WHERE id = ? AND user_id = ?
    `, [jobId, userId]);

    const job = jobResult.rows[0];
    const isLessonGenerated = job && job.recording_id;

    // Create new set if needed
    if (!targetSetId && setName) {
      const setData = {
        name: setName.trim(),
        description: setDescription ? setDescription.trim() : null,
        userId,
        subjectArea: approvedCards[0]?.metadata?.generationConfig?.subjectArea || null,
        gradeLevel: approvedCards[0]?.metadata?.generationConfig?.gradeLevel || null,
        isPublic: false
      };

      // Add unified fields for lesson-generated sets
      if (isLessonGenerated) {
        const generationConfig = job.generation_config ? JSON.parse(job.generation_config) : {};
        setData.setType = 'lesson_generated';
        setData.sourceType = 'recording';
        setData.sourceId = job.recording_id;
        setData.difficultyLevel = generationConfig.difficultyLevel || 'medium';
        setData.aiProvider = generationConfig.provider || 'openai';
        setData.modelVersion = generationConfig.model || 'gpt-3.5-turbo';
        setData.confidenceScore = 0.8;
        setData.processingMetadata = generationConfig;
        setData.tags = ['lesson', setData.subjectArea].filter(Boolean);
      }

      const newSet = await MemoryCardSet.create(setData);
      targetSetId = newSet.id;
    }

    if (!targetSetId) {
      return res.status(400).json({
        success: false,
        message: 'נדרש מזהה סט או שם לסט חדש',
        code: 'SET_REQUIRED'
      });
    }

    // Verify user has access to the target set
    const targetSet = await MemoryCardSet.findById(targetSetId);
    if (!targetSet) {
      return res.status(404).json({
        success: false,
        message: 'הסט לא נמצא',
        code: 'SET_NOT_FOUND'
      });
    }

    if (targetSet.userId !== userId && req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'אין הרשאה להוסיף כרטיסים לסט זה',
        code: 'SET_ACCESS_DENIED'
      });
    }

    // Save approved cards to the set
    const savedCards = [];
    for (let i = 0; i < approvedCards.length; i++) {
      const card = approvedCards[i];
      
      const cardData = {
        userId,
        setId: targetSetId,
        frontText: card.frontText.trim(),
        backText: card.backText.trim(),
        cardType: card.cardType || 'text',
        difficultyLevel: card.difficultyLevel || 'medium',
        tags: Array.isArray(card.tags) ? card.tags : [],
        orderIndex: i
      };

      const savedCard = await MemoryCard.create(cardData);
      savedCards.push(savedCard);
    }

    // Update set card count
    await targetSet.update({
      totalCards: targetSet.totalCards + savedCards.length
    });

    res.json({
      success: true,
      message: `${savedCards.length} כרטיסים נשמרו בהצלחה`,
      data: {
        setId: targetSetId,
        setName: targetSet.name,
        cardsAdded: savedCards.length,
        cards: savedCards
      }
    });

  } catch (error) {
    console.error('Error approving generated cards:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשמירת הכרטיסים',
      code: 'CARD_APPROVAL_ERROR',
      error: error.message
    });
  }
});

// GET /api/memory-cards/generate/job/:jobId - Get generation job status
router.get('/generate/job/:jobId', async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = parseInt(req.params.jobId);

    if (!jobId || isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה משימה לא תקין',
        code: 'INVALID_JOB_ID'
      });
    }

    // Get job status from CardGenerationService
    const { query } = require('../config/database-sqlite');
    const result = await query(`
      SELECT * FROM card_generation_jobs 
      WHERE id = ? AND user_id = ?
    `, [jobId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה',
        code: 'JOB_NOT_FOUND'
      });
    }

    const job = result.rows[0];
    const jobData = {
      ...job,
      generation_config: JSON.parse(job.generation_config || '{}'),
      result_metadata: JSON.parse(job.result_metadata || '{}')
    };

    res.json({
      success: true,
      data: jobData
    });

  } catch (error) {
    console.error('Error fetching generation job:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת סטטוס המשימה',
      code: 'JOB_STATUS_ERROR',
      error: error.message
    });
  }
});

// GET /api/memory-cards/generate/stats - Get generation statistics
router.get('/generate/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await CardGenerationService.getGenerationStats(userId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching generation stats:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת סטטיסטיקות יצירה',
      code: 'STATS_ERROR',
      error: error.message
    });
  }
});

// DELETE /api/memory-cards/generate/job/:jobId - Cancel generation job
router.delete('/generate/job/:jobId', async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = parseInt(req.params.jobId);

    if (!jobId || isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה משימה לא תקין',
        code: 'INVALID_JOB_ID'
      });
    }

    // Cancel the job
    const { run } = require('../config/database-sqlite');
    const result = await run(`
      UPDATE card_generation_jobs 
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ? AND user_id = ? AND status IN ('pending', 'processing')
    `, [jobId, userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'משימה לא נמצאה או לא ניתן לביטול',
        code: 'JOB_NOT_CANCELLABLE'
      });
    }

    res.json({
      success: true,
      message: 'המשימה בוטלה בהצלחה'
    });

  } catch (error) {
    console.error('Error cancelling generation job:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בביטול המשימה',
      code: 'JOB_CANCEL_ERROR',
      error: error.message
    });
  }
});

module.exports = router;
