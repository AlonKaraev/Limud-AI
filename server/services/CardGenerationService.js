const { AI_PROVIDERS, openaiClient, MODEL_CONFIGS } = require('../config/ai-services');
const { run, query } = require('../config/database-sqlite');
const TranscriptionService = require('./TranscriptionService');

/**
 * AI Card Generation Service
 * Generates memory cards from lesson transcriptions using AI
 */
class CardGenerationService {
  constructor() {
    this.defaultProvider = AI_PROVIDERS.OPENAI;
    this.maxCardsPerGeneration = 20;
    this.minTextLength = 50; // Reduced minimum for basic generation
    this.recommendedTextLength = 200; // Recommended length for quality cards
  }

  /**
   * Generate memory cards from transcription text
   * @param {Object} options - Generation options
   * @param {string} options.text - Source text for card generation
   * @param {number} options.userId - User ID
   * @param {number} options.recordingId - Recording ID (optional)
   * @param {Object} options.config - Generation configuration
   * @returns {Promise<Object>} Generated cards result
   */
  async generateCardsFromText(options) {
    const {
      text,
      userId,
      recordingId = null,
      config = {}
    } = options;

    try {
      // Validate input
      const trimmedText = text ? text.trim() : '';
      
      if (!trimmedText) {
        throw new Error('לא סופק טקסט ליצירת כרטיסים.');
      }
      
      if (trimmedText.length < this.minTextLength) {
        throw new Error(`הטקסט קצר מדי ליצירת כרטיסים איכותיים. נדרש טקסט של לפחות ${this.minTextLength} תווים. הטקסט הנוכחי: ${trimmedText.length} תווים.`);
      }

      // Prepare generation configuration
      const generationConfig = {
        cardCount: Math.min(config.cardCount || 10, this.maxCardsPerGeneration),
        difficultyLevel: config.difficultyLevel || 'medium',
        subjectArea: config.subjectArea || 'כללי',
        gradeLevel: config.gradeLevel || 'כיתות ד-ו',
        language: config.language || 'hebrew',
        cardType: config.cardType || 'question_answer',
        provider: config.aiProvider || this.defaultProvider
      };

      // Create processing job
      const job = await this.createGenerationJob({
        userId,
        recordingId,
        textLength: text.length,
        config: generationConfig
      });

      // Generate cards using AI
      const generatedCards = await this.callAIForCardGeneration(text, generationConfig);

      // Process and validate generated cards
      const processedCards = await this.processGeneratedCards(generatedCards, {
        userId,
        recordingId,
        config: generationConfig
      });

      // Update job status
      await this.updateJobStatus(job.id, 'completed', {
        cardsGenerated: processedCards.length
      });

      // Log generation for analytics
      await this.logCardGeneration({
        jobId: job.id,
        userId,
        recordingId,
        cardsGenerated: processedCards.length,
        provider: generationConfig.provider,
        config: generationConfig
      });

      return {
        success: true,
        jobId: job.id,
        cards: processedCards,
        metadata: {
          sourceTextLength: text.length,
          cardsGenerated: processedCards.length,
          provider: generationConfig.provider,
          processingTime: Date.now() - job.createdAt
        }
      };

    } catch (error) {
      console.error('Error generating cards from text:', error);
      throw new Error(`שגיאה ביצירת כרטיסים: ${error.message}`);
    }
  }

