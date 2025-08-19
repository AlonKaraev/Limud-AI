const { openaiClient, AI_PROVIDERS, MODEL_CONFIGS, calculateEstimatedCost } = require('../config/ai-services');
const { run, query } = require('../config/database-sqlite');

/**
 * Question Generation Service
 * Creates educational assessment questions from lesson content
 */
class QuestionService {
  constructor() {
    this.hebrewPrompts = {
      multiple_choice: `אתה מומחה בהכנת שאלות בחינה חינוכיות בעברית. צור 10 שאלות אמריקאיות (רב ברירה) איכותיות על בסיס התוכן הבא.

כל שאלה צריכה:
1. להיות ברורה ומדויקת בעברית
2. לכלול 4 אפשרויות תשובה (א, ב, ג, ד)
3. תשובה אחת נכונה ו-3 מטעות סבירות
4. להתמקד בהבנה ולא רק בזכירה
5. להיות מתאימה לרמת הכיתה

התוכן:
{content}

פורמט התשובה:
שאלה 1: [טקסט השאלה]
א) [אפשרות 1]
ב) [אפשרות 2]
ג) [אפשרות 3]
ד) [אפשרות 4]
תשובה נכונה: [א/ב/ג/ד]
הסבר: [הסבר קצר למה התשובה נכונה]

---

המשך עם שאלות 2-10...`,

      true_false: `צור 10 שאלות נכון/לא נכון על בסיס התוכן הבא. כל שאלה צריכה להיות ברורה ולבדוק הבנה אמיתית.

התוכן:
{content}

פורמט:
שאלה 1: [טקסט השאלה]
תשובה: [נכון/לא נכון]
הסבר: [הסבר קצר]

---`,

      short_answer: `צור 10 שאלות תשובה קצרה על בסיס התוכן הבא. השאלות צריכות לעודד חשיבה ביקורתית והבנה עמוקה.

התוכן:
{content}

פורמט:
שאלה 1: [טקסט השאלה]
תשובה מוצעת: [תשובה קצרה]
נקודות מפתח: [נקודות שצריכות להופיע בתשובה]

---`,

      essay: `צור 5 שאלות חיבור/מאמר על בסיס התוכן הבא. השאלות צריכות לעודד ניתוח, סינתזה והערכה.

התוכן:
{content}

פורמט:
שאלה 1: [טקסט השאלה]
הנחיות לתשובה: [מה צריך לכלול בתשובה]
קריטריונים להערכה: [איך להעריך את התשובה]

---`
    };

    this.difficultyPrompts = {
      easy: 'התמקד בזכירה ובהבנה בסיסית של עובדות ומושגים פשוטים.',
      medium: 'כלול שאלות הבנה, יישום וניתוח של המידע.',
      hard: 'צור שאלות מורכבות הדורשות סינתזה, הערכה וחשיבה ביקורתית.'
    };
  }

