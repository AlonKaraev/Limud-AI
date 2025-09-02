const { openaiClient, AI_PROVIDERS, MODEL_CONFIGS, calculateEstimatedCost } = require('../config/ai-services');
const { run, query } = require('../config/database-sqlite');
const { validateContentForProcessing, optimizeMaxTokens, getContextWindowSize } = require('../utils/TokenCounter');

/**
 * Content Summary Generation Service
 * Creates educational summaries from lesson transcriptions
 */
class SummaryService {
  constructor() {
    this.hebrewPrompts = {
      educational: `אתה מומחה חינוכי המתמחה בניתוח שיעורים בעברית. נתח את התמליל הבא של שיעור וצור סיכום חינוכי מקיף.

הסיכום צריך לכלול:
1. נושא השיעור הראשי
2. מטרות הלמידה העיקריות
3. נקודות מפתח שנלמדו
4. מושגים חשובים
5. דוגמאות או הסברים מרכזיים
6. מסקנות או לקחים

התמליל:
{transcription}

אנא ספק סיכום מובנה בעברית:`,

      brief: `צור סיכום קצר ותמציתי של השיעור הבא בעברית. התמקד בנקודות העיקריות בלבד.

התמליל:
{transcription}

סיכום קצר:`,

      detailed: `צור סיכום מפורט ומעמיק של השיעור הבא. כלול ניתוח מקיף של התוכן, הקשרים, ודוגמאות.

התמליל:
{transcription}

סיכום מפורט:`,

      key_points: `חלץ את נקודות המפתח העיקריות מהשיעור הבא. ארגן אותן כרשימה מובנית.

התמליל:
{transcription}

נקודות מפתח:`
    };

    this.englishPrompts = {
      educational: `You are an educational expert specializing in lesson analysis. Analyze the following lesson transcript and create a comprehensive educational summary.

The summary should include:
1. Main lesson topic
2. Primary learning objectives
3. Key points learned
4. Important concepts
5. Main examples or explanations
6. Conclusions or takeaways

Transcript:
{transcription}

Please provide a structured summary in English:`,

      brief: `Create a brief and concise summary of the following lesson in English. Focus only on the main points.

Transcript:
{transcription}

Brief summary:`,

      detailed: `Create a detailed and comprehensive summary of the following lesson. Include thorough analysis of content, context, and examples.

Transcript:
{transcription}

Detailed summary:`,

      key_points: `Extract the main key points from the following lesson. Organize them as a structured list.

Transcript:
{transcription}

Key points:`
    };
  }