  /**
   * Generate cards from lesson recording
   * @param {Object} options - Generation options
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {Object} options.config - Generation configuration
   * @returns {Promise<Object>} Generated cards result
   */
  async generateCardsFromLesson(options) {
    const { recordingId, userId, config = {} } = options;

    try {
      // Get transcription for the recording
      const transcription = await TranscriptionService.getTranscriptionByRecordingId(recordingId, userId);
      
      if (!transcription) {
        throw new Error('לא נמצא תמליל עבור ההקלטה. יש לבצע תמליל תחילה.');
      }

      // The database field is 'transcription_text', not 'text'
      const transcriptionText = transcription.transcription_text ? transcription.transcription_text.trim() : '';
      
      if (!transcriptionText) {
        const emptyTranscriptSuggestions = this.generateEmptyTranscriptSuggestions(transcription);
        throw new Error(`התמליל ריק או לא הושלם. ${emptyTranscriptSuggestions}`);
      }
      
      if (transcriptionText.length < this.minTextLength) {
        const suggestions = this.generateImprovementSuggestions(transcriptionText.length, transcription);
        throw new Error(`התמליל קצר מדי ליצירת כרטיסים איכותיים. ${suggestions}`);
      }

      // Get recording metadata for better context
      const recording = await this.getRecordingMetadata(recordingId, userId);
      
      // Extract field of study and class level from lesson metadata
      let lessonSubjectArea = 'כללי';
      let lessonGradeLevel = 'כיתות ד-ו';
      let lessonTitle = recording?.filename || `שיעור ${recordingId}`;
      
      if (recording && recording.metadata) {
        const metadata = typeof recording.metadata === 'string' 
          ? JSON.parse(recording.metadata) 
          : recording.metadata;
        
        // Extract subject area from various possible field names
        lessonSubjectArea = metadata.subjectArea || 
                           metadata.subject || 
                           metadata.fieldOfStudy || 
                           metadata.subject_area || 
                           'כללי';
        
        // Extract grade level from various possible field names
        lessonGradeLevel = metadata.gradeLevel || 
                          metadata.classLevel || 
                          metadata.grade_level || 
                          metadata.class_level || 
                          'כיתות ד-ו';
        
        // Extract lesson title
        lessonTitle = metadata.lessonName || 
                     metadata.title || 
                     metadata.name || 
                     recording.filename || 
                     `שיעור ${recordingId}`;
      }
      
      // Enhance config with recording metadata - prioritize lesson data over config
      const enhancedConfig = {
        ...config,
        subjectArea: lessonSubjectArea, // Always use lesson's field of study
        gradeLevel: lessonGradeLevel,   // Always use lesson's class level
        lessonTitle: lessonTitle
      };

      console.log('Enhanced config for card generation:', {
        recordingId,
        subjectArea: enhancedConfig.subjectArea,
        gradeLevel: enhancedConfig.gradeLevel,
        lessonTitle: enhancedConfig.lessonTitle
      });

      // Generate cards from transcription text
      return await this.generateCardsFromText({
        text: transcriptionText,
        userId,
        recordingId,
        config: enhancedConfig
      });

    } catch (error) {
      console.error('Error generating cards from lesson:', error);
      throw new Error(`שגיאה ביצירת כרטיסים מהשיעור: ${error.message}`);
    }
  }

  /**
   * Call AI service to generate card content
   * @param {string} text - Source text
   * @param {Object} config - Generation configuration
   * @returns {Promise<Array>} Generated cards
   */
  async callAIForCardGeneration(text, config) {
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client לא זמין. בדוק את הגדרות ה-API key.');
      }

      // Prepare the prompt for card generation
      const prompt = this.buildCardGenerationPrompt(text, config);