  /**
   * Generate questions from content
   * @param {Object} options - Question generation options
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.transcriptionId - Transcription ID (optional)
   * @param {number} options.summaryId - Summary ID (optional)
   * @param {number} options.userId - User ID
   * @param {number} options.jobId - Processing job ID
   * @param {string} options.questionType - Type of questions
   * @param {string} options.difficultyLevel - Difficulty level
   * @param {number} options.questionCount - Number of questions to generate
   * @param {string} options.subjectArea - Subject area
   * @param {string} options.gradeLevel - Grade level
   * @param {string} options.provider - AI provider
   * @returns {Promise<Object>} Question generation result
   */
  async generateQuestions(options) {
    const {
      recordingId,
      transcriptionId,
      summaryId,
      userId,
      jobId,
      questionType = 'multiple_choice',
      difficultyLevel = 'medium',
      questionCount = 10,
      subjectArea,
      gradeLevel,
      provider = AI_PROVIDERS.OPENAI
    } = options;

    const startTime = Date.now();

    try {
      // Get content for question generation
      const content = await this.getContentForQuestions(transcriptionId, summaryId, userId);
      if (!content) {
        throw new Error('No content found for question generation');
      }

      // Generate questions based on provider
      let questionsResult;
      switch (provider) {
        case AI_PROVIDERS.OPENAI:
          questionsResult = await this.generateWithOpenAI(
            content,
            questionType,
            difficultyLevel,
            questionCount,
            { subjectArea, gradeLevel }
          );
          break;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const processingDuration = Date.now() - startTime;

      // Parse and save questions
      const questions = await this.parseAndSaveQuestions({
        recordingId,
        transcriptionId,
        summaryId,
        userId,
        jobId,
        questionsData: questionsResult.questions,
        questionType,
        difficultyLevel,
        subjectArea,
        gradeLevel,
        aiProvider: provider,
        modelVersion: questionsResult.model,
        metadata: {
          processing_duration: processingDuration,
          input_tokens: questionsResult.usage?.prompt_tokens || 0,
          output_tokens: questionsResult.usage?.completion_tokens || 0,
          total_tokens: questionsResult.usage?.total_tokens || 0
        }
      });

      // Create question set
      const questionSet = await this.createQuestionSet({
        recordingId,
        userId,
        jobId,
        questions,
        setName: `שאלות ${questionType} - ${new Date().toLocaleDateString('he-IL')}`,
        subjectArea,
        gradeLevel,
        estimatedDuration: this.calculateEstimatedDuration(questions, questionType)
      });

      // Track usage
      await this.trackUsage({
        userId,
        provider,
        serviceType: 'question_generation',
        processingTime: processingDuration,
        inputTokens: questionsResult.usage?.prompt_tokens || 0,
        outputTokens: questionsResult.usage?.completion_tokens || 0,
        metadata: {
          model: questionsResult.model,
          question_type: questionType,
          difficulty_level: difficultyLevel,
          question_count: questions.length,
          subject_area: subjectArea,
          grade_level: gradeLevel
        }
      });

      return {
        success: true,
        questions,
        questionSet,
        processingTime: processingDuration,
        provider
      };

    } catch (error) {
      console.error('Question generation error:', error);
      
      // Save error to job if jobId provided
      if (jobId) {
        await this.updateJobStatus(jobId, 'failed', error.message);
      }

      throw new Error(`Question generation failed: ${error.message}`);
    }
  }

  /**
   * Generate questions using OpenAI
   * @param {string} content - Content for question generation
   * @param {string} questionType - Type of questions
   * @param {string} difficultyLevel - Difficulty level
   * @param {number} questionCount - Number of questions
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} OpenAI questions result
   */
  async generateWithOpenAI(content, questionType, difficultyLevel, questionCount, context = {}) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const config = MODEL_CONFIGS.question_generation.openai;
    
    try {
      // Build prompt
      let prompt = this.hebrewPrompts[questionType] || this.hebrewPrompts.multiple_choice;
      prompt = prompt.replace('{content}', content);

      // Add difficulty context
      if (this.difficultyPrompts[difficultyLevel]) {
        prompt += `\n\nרמת קושי: ${this.difficultyPrompts[difficultyLevel]}`;
      }

      // Add context if provided
      if (context.subjectArea) {
        prompt += `\n\nתחום הלימוד: ${context.subjectArea}`;
      }
      if (context.gradeLevel) {
        prompt += `\nרמת כיתה: ${context.gradeLevel}`;
      }

      // Adjust question count for different types
      if (questionType === 'essay') {
        questionCount = Math.min(questionCount, 5);
        prompt = prompt.replace('10', questionCount.toString());
      } else {
        prompt = prompt.replace('10', questionCount.toString());
      }

      // Call OpenAI API
      const response = await openaiClient.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'אתה מומחה חינוכי המתמחה ביצירת שאלות בחינה איכותיות בעברית. אתה יוצר שאלות ברורות, מדויקות ומתאימות לרמת התלמידים.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p
      });

      const questionsText = response.choices[0].message.content.trim();
      const parsedQuestions = this.parseQuestionsFromText(questionsText, questionType);