  /**
   * Generate summary from transcription
   * @param {Object} options - Summary generation options
   * @param {number} options.transcriptionId - Transcription ID
   * @param {number} options.recordingId - Recording ID
   * @param {number} options.userId - User ID
   * @param {number} options.jobId - Processing job ID
   * @param {string} options.summaryType - Type of summary (educational, brief, detailed, key_points)
   * @param {string} options.subjectArea - Subject area
   * @param {string} options.gradeLevel - Grade level
   * @param {string} options.language - Output language (hebrew, english)
   * @param {string} options.customGuidance - Custom guidance for AI
   * @param {string} options.provider - AI provider
   * @returns {Promise<Object>} Summary result
   */
  async generateSummary(options) {
    const {
      transcriptionId,
      recordingId,
      userId,
      jobId,
      summaryType = 'educational',
      subjectArea,
      gradeLevel,
      language = 'hebrew',
      customGuidance = '',
      provider = AI_PROVIDERS.OPENAI
    } = options;

    const startTime = Date.now();

    try {
      // Get transcription text
      const transcription = await this.getTranscription(transcriptionId, userId);
      if (!transcription) {
        throw new Error('Transcription not found');
      }

      // Generate summary based on provider
      let summaryResult;
      switch (provider) {
        case AI_PROVIDERS.OPENAI:
          summaryResult = await this.generateWithOpenAI(
            transcription.transcription_text,
            summaryType,
            { subjectArea, gradeLevel, language, customGuidance }
          );
          break;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const processingDuration = Date.now() - startTime;

      // Extract key topics and learning objectives
      const keyTopics = await this.extractKeyTopics(summaryResult.text, provider);
      const learningObjectives = await this.extractLearningObjectives(summaryResult.text, provider);

      // Save summary to database
      const summary = await this.saveSummary({
        recordingId,
        transcriptionId,
        userId,
        jobId,
        summaryText: summaryResult.text,
        summaryType,
        keyTopics,
        learningObjectives,
        subjectArea,
        gradeLevel,
        confidenceScore: summaryResult.confidence || 0.8,
        aiProvider: provider,
        modelVersion: summaryResult.model,
        metadata: {
          processing_duration: processingDuration,
          input_tokens: summaryResult.usage?.prompt_tokens || 0,
          output_tokens: summaryResult.usage?.completion_tokens || 0,
          total_tokens: summaryResult.usage?.total_tokens || 0
        }
      });

      // Track usage
      await this.trackUsage({
        userId,
        provider,
        serviceType: 'summary_generation',
        processingTime: processingDuration,
        inputTokens: summaryResult.usage?.prompt_tokens || 0,
        outputTokens: summaryResult.usage?.completion_tokens || 0,
        metadata: {
          model: summaryResult.model,
          summary_type: summaryType,
          subject_area: subjectArea,
          grade_level: gradeLevel
        }
      });

      return {
        success: true,
        summary,
        processingTime: processingDuration,
        provider,
        keyTopics,
        learningObjectives
      };

    } catch (error) {
      console.error('Summary generation error:', error);
      
      // Save error to job if jobId provided
      if (jobId) {
        await this.updateJobStatus(jobId, 'failed', error.message);
      }

      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  /**
   * Generate summary using OpenAI
   * @param {string} transcriptionText - Transcription text
   * @param {string} summaryType - Type of summary
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} OpenAI summary result
   */
  async generateWithOpenAI(transcriptionText, summaryType, context = {}) {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const config = MODEL_CONFIGS.summary_generation.openai;
    const { language = 'hebrew', customGuidance = '', subjectArea, gradeLevel } = context;
    
    try {
      // Select prompts based on language
      const prompts = language === 'english' ? this.englishPrompts : this.hebrewPrompts;
      let prompt = prompts[summaryType] || prompts.educational;
      prompt = prompt.replace('{transcription}', transcriptionText);

      // Add context based on language
      if (language === 'english') {
        if (subjectArea) {
          prompt += `\n\nSubject Area: ${subjectArea}`;
        }
        if (gradeLevel) {
          prompt += `\nGrade Level: ${gradeLevel}`;
        }
        if (customGuidance) {
          prompt += `\n\nAdditional Instructions: ${customGuidance}`;
        }
      } else {
        if (subjectArea) {
          prompt += `\n\nתחום הלימוד: ${subjectArea}`;
        }
        if (gradeLevel) {
          prompt += `\nרמת כיתה: ${gradeLevel}`;
        }
        if (customGuidance) {
          prompt += `\n\nהנחיות נוספות: ${customGuidance}`;
        }
      }

      // Select system message based on language
      const systemMessage = language === 'english' 
        ? 'You are an educational expert specializing in educational content analysis. You create clear, understandable, and useful summaries for teachers and students.'
        : 'אתה מומחה חינוכי המתמחה בניתוח תוכן לימודי בעברית. אתה יוצר סיכומים ברורים, מובנים ומועילים למורים ותלמידים.';

      // Validate context window fit
      const fullPrompt = systemMessage + '\n\n' + prompt;
      
      const validation = validateContentForProcessing(
        fullPrompt, 
        '', 
        config.model, 
        config.max_tokens
      );

      if (!validation.valid) {
        console.warn('Content may exceed context window:', validation.analysis);
        console.warn('Recommendations:', validation.recommendations);
        
        // Optimize max_tokens for available space
        const optimizedMaxTokens = optimizeMaxTokens(
          fullPrompt,
          '',
          config.max_tokens,
          getContextWindowSize(config.model)
        );
        
        console.log(`Optimized max_tokens from ${config.max_tokens} to ${optimizedMaxTokens}`);
        config.max_tokens = optimizedMaxTokens;
      }

      console.log(`Generating summary in ${language} with custom guidance: ${!!customGuidance}`);

      // Call OpenAI API
      const response = await openaiClient.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: systemMessage
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

      const summaryText = response.choices[0].message.content.trim();

      return {
        text: summaryText,
        model: config.model,
        usage: response.usage,
        confidence: this.calculateSummaryConfidence(summaryText, transcriptionText),
        contextAnalysis: validation.analysis,
        language: language
      };

    } catch (error) {
      console.error('OpenAI summary generation error:', error);
      
      // Enhanced error handling for context window issues
      if (error.message.includes('context_length_exceeded') || error.message.includes('maximum context length')) {
        throw new Error(`Content too large for context window. Consider using shorter transcription or chunking the content. Error: ${error.message}`);
      } else if (error.message.includes('rate_limit_exceeded')) {
        throw new Error(`Rate limit exceeded. Please try again later. Error: ${error.message}`);
      } else {
        throw new Error(`OpenAI summary generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Extract key topics from summary
   * @param {string} summaryText - Summary text
   * @param {string} provider - AI provider
   * @returns {Promise<Array>} Key topics
   */
  async extractKeyTopics(summaryText, provider = AI_PROVIDERS.OPENAI) {
    try {
      if (!openaiClient) {
        return this.extractTopicsBasic(summaryText);
      }

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'חלץ את הנושאים העיקריים מהטקסט הבא. החזר רשימה של 3-7 נושאים בעברית, כל נושא בשורה נפרדת.'
          },
          {
            role: 'user',
            content: summaryText
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const topicsText = response.choices[0].message.content.trim();
      return topicsText.split('\n')
        .map(topic => topic.replace(/^[-•*]\s*/, '').trim())
        .filter(topic => topic.length > 0)
        .slice(0, 7);

    } catch (error) {
      console.error('Error extracting key topics:', error);
      return this.extractTopicsBasic(summaryText);
    }
  }

  /**
   * Extract learning objectives from summary
   * @param {string} summaryText - Summary text
   * @param {string} provider - AI provider
   * @returns {Promise<Array>} Learning objectives
   */
  async extractLearningObjectives(summaryText, provider = AI_PROVIDERS.OPENAI) {
    try {
      if (!openaiClient) {
        return this.extractObjectivesBasic(summaryText);
      }

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'זהה את מטרות הלמידה מהסיכום הבא. החזר רשימה של 2-5 מטרות למידה ברורות בעברית, כל מטרה בשורה נפרדת. התחל כל מטרה עם "התלמיד יוכל..."'
          },
          {
            role: 'user',
            content: summaryText
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const objectivesText = response.choices[0].message.content.trim();
      return objectivesText.split('\n')
        .map(objective => objective.replace(/^[-•*]\s*/, '').trim())
        .filter(objective => objective.length > 0)
        .slice(0, 5);

    } catch (error) {
      console.error('Error extracting learning objectives:', error);
      return this.extractObjectivesBasic(summaryText);
    }
  }

  /**
   * Basic topic extraction (fallback)
   * @param {string} text - Text to analyze
   * @returns {Array} Basic topics
   */
  extractTopicsBasic(text) {
    // Simple keyword extraction for Hebrew text
    const commonWords = ['של', 'את', 'על', 'אל', 'עם', 'בין', 'לפי', 'אחר', 'כל', 'גם', 'או', 'אם', 'כי', 'מה', 'איך', 'למה'];
    const words = text.split(/\s+/)
      .map(word => word.replace(/[^\u0590-\u05FF\u0020-\u007F]/g, ''))
      .filter(word => word.length > 2 && !commonWords.includes(word));
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Basic objectives extraction (fallback)
   * @param {string} text - Text to analyze
   * @returns {Array} Basic objectives
   */
  extractObjectivesBasic(text) {
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(sentence => `התלמיד יוכל ${sentence.trim()}`);
  }

  /**
   * Calculate summary confidence score
   * @param {string} summaryText - Generated summary
   * @param {string} originalText - Original transcription
   * @returns {number} Confidence score (0-1)
   */
  calculateSummaryConfidence(summaryText, originalText) {
    try {
      // Basic confidence calculation based on length ratio and content coverage
      const summaryLength = summaryText.length;
      const originalLength = originalText.length;
      const lengthRatio = summaryLength / originalLength;
      
      // Ideal summary should be 10-30% of original length
      let lengthScore = 1.0;
      if (lengthRatio < 0.05 || lengthRatio > 0.5) {
        lengthScore = 0.6;
      } else if (lengthRatio >= 0.1 && lengthRatio <= 0.3) {
        lengthScore = 1.0;
      } else {
        lengthScore = 0.8;
      }

      // Check for Hebrew content
      const hebrewRegex = /[\u0590-\u05FF]/;
      const hasHebrew = hebrewRegex.test(summaryText);
      const hebrewScore = hasHebrew ? 1.0 : 0.5;

      // Check for structure (paragraphs, lists, etc.)
      const hasStructure = summaryText.includes('\n') || summaryText.includes('•') || summaryText.includes('-');
      const structureScore = hasStructure ? 1.0 : 0.8;

      return Math.min((lengthScore + hebrewScore + structureScore) / 3, 1.0);
    } catch (error) {
      console.error('Error calculating summary confidence:', error);
      return 0.7;
    }
  }

  /**
   * Get transcription by ID
   * @param {number} transcriptionId - Transcription ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Transcription
   */
  async getTranscription(transcriptionId, userId) {
    try {
      const result = await query(`
        SELECT * FROM transcriptions 
        WHERE id = ? AND user_id = ?
      `, [transcriptionId, userId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching transcription:', error);
      throw new Error(`Failed to fetch transcription: ${error.message}`);
    }
  }

  /**
   * Save summary to unified database
   * @param {Object} summaryData - Summary data
   * @returns {Promise<Object>} Saved summary
   */
  async saveSummary(summaryData) {
    const {
      recordingId,
      transcriptionId,
      userId,
      jobId,
      summaryText,
      summaryType,
      keyTopics,
      learningObjectives,
      subjectArea,
      gradeLevel,
      confidenceScore,
      aiProvider,
      modelVersion,
      metadata
    } = summaryData;

    try {
      // Get recording metadata for title generation
      const recordingResult = await query(`
        SELECT metadata, filename FROM recordings WHERE id = ? AND user_id = ?
      `, [recordingId, userId]);

      let title = `סיכום שיעור ${recordingId}`;
      if (recordingResult.rows.length > 0) {
        const recordingMetadata = recordingResult.rows[0].metadata ? 
          JSON.parse(recordingResult.rows[0].metadata) : {};
        title = recordingMetadata.lessonName || 
                recordingResult.rows[0].filename || 
                `סיכום שיעור ${recordingId}`;
      }

      // First, try to create lesson summary via the unified API
      try {
        const response = await fetch('http://localhost:3001/api/summaries/lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.generateInternalToken(userId)}`
          },
          body: JSON.stringify({
            recording_id: recordingId,
            title: title,
            content: summaryText,
            subject_area: subjectArea,
            grade_level: gradeLevel,
            key_topics: keyTopics || [],
            learning_objectives: learningObjectives || [],
            ai_provider: aiProvider,
            model_version: modelVersion,
            confidence_score: confidenceScore,
            processing_metadata: metadata || {}
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('Successfully created lesson summary in unified database');
            return {
              id: data.summary.id,
              recording_id: recordingId,
              transcription_id: transcriptionId,
              user_id: userId,
              job_id: jobId,
              summary_text: summaryText,
              summary_type: summaryType,
              key_topics: keyTopics,
              learning_objectives: learningObjectives,
              subject_area: subjectArea,
              grade_level: gradeLevel,
              confidence_score: confidenceScore,
              ai_provider: aiProvider,
              model_version: modelVersion,
              metadata,
              created_at: data.summary.created_at,
              unified_summary_id: data.summary.id
            };
          }
        }
      } catch (apiError) {
        console.warn('Failed to create unified summary via API, falling back to direct database:', apiError.message);
      }

      // Fallback: Save to old content_summaries table for backward compatibility
      const result = await run(`
        INSERT INTO content_summaries (
          recording_id, transcription_id, user_id, job_id, summary_text,
          summary_type, key_topics, learning_objectives, subject_area,
          grade_level, confidence_score, ai_provider, model_version,
          metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        recordingId,
        transcriptionId,
        userId,
        jobId,
        summaryText,
        summaryType,
        JSON.stringify(keyTopics),
        JSON.stringify(learningObjectives),
        subjectArea,
        gradeLevel,
        confidenceScore,
        aiProvider,
        modelVersion,
        JSON.stringify(metadata)
      ]);

      // Also try to create in unified database directly using SQLite
      try {
        await run(`
          INSERT INTO unified_summaries (
            user_id, title, content, summary_type, source_type, source_id,
            subject_area, grade_level, key_topics, learning_objectives,
            ai_provider, model_version, confidence_score, processing_metadata,
            tags
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          title,
          summaryText,
          'lesson_generated',
          'recording',
          recordingId,
          subjectArea,
          gradeLevel,
          JSON.stringify(keyTopics || []),
          JSON.stringify(learningObjectives || []),
          aiProvider,
          modelVersion,
          confidenceScore,
          JSON.stringify(metadata || {}),
          JSON.stringify(['lesson', subjectArea || 'general'].filter(Boolean))
        ]);

        console.log('Successfully created lesson summary in unified database (SQLite)');
      } catch (dbError) {
        console.warn('Failed to create unified summary directly:', dbError.message);
      }

      return {
        id: result.lastID,
        recording_id: recordingId,
        transcription_id: transcriptionId,
        user_id: userId,
        job_id: jobId,
        summary_text: summaryText,
        summary_type: summaryType,
        key_topics: keyTopics,
        learning_objectives: learningObjectives,
        subject_area: subjectArea,
        grade_level: gradeLevel,
        confidence_score: confidenceScore,
        ai_provider: aiProvider,
        model_version: modelVersion,
        metadata,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving summary:', error);
      throw new Error(`Failed to save summary: ${error.message}`);
    }
  }

  /**
   * Generate internal token for API calls (simplified for internal use)
   * @param {number} userId - User ID
   * @returns {string} Token
   */
  generateInternalToken(userId) {
    // This is a simplified token for internal API calls
    // In production, you'd want proper JWT generation
    return Buffer.from(JSON.stringify({ id: userId, internal: true })).toString('base64');
  }

  /**
   * Get summary by recording ID (checks both unified and legacy tables)
   * @param {number} recordingId - Recording ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Summary or null
   */
  async getSummaryByRecordingId(recordingId, userId) {
    try {
      // First try to get from unified summaries table (SQLite)
      try {
        const result = await query(`
          SELECT * FROM unified_summaries 
          WHERE source_type = 'recording' AND source_id = ? AND user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `, [recordingId, userId]);

        if (result.rows.length > 0) {
          const summary = result.rows[0];
          return {
            id: summary.id,
            recording_id: recordingId,
            transcription_id: null, // Not available in unified table
            user_id: summary.user_id,
            summary_text: summary.content,
            summary_type: summary.summary_type,
            key_topics: Array.isArray(summary.key_topics) ? summary.key_topics : JSON.parse(summary.key_topics || '[]'),
            learning_objectives: Array.isArray(summary.learning_objectives) ? summary.learning_objectives : JSON.parse(summary.learning_objectives || '[]'),
            subject_area: summary.subject_area,
            grade_level: summary.grade_level,
            confidence_score: summary.confidence_score,
            ai_provider: summary.ai_provider,
            model_version: summary.model_version,
            metadata: typeof summary.processing_metadata === 'object' ? summary.processing_metadata : JSON.parse(summary.processing_metadata || '{}'),
            created_at: summary.created_at,
            unified_summary: true
          };
        }
      } catch (unifiedError) {
        console.warn('Failed to fetch from unified summaries, trying legacy table:', unifiedError.message);
      }

      // Fallback to legacy content_summaries table
      const result = await query(`
        SELECT * FROM content_summaries 
        WHERE recording_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [recordingId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const summary = result.rows[0];
      return {
        ...summary,
        key_topics: JSON.parse(summary.key_topics || '[]'),
        learning_objectives: JSON.parse(summary.learning_objectives || '[]'),
        metadata: JSON.parse(summary.metadata || '{}'),
        unified_summary: false
      };
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw new Error(`Failed to fetch summary: ${error.message}`);
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
      const cost = calculateEstimatedCost(provider, MODEL_CONFIGS.summary_generation[provider].model, {
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
   * Get summary statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getSummaryStats(userId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_summaries,
          AVG(confidence_score) as avg_confidence,
          COUNT(DISTINCT summary_type) as summary_types_used,
          COUNT(DISTINCT subject_area) as subjects_covered
        FROM content_summaries 
        WHERE user_id = ?
      `, [userId]);

      return result.rows[0] || {
        total_summaries: 0,
        avg_confidence: 0,
        summary_types_used: 0,
        subjects_covered: 0
      };
    } catch (error) {
      console.error('Error fetching summary stats:', error);
      throw new Error(`Failed to fetch summary stats: ${error.message}`);
    }
  }
}

module.exports = new SummaryService();