      // Call OpenAI API
      const response = await openaiClient.chat.completions.create({
        model: config.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const responseText = response.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('לא התקבלה תשובה מ-OpenAI');
      }

      // Parse AI response
      const generatedCards = this.parseAIResponse(responseText);

      if (!generatedCards || generatedCards.length === 0) {
        throw new Error('לא הצלחנו ליצור כרטיסים מהטקסט הנתון.');
      }

      return generatedCards;

    } catch (error) {
      console.error('Error calling AI for card generation:', error);
      throw new Error(`שגיאה בקריאה לשירות AI: ${error.message}`);
    }
  }

  /**
   * Build AI prompt for card generation
   * @param {string} text - Source text
   * @param {Object} config - Generation configuration
   * @returns {string} AI prompt
   */
  buildCardGenerationPrompt(text, config) {
    const { cardCount, difficultyLevel, subjectArea, gradeLevel, cardType } = config;

    const difficultyMap = {
      easy: 'קל - שאלות פשוטות ובסיסיות',
      medium: 'בינוני - שאלות הדורשות הבנה והסקת מסקנות',
      hard: 'קשה - שאלות מורכבות הדורשות ניתוח ויישום'
    };

    const prompt = `
אתה מורה מנוסה ויוצר כרטיסי זיכרון איכותיים לתלמידים.

המשימה שלך: צור ${cardCount} כרטיסי זיכרון מהטקסט הבא.

פרטי היצירה:
- תחום: ${subjectArea}
- כיתה: ${gradeLevel}
- רמת קושי: ${difficultyMap[difficultyLevel] || difficultyMap.medium}
- סוג כרטיס: שאלה ותשובה

הנחיות חשובות:
1. כל כרטיס חייב להכיל שאלה ברורה בצד הקדמי ותשובה מדויקת בצד האחורי
2. השאלות צריכות להיות מגוונות - עובדות, הבנה, יישום
3. התשובות צריכות להיות קצרות ומדויקות (עד 100 מילים)
4. השתמש בעברית תקנית וברורה
5. ודא שהתוכן מתאים לגיל התלמידים
6. כל כרטיס צריך להיות עצמאי ומובן בפני עצמו

פורמט התשובה - החזר JSON בלבד:
{
  "cards": [
    {
      "frontText": "השאלה כאן",
      "backText": "התשובה כאן",
      "difficultyLevel": "${difficultyLevel}",
      "tags": ["תג1", "תג2"]
    }
  ]
}

הטקסט המקור:
${text}

צור כעת ${cardCount} כרטיסי זיכרון איכותיים:`;

    return prompt;
  }

  /**
   * Parse AI response to extract cards
   * @param {string} response - AI response text
   * @returns {Array} Parsed cards
   */
  parseAIResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('לא נמצא JSON בתשובת AI');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.cards || !Array.isArray(parsed.cards)) {
        throw new Error('פורמט תשובה לא תקין מ-AI');
      }

      return parsed.cards.map(card => ({
        frontText: card.frontText?.trim() || '',
        backText: card.backText?.trim() || '',
        difficultyLevel: card.difficultyLevel || 'medium',
        tags: Array.isArray(card.tags) ? card.tags : [],
        cardType: 'text'
      })).filter(card => card.frontText && card.backText);

    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Fallback: try to extract cards manually
      return this.fallbackParseResponse(response);
    }
  }

  /**
   * Fallback parser for AI response
   * @param {string} response - AI response text
   * @returns {Array} Parsed cards
   */
  fallbackParseResponse(response) {
    try {
      const cards = [];
      const lines = response.split('\n').filter(line => line.trim());
      
      let currentCard = null;
      
      for (const line of lines) {
        if (line.includes('שאלה:') || line.includes('קדמי:')) {
          if (currentCard && currentCard.frontText && currentCard.backText) {
            cards.push(currentCard);
          }
          currentCard = {
            frontText: line.replace(/^.*?(שאלה:|קדמי:)\s*/, '').trim(),
            backText: '',
            difficultyLevel: 'medium',
            tags: [],
            cardType: 'text'
          };
        } else if (line.includes('תשובה:') || line.includes('אחורי:')) {
          if (currentCard) {
            currentCard.backText = line.replace(/^.*?(תשובה:|אחורי:)\s*/, '').trim();
          }
        }
      }
      
      if (currentCard && currentCard.frontText && currentCard.backText) {
        cards.push(currentCard);
      }
      
      return cards;
    } catch (error) {
      console.error('Fallback parsing failed:', error);
      return [];
    }
  }

  /**
   * Process and validate generated cards
   * @param {Array} cards - Generated cards
   * @param {Object} context - Processing context
   * @returns {Promise<Array>} Processed cards
   */
  async processGeneratedCards(cards, context) {
    const { userId, recordingId, config } = context;
    
    return cards.map((card, index) => ({
      ...card,
      id: `generated_${Date.now()}_${index}`,
      userId,
      recordingId,
      orderIndex: index,
      isGenerated: true,
      generatedAt: new Date().toISOString(),
      metadata: {
        sourceType: recordingId ? 'lesson' : 'text',
        generationConfig: config
      }
    })).filter(card => 
      card.frontText && 
      card.backText && 
      card.frontText.length > 5 && 
      card.backText.length > 5
    );
  }

  /**
   * Create generation job record
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job
   */
  async createGenerationJob(jobData) {
    const { userId, recordingId, textLength, config } = jobData;
    
    try {
      const result = await run(`
        INSERT INTO card_generation_jobs (
          user_id, recording_id, text_length, generation_config,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        userId,
        recordingId,
        textLength,
        JSON.stringify(config),
        'processing'
      ]);

      return {
        id: result.lastID,
        userId,
        recordingId,
        status: 'processing',
        createdAt: Date.now(),
        config
      };
    } catch (error) {
      console.error('Error creating generation job:', error);
      throw new Error('שגיאה ביצירת משימת יצירה');
    }
  }

  /**
   * Update job status
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @param {Object} metadata - Additional metadata
   */
  async updateJobStatus(jobId, status, metadata = {}) {
    try {
      await run(`
        UPDATE card_generation_jobs 
        SET status = ?, result_metadata = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [status, JSON.stringify(metadata), jobId]);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Get recording metadata
   * @param {number} recordingId - Recording ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Recording metadata
   */
  async getRecordingMetadata(recordingId, userId) {
    try {
      const result = await query(`
        SELECT * FROM recordings 
        WHERE id = ? AND user_id = ?
      `, [recordingId, userId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching recording metadata:', error);
      return null;
    }
  }

  /**
   * Log card generation for analytics
   * @param {Object} logData - Log data
   */
  async logCardGeneration(logData) {
    try {
      const { jobId, userId, recordingId, cardsGenerated, provider, config } = logData;
      
      await run(`
        INSERT INTO card_generation_logs (
          job_id, user_id, recording_id, cards_generated,
          ai_provider, generation_config, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        jobId,
        userId,
        recordingId,
        cardsGenerated,
        provider,
        JSON.stringify(config)
      ]);
    } catch (error) {
      console.error('Error logging card generation:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Generate suggestions for empty transcripts
   * @param {Object} transcription - Transcription object
   * @returns {string} Empty transcript suggestions
   */
  generateEmptyTranscriptSuggestions(transcription) {
    const suggestions = [];
    
    suggestions.push('ייתכן שהתמליל נכשל או שההקלטה לא הכילה דיבור ברור.');
    
    // Check if transcription process failed
    if (transcription.confidence_score !== undefined && transcription.confidence_score < 0.3) {
      suggestions.push('איכות ההקלטה נמוכה מאוד - ייתכן שהמערכת לא הצליחה לזהות דיבור.');
    }
    
    // Check processing metadata
    if (transcription.metadata) {
      const metadata = typeof transcription.metadata === 'string' 
        ? JSON.parse(transcription.metadata) 
        : transcription.metadata;
      
      if (metadata.duration && metadata.duration < 5) {
        suggestions.push('ההקלטה קצרה מאוד (פחות מ-5 שניות).');
      }
    }
    
    suggestions.push('פתרונות אפשריים:');
    suggestions.push('• בדוק שההקלטה מכילה דיבור ברור בעברית');
    suggestions.push('• ודא שהמיקרופון עובד תקין');
    suggestions.push('• הקלט במקום שקט ללא רעשי רקע');
    suggestions.push('• דבר בקול רם וברור לכיוון המיקרופון');
    suggestions.push('• נסה להקליט שוב עם הקלטה ארוכה יותר (לפחות 30 שניות)');
    suggestions.push('• אם הבעיה נמשכת, נסה להעלות קובץ אודיו באיכות גבוהה יותר');
    
    return suggestions.join(' ');
  }

  /**
   * Generate improvement suggestions for short transcripts
   * @param {number} currentLength - Current transcript length
   * @param {Object} transcription - Transcription object
   * @returns {string} Improvement suggestions
   */
  generateImprovementSuggestions(currentLength, transcription) {
    const suggestions = [];
    
    suggestions.push(`אורך התמליל הנוכחי: ${currentLength} תווים, נדרש לפחות ${this.minTextLength} תווים.`);
    
    if (currentLength < 20) {
      suggestions.push('ההקלטה קצרה מאוד. נסה להקליט שיעור ארוך יותר או לדבר יותר בזמן ההקלטה.');
    } else if (currentLength < this.minTextLength) {
      suggestions.push('ההקלטה קצרה יחסית. נסה להוסיף פרטים נוספים או הסברים מורחבים.');
    }
    
    // Check transcription confidence if available
    if (transcription.confidence_score && transcription.confidence_score < 0.7) {
      suggestions.push('איכות התמליל נמוכה. נסה להקליט במקום שקט יותר או לדבר בצורה ברורה יותר.');
    }
    
    // Check if transcription is very fragmented
    if (transcription.segments && transcription.segments.length > 0) {
      const avgSegmentLength = currentLength / transcription.segments.length;
      if (avgSegmentLength < 10) {
        suggestions.push('התמליל מפוצל לקטעים קצרים מאוד. נסה לדבר ברציפות יותר.');
      }
    }
    
    suggestions.push('טיפים לשיפור:');
    suggestions.push('• הקלט שיעור של לפחות 2-3 דקות');
    suggestions.push('• דבר בקצב איטי וברור');
    suggestions.push('• הקלט במקום שקט ללא רעשי רקע');
    suggestions.push('• הוסף הסברים מפורטים ודוגמאות');
    
    return suggestions.join(' ');
  }

  /**
   * Get generation statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Generation statistics
   */
  async getGenerationStats(userId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_generations,
          SUM(cards_generated) as total_cards_generated,
          AVG(cards_generated) as avg_cards_per_generation,
          COUNT(DISTINCT ai_provider) as providers_used
        FROM card_generation_logs 
        WHERE user_id = ?
      `, [userId]);

      return result.rows[0] || {
        total_generations: 0,
        total_cards_generated: 0,
        avg_cards_per_generation: 0,
        providers_used: 0
      };
    } catch (error) {
      console.error('Error fetching generation stats:', error);
      throw new Error('שגיאה בטעינת סטטיסטיקות יצירה');
    }
  }
}

module.exports = new CardGenerationService();