      return {
        questions: parsedQuestions,
        model: config.model,
        usage: response.usage,
        raw_text: questionsText
      };

    } catch (error) {
      console.error('OpenAI question generation error:', error);
      throw new Error(`OpenAI question generation failed: ${error.message}`);
    }
  }

  /**
   * Parse questions from generated text
   * @param {string} text - Generated questions text
   * @param {string} questionType - Type of questions
   * @returns {Array} Parsed questions
   */
  parseQuestionsFromText(text, questionType) {
    const questions = [];
    
    try {
      // Split by question separators
      const questionBlocks = text.split(/---+|\n\n(?=שאלה \d+)/);
      
      for (const block of questionBlocks) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock || !trimmedBlock.includes('שאלה')) continue;

        const question = this.parseQuestionBlock(trimmedBlock, questionType);
        if (question) {
          questions.push(question);
        }
      }

      return questions;
    } catch (error) {
      console.error('Error parsing questions:', error);
      return [];
    }
  }

  /**
   * Parse individual question block
   * @param {string} block - Question block text
   * @param {string} questionType - Type of question
   * @returns {Object|null} Parsed question
   */
  parseQuestionBlock(block, questionType) {
    try {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) return null;

      // Extract question text
      const questionLine = lines.find(line => line.includes('שאלה'));
      if (!questionLine) return null;

      const questionText = questionLine.replace(/^שאלה \d+:\s*/, '').trim();
      
      let correctAnswer = '';
      let answerOptions = [];
      let explanation = '';
      let suggestedAnswer = '';
      let keyPoints = [];
      let guidelines = '';
      let criteria = '';

      switch (questionType) {
        case 'multiple_choice':
          // Extract options
          const optionLines = lines.filter(line => /^[א-ד]\)/.test(line));
          answerOptions = optionLines.map(line => line.replace(/^[א-ד]\)\s*/, ''));
          
          // Extract correct answer
          const correctLine = lines.find(line => line.includes('תשובה נכונה:'));
          if (correctLine) {
            const match = correctLine.match(/תשובה נכונה:\s*([א-ד])/);
            if (match) {
              correctAnswer = answerOptions[['א', 'ב', 'ג', 'ד'].indexOf(match[1])] || '';
            }
          }
          
          // Extract explanation
          const explanationLine = lines.find(line => line.includes('הסבר:'));
          if (explanationLine) {
            explanation = explanationLine.replace('הסבר:', '').trim();
          }
          break;

        case 'true_false':
          const answerLine = lines.find(line => line.includes('תשובה:'));
          if (answerLine) {
            correctAnswer = answerLine.replace('תשובה:', '').trim();
          }
          
          const explanationLine2 = lines.find(line => line.includes('הסבר:'));
          if (explanationLine2) {
            explanation = explanationLine2.replace('הסבר:', '').trim();
          }
          break;

        case 'short_answer':
          const suggestedLine = lines.find(line => line.includes('תשובה מוצעת:'));
          if (suggestedLine) {
            suggestedAnswer = suggestedLine.replace('תשובה מוצעת:', '').trim();
            correctAnswer = suggestedAnswer;
          }
          
          const keyPointsLine = lines.find(line => line.includes('נקודות מפתח:'));
          if (keyPointsLine) {
            keyPoints = [keyPointsLine.replace('נקודות מפתח:', '').trim()];
          }
          break;

        case 'essay':
          const guidelinesLine = lines.find(line => line.includes('הנחיות לתשובה:'));
          if (guidelinesLine) {
            guidelines = guidelinesLine.replace('הנחיות לתשובה:', '').trim();
            correctAnswer = guidelines;
          }
          
          const criteriaLine = lines.find(line => line.includes('קריטריונים להערכה:'));
          if (criteriaLine) {
            criteria = criteriaLine.replace('קריטריונים להערכה:', '').trim();
            explanation = criteria;
          }
          break;
      }

      return {
        question_text: questionText,
        correct_answer: correctAnswer,
        answer_options: answerOptions,
        explanation: explanation,
        suggested_answer: suggestedAnswer,
        key_points: keyPoints,
        guidelines: guidelines,
        criteria: criteria
      };

    } catch (error) {
      console.error('Error parsing question block:', error);
      return null;
    }
  }

  /**
   * Get content for question generation
   * @param {number} transcriptionId - Transcription ID
   * @param {number} summaryId - Summary ID
   * @param {number} userId - User ID
   * @returns {Promise<string>} Content text
   */
  async getContentForQuestions(transcriptionId, summaryId, userId) {
    try {
      let content = '';

      // Prefer summary over transcription for question generation
      if (summaryId) {
        const result = await query(`
          SELECT summary_text FROM content_summaries 
          WHERE id = ? AND user_id = ?
        `, [summaryId, userId]);
        
        if (result.rows.length > 0) {
          content = result.rows[0].summary_text;
        }
      }

      // Fallback to transcription if no summary
      if (!content && transcriptionId) {
        const result = await query(`
          SELECT transcription_text FROM transcriptions 
          WHERE id = ? AND user_id = ?
        `, [transcriptionId, userId]);
        
        if (result.rows.length > 0) {
          content = result.rows[0].transcription_text;
        }
      }

      return content;
    } catch (error) {
      console.error('Error getting content for questions:', error);
      throw new Error(`Failed to get content: ${error.message}`);
    }
  }

  /**
   * Parse and save questions to database
   * @param {Object} data - Questions data
   * @returns {Promise<Array>} Saved questions
   */
  async parseAndSaveQuestions(data) {
    const {
      recordingId,
      transcriptionId,
      summaryId,
      userId,
      jobId,
      questionsData,
      questionType,
      difficultyLevel,
      subjectArea,
      gradeLevel,
      aiProvider,
      modelVersion,
      metadata
    } = data;

    const savedQuestions = [];

    try {
      for (const questionData of questionsData) {
        const result = await run(`
          INSERT INTO generated_questions (
            recording_id, transcription_id, summary_id, user_id, job_id,
            question_text, question_type, correct_answer, answer_options,
            difficulty_level, topic_area, learning_objective, explanation,
            confidence_score, ai_provider, model_version, metadata,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          recordingId,
          transcriptionId,
          summaryId,
          userId,
          jobId,
          questionData.question_text,
          questionType,
          questionData.correct_answer,
          JSON.stringify(questionData.answer_options || []),
          difficultyLevel,
          subjectArea,
          questionData.learning_objective || '',
          questionData.explanation || '',
          this.calculateQuestionConfidence(questionData, questionType),
          aiProvider,
          modelVersion,
          JSON.stringify(metadata)
        ]);

        savedQuestions.push({
          id: result.lastID,
          recording_id: recordingId,
          transcription_id: transcriptionId,
          summary_id: summaryId,
          user_id: userId,
          job_id: jobId,
          question_text: questionData.question_text,
          question_type: questionType,
          correct_answer: questionData.correct_answer,
          answer_options: questionData.answer_options || [],
          difficulty_level: difficultyLevel,
          topic_area: subjectArea,
          explanation: questionData.explanation || '',
          confidence_score: this.calculateQuestionConfidence(questionData, questionType),
          ai_provider: aiProvider,
          model_version: modelVersion,
          metadata,
          created_at: new Date().toISOString()
        });
      }

      return savedQuestions;
    } catch (error) {
      console.error('Error saving questions:', error);
      throw new Error(`Failed to save questions: ${error.message}`);
    }
  }

  /**
   * Create question set
   * @param {Object} data - Question set data
   * @returns {Promise<Object>} Created question set
   */
  async createQuestionSet(data) {
    const {
      recordingId,
      userId,
      jobId,
      questions,
      setName,
      subjectArea,
      gradeLevel,
      estimatedDuration
    } = data;

    try {
      // Create question set
      const setResult = await run(`
        INSERT INTO question_sets (
          recording_id, user_id, job_id, set_name, description,
          total_questions, subject_area, grade_level, estimated_duration,
          metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        recordingId,
        userId,
        jobId,
        setName,
        `סט שאלות שנוצר אוטומטית מתוכן השיעור`,
        questions.length,
        subjectArea,
        gradeLevel,
        estimatedDuration,
        JSON.stringify({ auto_generated: true })
      ]);

      const questionSetId = setResult.lastID;

      // Add questions to set
      for (let i = 0; i < questions.length; i++) {
        await run(`
          INSERT INTO question_set_items (
            question_set_id, question_id, order_index, points, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [questionSetId, questions[i].id, i + 1, 1]);
      }

      return {
        id: questionSetId,
        recording_id: recordingId,
        user_id: userId,
        job_id: jobId,
        set_name: setName,
        total_questions: questions.length,
        subject_area: subjectArea,
        grade_level: gradeLevel,
        estimated_duration: estimatedDuration,
        questions: questions,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating question set:', error);
      throw new Error(`Failed to create question set: ${error.message}`);
    }
  }

  /**
   * Calculate question confidence score
   * @param {Object} questionData - Question data
   * @param {string} questionType - Question type
   * @returns {number} Confidence score (0-1)
   */
  calculateQuestionConfidence(questionData, questionType) {
    try {
      let score = 0.5; // Base score

      // Check if question text exists and is meaningful
      if (questionData.question_text && questionData.question_text.length > 10) {
        score += 0.2;
      }

      // Check if correct answer exists
      if (questionData.correct_answer && questionData.correct_answer.trim().length > 0) {
        score += 0.2;
      }

      // Type-specific checks
      switch (questionType) {
        case 'multiple_choice':
          if (questionData.answer_options && questionData.answer_options.length === 4) {
            score += 0.1;
          }
          break;
        case 'true_false':
          if (['נכון', 'לא נכון', 'true', 'false'].includes(questionData.correct_answer.toLowerCase())) {
            score += 0.1;
          }
          break;
      }

      // Check for explanation
      if (questionData.explanation && questionData.explanation.length > 5) {
        score += 0.1;
      }

      return Math.min(score, 1.0);
    } catch (error) {
      console.error('Error calculating question confidence:', error);
      return 0.5;
    }
  }

  /**
   * Calculate estimated duration for question set
   * @param {Array} questions - Questions array
   * @param {string} questionType - Question type
   * @returns {number} Estimated duration in minutes
   */
  calculateEstimatedDuration(questions, questionType) {
    const timePerQuestion = {
      multiple_choice: 2, // 2 minutes per question
      true_false: 1, // 1 minute per question
      short_answer: 5, // 5 minutes per question
      essay: 15 // 15 minutes per question
    };

    const baseTime = timePerQuestion[questionType] || 2;
    return questions.length * baseTime;
  }

  /**
   * Get questions by recording ID
   * @param {number} recordingId - Recording ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Questions
   */
  async getQuestionsByRecordingId(recordingId, userId) {
    try {
      const result = await query(`
        SELECT * FROM generated_questions 
        WHERE recording_id = ? AND user_id = ?
        ORDER BY created_at DESC
      `, [recordingId, userId]);

      return result.rows.map(question => ({
        ...question,
        answer_options: JSON.parse(question.answer_options || '[]'),
        metadata: JSON.parse(question.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  /**
   * Get question set by recording ID
   * @param {number} recordingId - Recording ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Question set with questions
   */
  async getQuestionSetByRecordingId(recordingId, userId) {
    try {
      const setResult = await query(`
        SELECT * FROM question_sets 
        WHERE recording_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [recordingId, userId]);

      if (setResult.rows.length === 0) {
        return null;
      }

      const questionSet = setResult.rows[0];

      // Get questions in the set
      const questionsResult = await query(`
        SELECT gq.*, qsi.order_index, qsi.points
        FROM generated_questions gq
        JOIN question_set_items qsi ON gq.id = qsi.question_id
        WHERE qsi.question_set_id = ?
        ORDER BY qsi.order_index
      `, [questionSet.id]);

      const questions = questionsResult.rows.map(question => ({
        ...question,
        answer_options: JSON.parse(question.answer_options || '[]'),
        metadata: JSON.parse(question.metadata || '{}')
      }));

      return {
        ...questionSet,
        metadata: JSON.parse(questionSet.metadata || '{}'),
        questions
      };
    } catch (error) {
      console.error('Error fetching question set:', error);
      throw new Error(`Failed to fetch question set: ${error.message}`);
    }
  }

  /**
   * Track AI service usage
   * @param {Object} usageData - Usage data
   */
  async trackUsage(usageData) {
    const {
      userId,
      provider,
      serviceType,
      processingTime,
      inputTokens,
      outputTokens,
      metadata
    } = usageData;

    try {
      // Calculate estimated cost
      const cost = calculateEstimatedCost(provider, MODEL_CONFIGS.question_generation[provider].model, {
        input_tokens: inputTokens,
        output_tokens: outputTokens
      });

      await run(`
        INSERT INTO ai_service_usage (
          user_id, service_provider, service_type, tokens_used,
          cost_usd, processing_time, request_timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `, [
        userId,
        provider,
        serviceType,
        inputTokens + outputTokens,
        cost,
        processingTime,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Update job status
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message if failed
   */
  async updateJobStatus(jobId, status, errorMessage = null) {
    try {
      const updateFields = ['status = ?', 'updated_at = datetime(\'now\')'];
      const params = [status];

      if (status === 'processing') {
        updateFields.push('started_at = datetime(\'now\')');
      } else if (status === 'completed' || status === 'failed') {
        updateFields.push('completed_at = datetime(\'now\')');
      }

      if (errorMessage) {
        updateFields.push('error_message = ?');
        params.push(errorMessage);
      }

      params.push(jobId);

      await run(`
        UPDATE ai_processing_jobs 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, params);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Get question statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getQuestionStats(userId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_questions,
          AVG(confidence_score) as avg_confidence,
          COUNT(DISTINCT question_type) as question_types_used,
          COUNT(DISTINCT difficulty_level) as difficulty_levels_used
        FROM generated_questions 
        WHERE user_id = ?
      `, [userId]);

      return result.rows[0] || {
        total_questions: 0,
        avg_confidence: 0,
        question_types_used: 0,
        difficulty_levels_used: 0
      };
    } catch (error) {
      console.error('Error fetching question stats:', error);
      throw new Error(`Failed to fetch question stats: ${error.message}`);
    }
  }
}

module.exports = new QuestionService();
